// Runs the built MCP Worker (worker-build) in Miniflare together with the real token service
// from server/ (built with `npm --prefix server run build`). The token service's only outbound
// requests go to a mock of Guesty's token endpoint, and the MCP Worker's go to a mock host for
// client ID metadata documents. Nothing here contacts Guesty or the real token service; any other
// outbound request fails the run.
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";

const crate = dirname(dirname(fileURLToPath(import.meta.url)));
const server = join(crate, "..", "..", "server");
const { Miniflare, Log, LogLevel } = createRequire(join(server, "package.json"))("miniflare");

const PUBLIC = "https://guesty-mcp.test";
const RESOURCE = `${PUBLIC}/mcp`;
const TOKENS_ORIGIN = "https://guesty-tokens.staykit.ai";
const REGISTERED_REDIRECT = "http://127.0.0.1/callback";
const REDIRECT = "http://127.0.0.1:43123/callback";
const SYNTHETIC = "SYNTHETICSECRET7f3a9c51";
const CLAUDE_CODE_ID = "https://claude.ai/oauth/claude-code-client-metadata";
const CHATGPT_ID = "https://chatgpt.com/oauth/client.json";

// Everything secret the run sees; none of it may appear in any log.
const secrets = new Set([SYNTHETIC]);
const remember = (...values) => values.filter(Boolean).forEach((v) => secrets.add(v));
const captured = [];
const unexpected = [];
const cimd = { requests: [], docs: new Map() };
let guestyTokens = 0;
let mf;
let tokenService;
let mcpDb;
let admin;

class CaptureLog extends Log {
  constructor() {
    super(LogLevel.DEBUG);
  }
  log(message) {
    captured.push(String(message));
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function mcpOutbound(request) {
  const url = new URL(request.url);
  const doc = cimd.docs.get(url.href);
  if (!doc) {
    unexpected.push(url.origin);
    return new Response("unexpected", { status: 599 });
  }
  cimd.requests.push({ url: url.href, cookie: request.headers.get("cookie"), authorization: request.headers.get("authorization"), redirect: request.redirect });
  if (doc.delayMs) await sleep(doc.delayMs);
  const body = typeof doc.body === "string" ? doc.body : JSON.stringify(doc.body);
  return new Response(body, { status: doc.status ?? 200, headers: { "content-type": "application/json", ...(doc.headers ?? {}) } });
}

async function guestyOutbound(request) {
  const url = new URL(request.url);
  if (url.pathname !== "/oauth2/token" || !["open-api.guesty.com", "booking.guesty.com"].includes(url.hostname)) {
    unexpected.push(url.origin);
    return new Response("unexpected", { status: 599 });
  }
  guestyTokens += 1;
  remember(`mock-open-token-${guestyTokens}`);
  return Response.json({ token_type: "Bearer", access_token: `mock-open-token-${guestyTokens}`, expires_in: 86400, scope: "open-api" });
}

function serviceKey() {
  return randomBytes(32).toString("base64");
}

async function migrate(database, dir) {
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    const migration = readFileSync(join(dir, file), "utf8").replace(/--.*$/gm, "");
    for (const statement of migration.split(";").map((part) => part.trim()).filter(Boolean)) await database.prepare(statement).run();
  }
}

let ipCounter = 0;
const freshIp = () => {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
};

function call(path, { method = "GET", headers = {}, body, ip = freshIp(), duplex } = {}) {
  return mf.dispatchFetch(`${PUBLIC}${path}`, { method, headers: { "CF-Connecting-IP": ip, ...headers }, body, redirect: "manual", ...(duplex ? { duplex } : {}) });
}

async function service(method, path, { key, body } = {}) {
  const res = await tokenService.fetch(`${TOKENS_ORIGIN}${path}`, {
    method,
    headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

async function invite(label, role = "member") {
  const { status, body } = await service("POST", "/v1/team/invites", { key: admin, body: { label, role } });
  assert.equal(status, 201);
  remember(body.code, body.code.replace(/-/g, ""));
  return body;
}

function pkce() {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

async function register(body = {}, ip) {
  const res = await call("/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_name: "Test App", redirect_uris: [REGISTERED_REDIRECT], token_endpoint_auth_method: "none", ...body }),
    ip,
  });
  return { status: res.status, body: await res.json(), headers: res.headers };
}

function authorizeQuery(params) {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries({ response_type: "code", code_challenge_method: "S256", state: "state-123", resource: RESOURCE, ...params })) {
    if (value !== undefined && value !== null) query.set(name, value);
  }
  return query.toString();
}

async function openSignIn(params, ip) {
  const res = await call(`/authorize?${authorizeQuery(params)}`, { ip });
  const html = await res.text();
  return { status: res.status, html, headers: res.headers, field: /name="request" value="([^"]*)"/.exec(html)?.[1] };
}

function submit(field, { credential = "", readOnly = false, action = "approve", ip } = {}) {
  const body = new URLSearchParams({ request: field, credential, action });
  if (readOnly) body.set("read_only", "1");
  return call("/authorize", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: body.toString(), ip });
}

async function tokenRequest(fields, ip) {
  const body = new URLSearchParams(Object.entries(fields).filter(([, v]) => v !== undefined));
  const res = await call("/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: body.toString(), ip });
  const parsed = await res.json();
  remember(parsed.access_token, parsed.refresh_token);
  return { status: res.status, body: parsed, headers: res.headers };
}

// Opens the sign-in page, approves it and returns the code (not yet exchanged).
async function approveFor(client, credential, { readOnly = false, redirect = REDIRECT } = {}) {
  const { verifier, challenge } = pkce();
  const page = await openSignIn({ client_id: client, redirect_uri: redirect, code_challenge: challenge });
  assert.equal(page.status, 200, page.html);
  const res = await submit(page.field, { credential, readOnly });
  assert.equal(res.status, 303, await res.clone().text());
  const location = new URL(res.headers.get("location"));
  const code = location.searchParams.get("code");
  remember(code);
  return { code, verifier, redirect, location };
}

async function signIn(client, credential, options = {}) {
  const approved = await approveFor(client, credential, options);
  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    code: approved.code,
    redirect_uri: approved.redirect,
    code_verifier: approved.verifier,
    client_id: client,
    resource: RESOURCE,
  });
  assert.equal(tokens.status, 200, JSON.stringify(tokens.body));
  return { ...tokens.body, client };
}

const refresh = (client, refreshToken, ip) => tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: client, resource: RESOURCE }, ip);

async function mcp(token, message, { headers = {}, ip } = {}) {
  const res = await call("/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-11-25",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: typeof message === "string" ? message : JSON.stringify(message),
    ip,
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

const keyCheck = (token, options) => mcp(token, { jsonrpc: "2.0", id: 9, method: "tools/call", params: { name: "key_check", arguments: {} } }, options);

before(async () => {
  mf = new Miniflare({
    log: new CaptureLog(),
    handleRuntimeStdio(stdout, stderr) {
      stdout.on("data", (data) => captured.push(String(data)));
      stderr.on("data", (data) => captured.push(String(data)));
    },
    workers: [
      {
        name: "guesty-mcp",
        modules: true,
        scriptPath: join(crate, "build/index.js"),
        modulesRoot: join(crate, "build"),
        modulesRules: [
          { type: "ESModule", include: ["**/*.js"] },
          { type: "CompiledWasm", include: ["**/*.wasm"] },
        ],
        compatibilityDate: "2026-08-01",
        d1Databases: { DB: "guesty-mcp-test" },
        serviceBindings: { TOKENS: "guesty-token-service" },
        bindings: { PUBLIC_URL: PUBLIC, TOKEN_SERVICE_ORIGINS: TOKENS_ORIGIN, MCP_KEY: serviceKey() },
        // The production limits (wrangler.toml).
        ratelimits: {
          REGISTER_LIMITER: { namespace_id: "1", simple: { limit: 10, period: 60 } },
          AUTHORIZE_LIMITER: { namespace_id: "2", simple: { limit: 30, period: 60 } },
          TOKEN_LIMITER: { namespace_id: "3", simple: { limit: 60, period: 60 } },
          TOOL_LIMITER: { namespace_id: "4", simple: { limit: 100, period: 60 } },
        },
        outboundService: mcpOutbound,
      },
      {
        name: "guesty-token-service",
        modules: true,
        scriptPath: join(server, "dist/index.js"),
        modulesRoot: join(server, "dist"),
        compatibilityDate: "2026-08-01",
        d1Databases: { DB: "guesty-token-service-test" },
        bindings: { CREDENTIALS_KEY: serviceKey(), PUBLIC_URL: TOKENS_ORIGIN },
        outboundService: guestyOutbound,
      },
    ],
  });
  await mf.ready;
  tokenService = await mf.getWorker("guesty-token-service");
  mcpDb = await mf.getD1Database("DB", "guesty-mcp");
  await migrate(mcpDb, join(crate, "migrations"));
  await migrate(await mf.getD1Database("DB", "guesty-token-service"), join(server, "migrations"));
  const team = await service("POST", "/v1/teams", { body: { name: "Acme", admin_label: "Dana", credentials: { openapi: { client_id: "acme-id", client_secret: "acme-secret" } } } });
  assert.equal(team.status, 201);
  admin = team.body.admin_key;
  remember(admin, "acme-secret");
});

after(() => mf?.dispose());

let client;

test("metadata documents describe the resource and the authorization server", async () => {
  for (const path of ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"]) {
    const res = await call(path);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("access-control-allow-origin"), "*");
    const body = await res.json();
    assert.equal(body.resource, RESOURCE);
    assert.deepEqual(body.authorization_servers, [PUBLIC]);
  }
  const as = await (await call("/.well-known/oauth-authorization-server")).json();
  assert.equal(as.issuer, PUBLIC);
  assert.equal(as.authorization_response_iss_parameter_supported, true);
  assert.equal(as.client_id_metadata_document_supported, true);
  assert.deepEqual(as.code_challenge_methods_supported, ["S256"]);
  assert.deepEqual(as.token_endpoint_auth_methods_supported, ["none"]);
  assert.equal(as.registration_endpoint, `${PUBLIC}/register`);
  assert.equal((await call("/nope")).status, 404);
});

test("the landing page shows the URL, how sign-in works and the privacy note, with a strict CSP", async () => {
  const res = await call("/");
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, new RegExp(RESOURCE.replace(/[.]/g, "\\.")));
  assert.match(html, /How sign-in works/);
  assert.match(html, /isn't stored or logged/);
  assert.doesNotMatch(html, /<script/);
  const csp = res.headers.get("content-security-policy");
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.equal(res.headers.get("set-cookie"), null);
});

test("/mcp asks for sign-in with the resource metadata URL", async () => {
  const res = await mcp(null, { jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("www-authenticate"), `Bearer resource_metadata="${PUBLIC}/.well-known/oauth-protected-resource/mcp"`);
  const bad = await mcp("gma_not-a-token", { jsonrpc: "2.0", id: 1, method: "ping" });
  assert.equal(bad.status, 401);
  assert.match(bad.headers.get("www-authenticate"), /error="invalid_token"/);
  assert.match(bad.headers.get("www-authenticate"), /resource_metadata=/);
});

test("registration accepts public clients only", async () => {
  const ok = await register();
  assert.equal(ok.status, 201);
  assert.match(ok.body.client_id, /^mcpc_/);
  assert.equal(ok.body.token_endpoint_auth_method, "none");
  assert.deepEqual(ok.body.redirect_uris, [REGISTERED_REDIRECT]);
  client = ok.body.client_id;
  assert.equal((await register({ token_endpoint_auth_method: "client_secret_basic" })).body.error, "invalid_client_metadata");
  assert.equal((await register({ redirect_uris: ["http://evil.example/cb"] })).body.error, "invalid_redirect_uri");
  assert.equal((await register({ redirect_uris: ["https://ok.example/cb#frag"] })).body.error, "invalid_redirect_uri");
  assert.equal((await register({ redirect_uris: [] })).body.error, "invalid_redirect_uri");
});

let sam;

test("sign-in with an invite: consent page, code, token, MCP, every authorization response has iss", async () => {
  const samInvite = await invite("Sam");
  const { verifier, challenge } = pkce();
  const page = await openSignIn({ client_id: client, redirect_uri: REDIRECT, code_challenge: challenge });
  assert.equal(page.status, 200);
  assert.match(page.html, /Test App/);
  assert.match(page.html, /name reported by the app, not verified/);
  assert.match(page.html, /127\.0\.0\.1:43123/);
  assert.match(page.html, /read everything in your team/);
  assert.match(page.headers.get("content-security-policy"), /form-action 'self' http:\/\/127\.0\.0\.1:43123/);
  assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(page.headers.get("set-cookie"), null);

  // A wrong code shows the token service's message on the page again.
  const wrong = await submit(page.field, { credential: "ZZZZ-ZZZZ-ZZZZ" });
  assert.equal(wrong.status, 400);
  assert.match(await wrong.text(), /That invite code isn(&#39;|')t valid/);

  const res = await submit(page.field, { credential: samInvite.link });
  assert.equal(res.status, 303);
  const location = new URL(res.headers.get("location"));
  assert.equal(`${location.origin}${location.pathname}`, REDIRECT);
  assert.equal(location.searchParams.get("state"), "state-123");
  assert.equal(location.searchParams.get("iss"), PUBLIC);
  const code = location.searchParams.get("code");
  remember(code);

  const tokens = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, code_verifier: verifier, client_id: client, resource: RESOURCE });
  assert.equal(tokens.status, 200);
  assert.equal(tokens.body.token_type, "Bearer");
  assert.equal(tokens.body.expires_in, 3600);
  assert.equal(tokens.headers.get("cache-control"), "no-store");
  sam = { ...tokens.body, client };

  const init = await mcp(sam.access_token, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } }, { headers: { "mcp-protocol-version": "" } });
  assert.equal(init.status, 200);
  assert.equal(init.body.result.protocolVersion, "2025-06-18");
  assert.equal((await mcp(sam.access_token, { jsonrpc: "2.0", method: "notifications/initialized" })).status, 202);
  const list = await mcp(sam.access_token, { jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.equal(list.body.result.tools[0].name, "key_check");
  const check = await keyCheck(sam.access_token);
  assert.equal(check.status, 200);
  assert.deepEqual(check.body.result.structuredContent, { ok: true, read_only: false, role: "member", team: "Acme" });
  assert.equal((await mcp(sam.access_token, { jsonrpc: "2.0", id: 3, method: "ping" }, { headers: { "mcp-protocol-version": "2024-01-01" } })).status, 400);

  // Deny and error redirects carry iss and state too.
  const denied = await submit(page.field, { action: "deny" });
  assert.equal(denied.status, 303);
  const deniedAt = new URL(denied.headers.get("location"));
  assert.equal(deniedAt.searchParams.get("error"), "access_denied");
  assert.equal(deniedAt.searchParams.get("iss"), PUBLIC);
  assert.equal(deniedAt.searchParams.get("state"), "state-123");

  // Nothing secret is stored in the clear.
  const rows = JSON.stringify([
    (await mcpDb.prepare("SELECT * FROM grants").all()).results,
    (await mcpDb.prepare("SELECT * FROM codes").all()).results,
    (await mcpDb.prepare("SELECT * FROM access_tokens").all()).results,
    (await mcpDb.prepare("SELECT * FROM refresh_tokens").all()).results,
  ]);
  for (const secret of [code, sam.access_token, sam.refresh_token]) assert.ok(!rows.includes(secret));
  assert.doesNotMatch(rows, /gts_/);
});

test("/mcp: GET and DELETE are 405, notifications 202, batches and bad JSON 400", async () => {
  for (const method of ["GET", "DELETE"]) {
    const res = await call("/mcp", { method, headers: { authorization: `Bearer ${sam.access_token}` } });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get("allow"), "POST");
  }
  assert.equal((await mcp(sam.access_token, [{ jsonrpc: "2.0", id: 1, method: "ping" }])).status, 400);
  assert.equal((await mcp(sam.access_token, "{not json")).status, 400);
  assert.equal((await mcp(sam.access_token, "[".repeat(200) + "]".repeat(200))).status, 400);
  assert.equal((await mcp(sam.access_token, { jsonrpc: "2.0", id: 1, result: {} })).status, 202);
  assert.equal((await mcp(sam.access_token, { jsonrpc: "2.0", id: 1, method: "ping" }, { headers: { "content-type": "text/plain" } })).status, 415);
});

test("refresh tokens rotate; a reused one revokes the grant", async () => {
  const first = await signIn(client, (await invite("Rotator")).code);
  const second = await refresh(client, first.refresh_token);
  assert.equal(second.status, 200);
  assert.notEqual(second.body.refresh_token, first.refresh_token);
  assert.equal((await keyCheck(second.body.access_token)).status, 200);
  const reuse = await refresh(client, first.refresh_token);
  assert.equal(reuse.status, 400);
  assert.equal(reuse.body.error, "invalid_grant");
  const after = await keyCheck(second.body.access_token);
  assert.equal(after.status, 401);
  assert.match(after.headers.get("www-authenticate"), /invalid_token/);
  assert.equal((await refresh(client, second.body.refresh_token)).status, 400);
});

test("concurrent refreshes with one token: at most one wins and the grant ends revoked", async () => {
  const first = await signIn(client, (await invite("Racer")).code);
  const results = await Promise.all([refresh(client, first.refresh_token), refresh(client, first.refresh_token), refresh(client, first.refresh_token)]);
  const winners = results.filter((r) => r.status === 200);
  assert.ok(winners.length <= 1, JSON.stringify(results.map((r) => r.status)));
  for (const winner of winners) assert.equal((await keyCheck(winner.body.access_token)).status, 401);
  assert.equal((await keyCheck(first.access_token)).status, 401);
});

test("read-only is stored on the grant and survives refresh", async () => {
  const signedIn = await signIn(client, (await invite("Reader")).code, { readOnly: true });
  assert.equal((await keyCheck(signedIn.access_token)).body.result.structuredContent.read_only, true);
  const refreshed = await refresh(client, signedIn.refresh_token);
  assert.equal(refreshed.status, 200);
  assert.equal((await keyCheck(refreshed.body.access_token)).body.result.structuredContent.read_only, true);
  const again = await refresh(client, refreshed.body.refresh_token);
  assert.equal((await keyCheck(again.body.access_token)).body.result.structuredContent.read_only, true);
});

test("a revoked member key answers 401 invalid_token on the next call; another member keeps working", async () => {
  const lee = await signIn(client, (await invite("Lee")).code);
  const kim = await signIn(client, (await invite("Kim")).code);
  assert.equal((await keyCheck(lee.access_token)).status, 200);
  assert.equal((await keyCheck(kim.access_token)).status, 200);
  assert.equal((await service("DELETE", "/v1/team/keys/Lee", { key: admin })).status, 200);
  const revoked = await keyCheck(lee.access_token);
  assert.equal(revoked.status, 401);
  assert.match(revoked.headers.get("www-authenticate"), /error="invalid_token"/);
  assert.equal((await refresh(client, lee.refresh_token)).status, 400, "the grant is revoked too");
  assert.equal((await keyCheck(kim.access_token)).status, 200);
  const row = await mcpDb.prepare("SELECT revoke_reason, sealed_key FROM grants WHERE revoke_reason = 'member_key_revoked'").first();
  assert.equal(row.sealed_key, "");
});

test("an existing access key signs in: admin keys as admin, member keys as member", async () => {
  const signedIn = await signIn(client, admin);
  const check = await keyCheck(signedIn.access_token);
  assert.deepEqual(check.body.result.structuredContent, { ok: true, read_only: false, role: "admin", team: "Acme" });
  const memberKey = (await service("POST", "/v1/team/keys", { key: admin, body: { label: "Cli user" } })).body.key;
  remember(memberKey);
  const member = await signIn(client, memberKey);
  assert.equal((await keyCheck(member.access_token)).body.result.structuredContent.role, "member");
  const { challenge } = pkce();
  const page = await openSignIn({ client_id: client, redirect_uri: REDIRECT, code_challenge: challenge });
  const bad = await submit(page.field, { credential: `gts_${"A".repeat(43)}` });
  assert.equal(bad.status, 400);
  assert.match(await bad.text(), /wrong or has been revoked/);
});

test("Claude Code and ChatGPT sign in with their published metadata documents", async () => {
  cimd.docs.set(CLAUDE_CODE_ID, { body: JSON.parse(readFileSync(join(crate, "test/fixtures/claude-code-client-metadata.json"), "utf8")) });
  cimd.docs.set(CHATGPT_ID, { body: JSON.parse(readFileSync(join(crate, "test/fixtures/chatgpt-client.json"), "utf8")) });
  const claude = await signIn(CLAUDE_CODE_ID, (await invite("Claude user")).code, { redirect: "http://localhost:51515/callback" });
  assert.equal((await keyCheck(claude.access_token)).status, 200);
  const { challenge } = pkce();
  const page = await openSignIn({ client_id: CLAUDE_CODE_ID, redirect_uri: "http://localhost:6000/callback", code_challenge: challenge });
  assert.match(page.html, /Claude Code/);
  assert.match(page.html, /published by <strong>https:\/\/claude\.ai<\/strong>/);
  const chatgpt = await signIn(CHATGPT_ID, (await invite("ChatGPT user")).code, { redirect: "https://chatgpt.com/connector_platform_oauth_redirect" });
  assert.equal((await keyCheck(chatgpt.access_token)).status, 200);
  for (const request of cimd.requests) {
    assert.equal(request.cookie, null);
    assert.equal(request.authorization, null);
  }
  // A Claude Code refresh token can't be used by ChatGPT.
  const crossed = await refresh(CHATGPT_ID, claude.refresh_token);
  assert.equal(crossed.body.error, "invalid_grant");
});

test("metadata documents: unknown origins aren't fetched; redirects, timeouts, size and bad documents fail", async () => {
  const before = cimd.requests.length;
  const { challenge } = pkce();
  const unknown = await openSignIn({ client_id: "https://evil.example/client.json", redirect_uri: "https://evil.example/cb", code_challenge: challenge });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.headers.get("location"), null);
  assert.equal(cimd.requests.length, before, "nothing was fetched");
  assert.deepEqual(unexpected, []);

  const cases = [
    ["https://claude.ai/redirecting", { status: 302, headers: { location: "https://evil.example/doc" }, body: "" }],
    ["https://claude.ai/slow", { delayMs: 2600, body: { client_id: "https://claude.ai/slow", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none" } }],
    ["https://claude.ai/huge", { body: { client_id: "https://claude.ai/huge", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none", pad: "x".repeat(70 * 1024) } }],
    ["https://claude.ai/other-id", { body: { client_id: "https://claude.ai/someone-else", redirect_uris: [REDIRECT], token_endpoint_auth_method: "none" } }],
    ["https://claude.ai/secret-client", { body: { client_id: "https://claude.ai/secret-client", redirect_uris: [REDIRECT], token_endpoint_auth_method: "client_secret_basic" } }],
  ];
  const expected = ["cimd_redirect", "cimd_timeout", "cimd_too_large", null, null];
  for (const [index, [id, doc]] of cases.entries()) {
    cimd.docs.set(id, doc);
    const logged = captured.length;
    const page = await openSignIn({ client_id: id, redirect_uri: REDIRECT, code_challenge: challenge });
    assert.equal(page.status, 400, id);
    assert.equal(page.headers.get("location"), null, id);
    assert.equal(page.field, undefined, id);
    await sleep(50);
    const lines = captured.slice(logged).join("");
    if (expected[index]) assert.match(lines, new RegExp(`guesty-mcp error: ${expected[index]}`), id);
  }
  // The documents that parse but don't validate say why.
  assert.match((await openSignIn({ client_id: "https://claude.ai/other-id", redirect_uri: REDIRECT, code_challenge: challenge })).html, /names a different client ID/);
  assert.match((await openSignIn({ client_id: "https://claude.ai/secret-client", redirect_uri: REDIRECT, code_challenge: challenge })).html, /none token endpoint auth method/);
});

test("authorize rejects bad redirects on the page and other errors by redirect", async () => {
  const { challenge } = pkce();
  const base = { client_id: client, redirect_uri: REDIRECT, code_challenge: challenge };
  for (const params of [
    { ...base, redirect_uri: "https://evil.example/callback" },
    { ...base, redirect_uri: "http://127.0.0.1:43123/other" },
    { ...base, redirect_uri: "http://localhost:43123/callback" },
    { ...base, redirect_uri: undefined },
    { ...base, client_id: "mcpc_unknown" },
    { ...base, client_id: undefined },
  ]) {
    const page = await openSignIn(params);
    assert.equal(page.status, 400, JSON.stringify(params));
    assert.equal(page.headers.get("location"), null);
  }
  const duplicate = await call(`/authorize?${authorizeQuery(base)}&client_id=${client}`);
  assert.equal(duplicate.status, 400);
  for (const [params, error] of [
    [{ ...base, code_challenge: undefined }, "invalid_request"],
    [{ ...base, code_challenge_method: "plain" }, "invalid_request"],
    [{ ...base, code_challenge_method: undefined }, "invalid_request"],
    [{ ...base, response_type: "token" }, "unsupported_response_type"],
    [{ ...base, resource: "https://evil.example/mcp" }, "invalid_target"],
  ]) {
    const res = await call(`/authorize?${authorizeQuery(params)}`);
    assert.equal(res.status, 302, JSON.stringify(params));
    const location = new URL(res.headers.get("location"));
    assert.equal(`${location.origin}${location.pathname}`, REDIRECT);
    assert.equal(location.searchParams.get("error"), error);
    assert.equal(location.searchParams.get("iss"), PUBLIC);
    assert.equal(location.searchParams.get("state"), "state-123");
  }
});

test("the signed sign-in form can't be changed", async () => {
  const { challenge } = pkce();
  const page = await openSignIn({ client_id: client, redirect_uri: REDIRECT, code_challenge: challenge });
  const [payload, tag] = page.field.split(".");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
  decoded.r = "https://evil.example/cb";
  const forged = `${Buffer.from(JSON.stringify(decoded)).toString("base64url")}.${tag}`;
  const res = await submit(forged, { credential: (await invite("Forger")).code });
  assert.equal(res.status, 400);
  assert.equal(res.headers.get("location"), null);
  assert.match(await res.text(), /was changed/);
});

test("token endpoint: wrong verifier, wrong redirect, resource, other client, secrets and reuse", async () => {
  const approved = await approveFor(client, (await invite("Verifier")).code);
  const exchange = (over = {}) =>
    tokenRequest({ grant_type: "authorization_code", code: approved.code, redirect_uri: approved.redirect, code_verifier: approved.verifier, client_id: client, resource: RESOURCE, ...over });
  assert.equal((await exchange({ resource: "https://evil.example/mcp" })).body.error, "invalid_target", "checked before the code is spent");
  assert.equal((await exchange({ client_secret: "x" })).body.error, "invalid_client");
  assert.equal((await exchange({ code_verifier: pkce().verifier })).body.error, "invalid_grant");
  assert.equal((await exchange()).body.error, "invalid_grant", "a failed attempt spends the code");

  for (const over of [{ redirect_uri: "http://127.0.0.1:9999/callback" }, { client_id: (await register()).body.client_id }]) {
    const fresh = await approveFor(client, (await invite(`Bound ${Object.keys(over)[0]}`)).code);
    const res = await tokenRequest({ grant_type: "authorization_code", code: fresh.code, redirect_uri: fresh.redirect, code_verifier: fresh.verifier, client_id: client, resource: RESOURCE, ...over });
    assert.equal(res.body.error, "invalid_grant", JSON.stringify(over));
  }
  assert.equal((await tokenRequest({ grant_type: "client_credentials", client_id: client })).body.error, "unsupported_grant_type");
  assert.equal((await tokenRequest({ grant_type: "authorization_code", client_id: client })).body.error, "invalid_request");
});

test("a code works once, also when presented concurrently, and reuse revokes its tokens", async () => {
  const approved = await approveFor(client, (await invite("Twice")).code);
  const fields = { grant_type: "authorization_code", code: approved.code, redirect_uri: approved.redirect, code_verifier: approved.verifier, client_id: client, resource: RESOURCE };
  const results = await Promise.all(Array.from({ length: 5 }, () => tokenRequest(fields)));
  const winners = results.filter((r) => r.status === 200);
  assert.equal(results.filter((r) => r.body.error === "invalid_grant").length, 5 - winners.length);
  assert.ok(winners.length <= 1, JSON.stringify(results.map((r) => r.status)));
  for (const winner of winners) assert.equal((await keyCheck(winner.body.access_token)).status, 401, "reuse revoked it");

  const sequential = await approveFor(client, (await invite("Again")).code);
  const once = { ...fields, code: sequential.code, code_verifier: sequential.verifier };
  const first = await tokenRequest(once);
  assert.equal(first.status, 200);
  assert.equal((await keyCheck(first.body.access_token)).status, 200);
  assert.equal((await tokenRequest(once)).body.error, "invalid_grant");
  assert.equal((await keyCheck(first.body.access_token)).status, 401);
});

test("an expired code is refused", async () => {
  const approved = await approveFor(client, (await invite("Late")).code);
  await mcpDb.prepare("UPDATE codes SET expires_at = ? WHERE used_at IS NULL").bind(Date.now() - 1).run();
  const res = await tokenRequest({ grant_type: "authorization_code", code: approved.code, redirect_uri: approved.redirect, code_verifier: approved.verifier, client_id: client, resource: RESOURCE });
  assert.equal(res.body.error, "invalid_grant");
  assert.match(res.body.error_description, /expired/);
});

test("revocation (RFC 7009) ends the grant", async () => {
  const signedIn = await signIn(client, (await invite("Leaver")).code);
  const body = new URLSearchParams({ token: signedIn.refresh_token, client_id: client }).toString();
  const res = await call("/revoke", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  assert.equal(res.status, 200);
  assert.equal((await keyCheck(signedIn.access_token)).status, 401);
  const unknown = await call("/revoke", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "token=gmr_unknown" });
  assert.equal(unknown.status, 200);
});

test("Origin: unknown origins get 403; known and loopback origins get CORS", async () => {
  const bad = await keyCheck(sam.access_token, { headers: { origin: "https://evil.example" } });
  assert.equal(bad.status, 403);
  for (const origin of ["https://claude.ai", "https://chatgpt.com", "http://localhost:6274"]) {
    const ok = await mcp(sam.access_token, { jsonrpc: "2.0", id: 1, method: "ping" }, { headers: { origin } });
    assert.equal(ok.status, 200, origin);
    assert.equal(ok.headers.get("access-control-allow-origin"), origin);
  }
  const preflight = await call("/mcp", { method: "OPTIONS", headers: { origin: "https://claude.ai", "access-control-request-method": "POST" } });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get("access-control-allow-headers"), /MCP-Protocol-Version/);
  assert.equal((await call("/mcp", { method: "OPTIONS", headers: { origin: "https://evil.example" } })).status, 403);
});

test("request bodies over 1 MB are refused, declared or streamed", async () => {
  const big = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping", params: { pad: "x".repeat(1024 * 1024) } });
  assert.equal((await mcp(sam.access_token, big)).status, 413);
  const chunk = new TextEncoder().encode("x".repeat(64 * 1024));
  let sent = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (sent >= 20) return controller.close();
      sent += 1;
      controller.enqueue(chunk);
    },
  });
  const res = await call("/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${sam.access_token}` },
    body: stream,
    duplex: "half",
  });
  assert.equal(res.status, 413);
});

test("the token service's wrong-code limit counts the person's address, not the Worker's", async () => {
  const { challenge } = pkce();
  const page = await openSignIn({ client_id: client, redirect_uri: REDIRECT, code_challenge: challenge });
  const guesser = "192.0.2.77";
  let last;
  for (let i = 0; i < 11; i += 1) last = await submit(page.field, { credential: `WRNG-CODE-${String(i).padStart(4, "0")}`, ip: guesser });
  assert.equal(last.status, 429);
  assert.match(await last.text(), /Too many wrong invite codes/);
  const other = await submit(page.field, { credential: "WRNG-CODE-AAAA", ip: "192.0.2.78" });
  assert.equal(other.status, 400);
  assert.match(await other.text(), /isn(&#39;|')t valid/);
});

test("rate limits: registration, authorization, token and tool calls", async () => {
  const ip = "198.18.0.1";
  for (let i = 0; i < 10; i += 1) assert.equal((await register({}, ip)).status, 201);
  const limitedRegister = await register({}, ip);
  assert.equal(limitedRegister.status, 429);
  assert.equal(limitedRegister.headers.get("retry-after"), "60");

  const authorizeIp = "198.18.0.2";
  for (let i = 0; i < 30; i += 1) assert.notEqual((await call("/authorize?client_id=x", { ip: authorizeIp })).status, 429);
  assert.equal((await call("/authorize?client_id=x", { ip: authorizeIp })).status, 429);

  const tokenIp = "198.18.0.3";
  for (let i = 0; i < 60; i += 1) assert.notEqual((await tokenRequest({ grant_type: "refresh_token", client_id: client, refresh_token: "gmr_x" }, tokenIp)).status, 429);
  assert.equal((await tokenRequest({ grant_type: "refresh_token", client_id: client, refresh_token: "gmr_x" }, tokenIp)).status, 429);

  const caller = await signIn(client, (await invite("Busy")).code);
  for (let i = 0; i < 100; i += 1) assert.equal((await keyCheck(caller.access_token)).status, 200);
  const limited = await keyCheck(caller.access_token);
  assert.equal(limited.status, 429);
  assert.equal(limited.body.error.code, -32000);
  assert.equal((await keyCheck(sam.access_token)).status, 200, "another sign-in has its own limit");
});

test("logs never contain query strings, tokens, keys or codes", async () => {
  const before = captured.length;
  await call(`/mcp?token=${SYNTHETIC}`, { method: "POST", headers: { authorization: `Bearer ${SYNTHETIC}`, "content-type": "application/json" }, body: JSON.stringify({ secret: SYNTHETIC }) });
  await call(`/authorize?client_id=${SYNTHETIC}&state=${SYNTHETIC}`);
  await call(`/token?x=${SYNTHETIC}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `client_secret=${SYNTHETIC}` });
  await call(`/.well-known/oauth-authorization-server?x=${SYNTHETIC}`);
  await call(`/?x=${SYNTHETIC}`);
  await call(`/missing?x=${SYNTHETIC}`);
  // An error path that logs: a metadata document that answers 500.
  cimd.docs.set(`https://claude.ai/broken`, { status: 500, body: SYNTHETIC });
  await openSignIn({ client_id: "https://claude.ai/broken", redirect_uri: REDIRECT, code_challenge: pkce().challenge, state: SYNTHETIC });
  await sleep(300);
  const output = captured.join("\n");
  assert.match(output.slice(captured.slice(0, before).join("\n").length), /guesty-mcp error: cimd_status/, "the Worker's own error lines are captured");
  for (const secret of secrets) assert.ok(!output.includes(secret), `a secret reached the logs (${secret.slice(0, 4)}…)`);
  assert.doesNotMatch(output, /gts_[A-Za-z0-9_-]{43}/);
  assert.doesNotMatch(output, /gm[acr]_[A-Za-z0-9_-]{43}/);
  for (const line of output.split("\n").filter((l) => l.includes("guesty-mcp error"))) assert.match(line, /guesty-mcp error: [a-z0-9_]+\s*$/);
  assert.deepEqual(unexpected, [], "no outbound request left the mocks");
});

test("wrangler config: invocation logs and traces off, hosted bindings present", () => {
  const config = readFileSync(join(crate, "wrangler.toml"), "utf8");
  const hosted = config.slice(config.indexOf("[env.hosted]"));
  assert.match(hosted, /\[env\.hosted\.observability\.logs\][^[]*invocation_logs = false/);
  assert.match(hosted, /\[env\.hosted\.observability\.traces\][^[]*enabled = false/);
  assert.match(hosted, /pattern = "guesty-mcp\.staykit\.ai", custom_domain = true/);
  assert.match(hosted, /binding = "TOKENS"\nservice = "guesty-token-service"/);
  assert.match(hosted, /account_id = "52211577e087a1619838cda534d59d7b"/);
  for (const name of ["REGISTER_LIMITER", "AUTHORIZE_LIMITER", "TOKEN_LIMITER", "TOOL_LIMITER"]) assert.match(hosted, new RegExp(`name = "${name}"`));
});
