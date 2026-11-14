// Runs the built MCP Worker (worker-build) in Miniflare together with the real token service
// from server/ (built with `npm --prefix server run build`). The token service's only outbound
// requests go to a mock of Guesty's token endpoint; the MCP Worker's go to a mock of Guesty's APIs
// (open-api.guesty.com, booking.guesty.com) and a mock host for client ID metadata documents.
// Nothing here contacts Guesty or the real token service; any other outbound request fails the
// run. A second copy of the Worker ("short") shares the same database with an 8 s call budget and
// a 1 s Guesty timeout, so timeouts and deadlines take seconds. The local `guesty mcp`
// (target/debug/guesty) is run to check the hosted tools answer byte for byte as it does.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
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
const SHORT_BUDGET_MS = 8000;
const GUESTY_HOSTS = ["open-api.guesty.com", "booking.guesty.com"];
const CLI = process.env.GUESTY_BIN ?? join(crate, "..", "..", "target", "debug", process.platform === "win32" ? "guesty.exe" : "guesty");

// Everything secret the run sees; none of it may appear in any log.
const secrets = new Set([SYNTHETIC]);
const remember = (...values) => values.filter(Boolean).forEach((v) => secrets.add(v));
const captured = [];
const unexpected = [];
const cimd = { requests: [], docs: new Map() };
let guestyTokens = 0;
// The Guesty API mock: every request it saw, and an optional per-test answer.
const api = { requests: [], handler: null, total: 250 };
let mf;
let shortWorker;
let memoryWorker;
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
  // The MCP Worker never asks Guesty for a token; the core refuses OAuth paths.
  if (GUESTY_HOSTS.includes(url.hostname) && !/oauth/i.test(url.pathname)) return guestyApi(request, url);
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
  if (url.pathname !== "/oauth2/token" || !GUESTY_HOSTS.includes(url.hostname)) {
    unexpected.push(url.origin);
    return new Response("unexpected", { status: 599 });
  }
  guestyTokens += 1;
  const kind = url.hostname === "booking.guesty.com" ? "be" : "open";
  const token = `mock-${kind}-token-${guestyTokens}`;
  remember(token);
  return Response.json({ token_type: "Bearer", access_token: token, expires_in: 86400, scope: kind === "be" ? "booking_engine:api" : "open-api" });
}

function defaultGuesty(entry, url) {
  if (entry.host === "booking.guesty.com") return Response.json({ results: [{ _id: "be-1", title: "Booking engine listing" }] });
  if (entry.method === "GET" && entry.path === "/v1/listings") {
    if (!url.searchParams.has("skip")) return Response.json({ results: [{ _id: "l1", title: "Beach house" }], count: 1 });
    const skip = Number(url.searchParams.get("skip"));
    const limit = Number(url.searchParams.get("limit"));
    const results = Array.from({ length: Math.max(0, Math.min(limit, api.total - skip)) }, (_, i) => ({ _id: `l${skip + i}` }));
    return Response.json({ results, count: api.total, skip, limit });
  }
  return Response.json({ ok: true, method: entry.method, path: entry.path }, { status: entry.method === "POST" ? 201 : 200 });
}

async function guestyApi(request, url) {
  const body = ["GET", "HEAD"].includes(request.method) ? null : await request.text();
  const entry = { method: request.method, host: url.hostname, path: url.pathname, search: url.search, authorization: request.headers.get("authorization"), body, redirect: request.redirect };
  api.requests.push(entry);
  const answer = api.handler ? await api.handler(entry, url) : undefined;
  return answer ?? defaultGuesty(entry, url);
}

// Runs `fn` with a per-test Guesty answer and returns the requests Guesty saw.
async function withGuesty(handler, fn) {
  const start = api.requests.length;
  api.handler = handler;
  try {
    const result = await fn();
    return { result, requests: api.requests.slice(start) };
  } finally {
    api.handler = null;
  }
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

async function mcp(token, message, { headers = {}, ip, worker } = {}) {
  const init = {
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
  };
  const res = worker
    ? await worker.fetch(`${PUBLIC}/mcp`, { method: init.method, headers: { "CF-Connecting-IP": ip ?? freshIp(), ...init.headers }, body: init.body, redirect: "manual" })
    : await call("/mcp", init);
  const text = await res.text();
  return { status: res.status, headers: res.headers, text, body: text ? JSON.parse(text) : null };
}

let nextId = 100;
const tool = (token, name, args = {}, options) => mcp(token, { jsonrpc: "2.0", id: nextId++, method: "tools/call", params: { name, arguments: args } }, options);
const textOf = (res) => {
  assert.ok(res.body?.result, JSON.stringify(res.body));
  return res.body.result.content.map((part) => part.text).join("\n");
};
const failed = (res) => res.body?.result?.isError === true;

// A tool call that reaches the token service and Guesty: 200 while the sign-in works, 401 once
// it's revoked.
const keyCheck = (token, options) => tool(token, "call_operation", { operation: "propertieslistinglist" }, options);
const instructionsOf = async (token) => (await mcp(token, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25" } })).body.result.instructions;
const isReadOnly = async (token) => (await instructionsOf(token)).includes("This server is read-only");

before(async () => {
  const mcpKey = serviceKey();
  const mcpWorker = (name, bindings, ns) => ({
    name,
    modules: true,
    scriptPath: join(crate, "build/index.js"),
    modulesRoot: join(crate, "build"),
    modulesRules: [
      { type: "ESModule", include: ["**/*.js"] },
      { type: "CompiledWasm", include: ["**/*.wasm"] },
    ],
    compatibilityDate: "2026-08-01",
    // Both copies share one database, so a sign-in on one works on the other.
    d1Databases: { DB: "guesty-mcp-test" },
    serviceBindings: { TOKENS: "guesty-token-service" },
    bindings: { PUBLIC_URL: PUBLIC, TOKEN_SERVICE_ORIGINS: TOKENS_ORIGIN, MCP_KEY: mcpKey, ...bindings },
    // The production limits (wrangler.toml).
    ratelimits: {
      REGISTER_LIMITER: { namespace_id: `${ns}1`, simple: { limit: 10, period: 60 } },
      AUTHORIZE_LIMITER: { namespace_id: `${ns}2`, simple: { limit: 30, period: 60 } },
      TOKEN_LIMITER: { namespace_id: `${ns}3`, simple: { limit: 60, period: 60 } },
      TOOL_LIMITER: { namespace_id: `${ns}4`, simple: { limit: 100, period: 60 } },
    },
    outboundService: mcpOutbound,
  });
  mf = new Miniflare({
    log: new CaptureLog(),
    handleRuntimeStdio(stdout, stderr) {
      stdout.on("data", (data) => captured.push(String(data)));
      stderr.on("data", (data) => captured.push(String(data)));
    },
    workers: [
      mcpWorker("guesty-mcp", {}, "1"),
      // The token service's first origin is somewhere else here, so its invite links don't match.
      mcpWorker("guesty-mcp-short", { CALL_BUDGET_MS: String(SHORT_BUDGET_MS), GUESTY_TIMEOUT_MS: "1000", TOKEN_SERVICE_ORIGINS: "https://other-tokens.example" }, "2"),
      // A fresh copy that reports its wasm memory, for the near-limit memory test.
      mcpWorker("guesty-mcp-memory", { REPORT_WASM_MEMORY: "1" }, "3"),
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
  shortWorker = await mf.getWorker("guesty-mcp-short");
  memoryWorker = await mf.getWorker("guesty-mcp-memory");
  mcpDb = await mf.getD1Database("DB", "guesty-mcp");
  await migrate(mcpDb, join(crate, "migrations"));
  await migrate(await mf.getD1Database("DB", "guesty-token-service"), join(server, "migrations"));
  const credentials = { openapi: { client_id: "acme-id", client_secret: "acme-secret" }, beapi: { client_id: "acme-be-id", client_secret: "acme-be-secret" } };
  const team = await service("POST", "/v1/teams", { body: { name: "Acme", admin_label: "Dana", credentials } });
  assert.equal(team.status, 201, JSON.stringify(team.body));
  admin = team.body.admin_key;
  remember(admin, "acme-secret", "acme-be-secret");
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
  assert.deepEqual(init.body.result.serverInfo, { name: "guesty-cli", title: "Guesty", version: "2.0.0" });
  assert.match(init.body.result.instructions, /If a call says the sign-in ended, ask the user to reconnect this server in their app\./);
  assert.doesNotMatch(init.body.result.instructions, /guesty setup|read-only/);
  const list = await mcp(sam.access_token, { jsonrpc: "2.0", id: 2, method: "tools/list" });
  assert.deepEqual(list.body.result.tools.map((t) => t.name), ["search_operations", "describe_operation", "call_operation", "team_status", "invite_teammate"]);
  const check = await keyCheck(sam.access_token);
  assert.equal(check.status, 200);
  assert.equal(failed(check), false, textOf(check));
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
  assert.equal(await isReadOnly(signedIn.access_token), true);
  const refreshed = await refresh(client, signedIn.refresh_token);
  assert.equal(refreshed.status, 200);
  assert.equal(await isReadOnly(refreshed.body.access_token), true);
  const again = await refresh(client, refreshed.body.refresh_token);
  assert.equal(await isReadOnly(again.body.access_token), true);
  assert.equal(await isReadOnly(sam.access_token), false);
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
  const status = await tool(signedIn.access_token, "team_status");
  assert.equal(failed(status), false, textOf(status));
  assert.match(textOf(status), /Acme/);
  const memberKey = (await service("POST", "/v1/team/keys", { key: admin, body: { label: "Cli user" } })).body.key;
  remember(memberKey);
  const member = await signIn(client, memberKey);
  assert.equal((await keyCheck(member.access_token)).status, 200);
  assert.equal(textOf(await tool(member.access_token, "team_status")), "This needs one of the team's admin keys.");
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

// ─── The Guesty tools over /mcp ───────────────────────────────────────────────

const WRITE = "reservationsopenapicontroller_createreservation";
const BE_LISTINGS = "getapplicationlistingslist";

test("search_operations and describe_operation answer by id, operationId and METHOD /path", async () => {
  const user = await signIn(client, (await invite("Searcher")).code);
  const before = api.requests.length;
  const found = await tool(user.access_token, "search_operations", { query: "list listings", limit: 3 });
  assert.equal(failed(found), false);
  assert.ok(JSON.parse(textOf(found)).results.some((r) => r.id === "propertieslistinglist"), textOf(found));
  for (const reference of ["propertieslistinglist", "GET /v1/listings"]) {
    const described = JSON.parse(textOf(await tool(user.access_token, "describe_operation", { operation: reference })));
    assert.equal(described.id, "propertieslistinglist", reference);
    assert.equal(described.path, "/v1/listings");
  }
  const byOperationId = JSON.parse(textOf(await tool(user.access_token, "describe_operation", { operation: "ReservationsOpenApiController_createReservation" })));
  assert.equal(byOperationId.id, WRITE);
  assert.equal(byOperationId.changes_data, true);
  const unknown = await tool(user.access_token, "describe_operation", { operation: "frobnicate the listings" });
  assert.equal(failed(unknown), true);
  assert.match(textOf(unknown), /^No Guesty operation "frobnicate the listings"\./);
  assert.equal(api.requests.length, before, "search and describe never reach Guesty");
});

test("call_operation reads with the team's Open API token, and all_pages follows every page", async () => {
  const user = await signIn(client, (await invite("Reader of listings")).code);
  const { result: read, requests } = await withGuesty(null, () => tool(user.access_token, "call_operation", { operation: "propertieslistinglist", query: { fields: "title" } }));
  assert.equal(failed(read), false, textOf(read));
  assert.deepEqual(JSON.parse(textOf(read)), { results: [{ _id: "l1", title: "Beach house" }], count: 1 });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].host, "open-api.guesty.com");
  assert.equal(requests[0].search, "?fields=title");
  assert.match(requests[0].authorization, /^Bearer mock-open-token-\d+$/);

  api.total = 250;
  const { result: all, requests: pages } = await withGuesty(null, () => tool(user.access_token, "call_operation", { operation: "propertieslistinglist", all_pages: true }));
  const body = JSON.parse(textOf(all));
  assert.equal(body.count, 250);
  assert.equal(new Set(body.results.map((r) => r._id)).size, 250);
  assert.deepEqual(pages.map((r) => r.search), ["?limit=100&skip=0", "?limit=100&skip=100", "?limit=100&skip=200"]);
});

test("a write previews with Not sent. and is sent only with confirm", async () => {
  const user = await signIn(client, (await invite("Writer")).code);
  const args = { operation: WRITE, body: { listingId: "l1", checkInDateLocalized: "2026-12-01" } };
  const { result: preview, requests: none } = await withGuesty(null, () => tool(user.access_token, "call_operation", args));
  assert.match(textOf(preview), /^Not sent\. "Create a reservation/);
  assert.match(textOf(preview), /confirm: true/);
  assert.equal(none.length, 0);
  const { result: done, requests } = await withGuesty(null, () => tool(user.access_token, "call_operation", { ...args, confirm: true }));
  assert.match(textOf(done), /^Done: POST \/v1\//);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "POST");
  assert.deepEqual(JSON.parse(requests[0].body), args.body);
});

test("a read-only sign-in refuses writes and invites without sending anything", async () => {
  const reader = await signIn(client, admin, { readOnly: true });
  const { result, requests } = await withGuesty(null, async () => [
    await tool(reader.access_token, "call_operation", { operation: WRITE, body: {}, confirm: true }),
    await tool(reader.access_token, "invite_teammate", { name: "Pat", confirm: true }),
  ]);
  assert.match(textOf(result[0]), /^This server is read-only, so it won't run POST /);
  assert.equal(textOf(result[1]), "This server is read-only, so it won't create invites.");
  assert.ok(result.every(failed));
  assert.equal(requests.length, 0);
  // Reads still work.
  assert.equal(failed(await keyCheck(reader.access_token)), false);
});

test("Booking Engine operations go to booking.guesty.com with the team's beapi token", async () => {
  const user = await signIn(client, (await invite("Booker")).code);
  const { result, requests } = await withGuesty(null, () => tool(user.access_token, "call_operation", { operation: BE_LISTINGS, query: { minOccupancy: 2 } }));
  assert.equal(failed(result), false, textOf(result));
  assert.deepEqual(JSON.parse(textOf(result)), { results: [{ _id: "be-1", title: "Booking engine listing" }] });
  assert.equal(requests.length, 1);
  assert.equal(`${requests[0].host}${requests[0].path}${requests[0].search}`, "booking.guesty.com/api/listings?minOccupancy=2");
  assert.match(requests[0].authorization, /^Bearer mock-be-token-\d+$/);
});

test("team_status: admins see the team, members get the token service's 403 message", async () => {
  const adminSession = await signIn(client, admin);
  const status = await tool(adminSession.access_token, "team_status");
  assert.equal(failed(status), false, textOf(status));
  const team = JSON.parse(textOf(status));
  assert.equal(team.team?.name ?? team.name, "Acme", textOf(status));
  const member = await signIn(client, (await invite("Plain member")).code);
  const refused = await tool(member.access_token, "team_status");
  assert.equal(failed(refused), true);
  assert.equal(textOf(refused), "This needs one of the team's admin keys.");
});

test("invite_teammate: preview, confirm with a link checked against the public token-service URL, refusals", async () => {
  const adminSession = await signIn(client, admin);
  const preview = await tool(adminSession.access_token, "invite_teammate", { name: "Pat", email: "pat@example.com" });
  assert.equal(textOf(preview).split("\n")[0], "Not sent. This would invite Pat (pat@example.com) to the team as a member, giving them the team's Guesty access, and email them the invite.");
  const done = await tool(adminSession.access_token, "invite_teammate", { name: "Pat", confirm: true });
  assert.equal(failed(done), false, textOf(done));
  const lines = textOf(done).split("\n");
  assert.equal(lines[0], "Created Pat's invite.");
  const link = /^Link: (https:\/\/guesty-tokens\.staykit\.ai\/join\/([0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}))$/.exec(lines[1]);
  assert.ok(link, lines[1]);
  remember(link[2], link[2].replace(/-/g, ""));
  assert.equal(lines[2], `They join by installing the Guesty CLI and running: guesty join ${link[2]}`);
  assert.match(lines[3], /^It works once and expires /);
  // The invite works with the token service.
  const joined = await tokenService.fetch(`${TOKENS_ORIGIN}/v1/join`, { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": freshIp() }, body: JSON.stringify({ code: link[2] }) });
  assert.equal(joined.status, 201);
  remember((await joined.json()).key);

  assert.match(textOf(await tool(adminSession.access_token, "invite_teammate", { name: "Boss", admin: true, confirm: true })), /^Admin invites can't be made here/);
  assert.equal(textOf(await tool(adminSession.access_token, "invite_teammate", { name: "Pat", email: "not-an-email", confirm: true })), "That email address doesn't look right.");
  const member = await signIn(client, (await invite("Inviter")).code);
  assert.equal(textOf(await tool(member.access_token, "invite_teammate", { name: "Friend", confirm: true })), "This needs one of the team's admin keys.");
  // A Worker whose token service is elsewhere refuses the link the service returned.
  const elsewhere = await tool(adminSession.access_token, "invite_teammate", { name: "Lou", confirm: true }, { worker: shortWorker });
  assert.equal(textOf(elsewhere), "The token service returned an invite link for a different service.");
});

// ─── Transport (S10) ──────────────────────────────────────────────────────────

let transportUser;
const listings = (options) => tool(transportUser.access_token, "call_operation", { operation: "propertieslistinglist" }, options);
const createReservation = (options) => tool(transportUser.access_token, "call_operation", { operation: WRITE, body: { listingId: "l1" }, confirm: true }, options);

test("a Guesty redirect gets the core's message and its Location is never followed", async () => {
  transportUser = await signIn(client, admin);
  const { result, requests } = await withGuesty(() => new Response(null, { status: 302, headers: { location: "https://evil.example/steal" } }), () => listings());
  assert.equal(textOf(result), "Guesty API GET /v1/listings failed: HTTP 302. Redirects are not followed; use the documented resource path.");
  assert.equal(requests.length, 1);
  assert.deepEqual(unexpected, [], "evil.example was never fetched");
});

test("5xx: a read is retried, a write isn't and its outcome is unknown", async () => {
  let first = true;
  const { result: read, requests: reads } = await withGuesty(() => {
    if (!first) return undefined;
    first = false;
    return new Response("down", { status: 503 });
  }, () => listings());
  assert.equal(failed(read), false, textOf(read));
  assert.equal(reads.length, 2);
  const { result: write, requests: writes } = await withGuesty(() => Response.json({ message: "boom" }, { status: 500 }), () => createReservation());
  assert.match(textOf(write), /^Guesty API POST \/v1\/\S+ failed: HTTP 500\. Its outcome is unknown; check Guesty before trying again\./);
  assert.equal(writes.length, 1);
});

test("a 429 with Retry-After is waited out and retried", async () => {
  let first = true;
  const started = Date.now();
  const { result, requests } = await withGuesty(() => {
    if (!first) return undefined;
    first = false;
    return new Response("slow down", { status: 429, headers: { "retry-after": "1" } });
  }, () => listings());
  assert.equal(failed(result), false, textOf(result));
  assert.equal(requests.length, 2);
  assert.ok(Date.now() - started >= 900, "it waited");
});

test("a 401 from Guesty re-reads the team's token once, then fails with what an admin can do", async () => {
  const { result, requests } = await withGuesty(() => new Response("no", { status: 401 }), () => listings());
  assert.equal(
    textOf(result),
    "Guesty rejected the cached Open API token (401); this server cannot refresh it. The team's shared token was rejected. A team admin can check it with `guesty team status` and renew it with `guesty team refresh`.",
  );
  // The token service gave the same token again, so it wasn't sent twice.
  assert.equal(requests.length, 1);
  assert.equal(guestyTokens > 0, true);
});

test("Guesty error bodies are shown without the token sent or the member key", async () => {
  const { result } = await withGuesty((entry) => Response.json({ message: `bad request for ${entry.authorization} and ${admin}` }, { status: 400 }), () => listings());
  const text = textOf(result);
  assert.match(text, /^Guesty API GET \/v1\/listings failed: HTTP 400\n/);
  assert.match(text, /bad request for Bearer \[redacted\] and \[redacted\]/);
  assert.doesNotMatch(text, /mock-open-token|gts_/);
});

test("a Guesty response over 8 MB is refused, streamed or declared", async () => {
  const chunk = new TextEncoder().encode("x".repeat(1024 * 1024));
  const streamed = () => {
    let sent = 0;
    return new Response(new ReadableStream({ pull(c) { if (sent++ >= 9) return c.close(); c.enqueue(chunk); } }), { headers: { "content-type": "application/json" } });
  };
  for (const answer of [streamed, () => new Response("x".repeat(9 * 1024 * 1024), { headers: { "content-type": "application/json" } })]) {
    const { result, requests } = await withGuesty(answer, () => listings());
    assert.equal(textOf(result), "Guesty API GET /v1/listings returned more than 8 MB, the most this server reads. Ask for less with query parameters such as fields, limit or filters.");
    assert.equal(requests.length, 1);
  }
});

test("timeouts (short Worker): a read is retried then fails, a write isn't retried and its outcome is unknown", async () => {
  const hang = () => sleep(3000).then(() => Response.json({ late: true }));
  const { result: read, requests: reads } = await withGuesty(hang, () => listings({ worker: shortWorker }));
  assert.equal(textOf(read), "Guesty API GET /v1/listings could not complete (network error or 60s timeout).");
  assert.equal(reads.length, 3);
  const { result: write, requests: writes } = await withGuesty(hang, () => createReservation({ worker: shortWorker }));
  assert.match(textOf(write), /^Guesty API POST \/v1\/\S+ could not complete \(network error or 60s timeout\)\. Its outcome is unknown; check Guesty before trying again\.$/);
  assert.equal(writes.length, 1);
});

test("deadline (short Worker): pagination that can't finish in time fails with no partial result", async () => {
  api.total = 2000;
  const started = Date.now();
  const { result, requests } = await withGuesty(
    (entry, url) => (url.searchParams.has("skip") ? sleep(600).then(() => undefined) : undefined),
    () => tool(transportUser.access_token, "call_operation", { operation: "propertieslistinglist", all_pages: true }, { worker: shortWorker }),
  );
  api.total = 250;
  assert.equal(failed(result), true);
  assert.match(textOf(result), /^(Pagination stopped: every page didn't arrive within this tool call's 8s limit|This tool call ran out of time: it has 8s)/);
  assert.doesNotMatch(textOf(result), /"results"/);
  assert.ok(requests.length < 20, `${requests.length} pages`);
  assert.ok(Date.now() - started < SHORT_BUDGET_MS + 3000);
});

// ─── The same answers as the local `guesty mcp` ───────────────────────────────

function localMcp(messages) {
  return new Promise((resolve, reject) => {
    const home = mkdtempSync(join(tmpdir(), "guesty-mcp-parity-"));
    const child = spawn(CLI, ["mcp"], { env: { PATH: process.env.PATH, HOME: home, USERPROFILE: home }, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (status) => {
      rmSync(home, { recursive: true, force: true });
      if (status !== 0) return reject(new Error(`guesty mcp exited ${status}: ${stderr}`));
      const lines = new Map();
      for (const line of stdout.split("\n").filter(Boolean)) lines.set(JSON.parse(line).id, line);
      resolve(lines);
    });
    child.stdin.end(messages.map((m) => JSON.stringify(m)).join("\n") + "\n");
  });
}

test("wasm vs native: tools/list, searches and describes equal the local guesty mcp byte for byte", { skip: !existsSync(CLI) && `build the CLI first (${CLI})` }, async () => {
  const user = await signIn(client, (await invite("Parity")).code);
  const queries = [
    "list reservations", "get a reservation", "cancel a reservation", "listing calendar availability", "send a guest message",
    "create a reservation", "update listing price", "guest", "payment", "refund a payment", "owner statement", "tasks",
    "cleaning", "reviews", "webhooks", "custom fields", "/v1/reservations", "/v1/listings/{id}", "quote", "coupon",
    "booking engine listings", "inquiries", "conversations", "invoice items", "accounting", "photos", "amenities",
    "house rules", "taxes", "channel", "airbnb", "saved replies", "zzzzqqq nothing", "  ",
  ];
  const messages = [{ jsonrpc: "2.0", id: 1, method: "tools/list" }];
  let id = 2;
  for (const query of queries) messages.push({ jsonrpc: "2.0", id: id++, method: "tools/call", params: { name: "search_operations", arguments: { query, limit: 25 } } });
  messages.push({ jsonrpc: "2.0", id: id++, method: "tools/call", params: { name: "search_operations", arguments: { query: "listing", api: "booking-engine", include_deprecated: true } } });
  messages.push({ jsonrpc: "2.0", id: id++, method: "tools/call", params: { name: "search_operations", arguments: { query: "reservation", api: "open-api", limit: 5 } } });
  // Describe a sample of what the searches found, plus the other ways to name an operation.
  const firstRound = new Map();
  for (const m of messages) firstRound.set(m.id, (await mcp(user.access_token, m)).text);
  const ids = new Set();
  for (const text of firstRound.values()) {
    const reply = JSON.parse(text);
    if (reply.result?.content && !reply.result.isError) {
      try {
        for (const r of JSON.parse(reply.result.content[0].text).results ?? []) ids.add(r.id);
      } catch {}
    }
  }
  const sample = [...ids].filter((_, i) => i % 3 === 0).slice(0, 40);
  assert.ok(sample.length >= 30, `${sample.length} operations sampled`);
  const describes = [...sample, "GET /v1/listings", "post /v1/reservations-v3", "ReservationsOpenApiController_createReservation", "frobnicate", ""];
  const second = [];
  for (const operation of describes) second.push({ jsonrpc: "2.0", id: id++, method: "tools/call", params: { name: "describe_operation", arguments: { operation } } });
  const local = await localMcp([...messages, ...second]);
  let compared = 0;
  for (const m of [...messages, ...second]) {
    const hosted = firstRound.get(m.id) ?? (await mcp(user.access_token, m)).text;
    assert.equal(hosted, local.get(m.id), `${m.method} ${JSON.stringify(m.params ?? {})}`);
    compared += 1;
  }
  assert.ok(compared >= 70, `${compared} compared`);
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

// The official MCP TypeScript SDK client, end to end: it discovers the server, registers, sends
// the person to the sign-in page (approved here with an invite), exchanges the code with PKCE,
// uses the tools, and refreshes on its own when its access token stops working.
test("the official MCP SDK client signs in with an invite, uses the tools and refreshes", async () => {
  const sdk = createRequire(join(crate, "..", "..", "package.json"));
  const { Client } = await import(sdk.resolve("@modelcontextprotocol/sdk/client/index.js"));
  const { StreamableHTTPClientTransport } = await import(sdk.resolve("@modelcontextprotocol/sdk/client/streamableHttp.js"));
  const { UnauthorizedError } = await import(sdk.resolve("@modelcontextprotocol/sdk/client/auth.js"));
  const invited = await invite("SDK User");
  const saved = {};
  let opened;
  const provider = {
    get redirectUrl() { return REDIRECT; },
    get clientMetadata() {
      return { client_name: "SDK test", redirect_uris: [REGISTERED_REDIRECT], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" };
    },
    clientInformation: () => saved.client,
    saveClientInformation: (info) => { saved.client = info; },
    tokens: () => saved.tokens,
    saveTokens: (tokens) => { saved.tokens = tokens; remember(tokens.access_token, tokens.refresh_token); },
    redirectToAuthorization: (url) => { opened = url; },
    saveCodeVerifier: (verifier) => { saved.verifier = verifier; },
    codeVerifier: () => saved.verifier,
  };
  const fetchFn = (url, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set("CF-Connecting-IP", freshIp());
    return mf.dispatchFetch(String(url), { ...init, headers, redirect: "manual" });
  };
  const connect = async () => {
    const client = new Client({ name: "sdk-test", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(RESOURCE), { authProvider: provider, fetch: fetchFn });
    await client.connect(transport);
    return { client, transport };
  };

  // No tokens yet: the SDK registers and opens the sign-in page.
  const first = new StreamableHTTPClientTransport(new URL(RESOURCE), { authProvider: provider, fetch: fetchFn });
  await assert.rejects(new Client({ name: "sdk-test", version: "1.0.0" }).connect(first), UnauthorizedError);
  assert.ok(saved.client?.client_id, "the SDK registered a client");
  assert.equal(opened.origin, PUBLIC);
  assert.equal(opened.searchParams.get("resource"), RESOURCE);
  const page = await call(`${opened.pathname}${opened.search}`);
  const field = /name="request" value="([^"]*)"/.exec(await page.text())?.[1];
  assert.ok(field, "the sign-in page has its signed request");
  const approved = await submit(field, { credential: invited.code });
  assert.equal(approved.status, 303);
  const back = new URL(approved.headers.get("location"));
  assert.equal(back.searchParams.get("iss"), PUBLIC);
  await first.finishAuth(back.searchParams.get("code"));
  assert.ok(saved.tokens?.access_token && saved.tokens?.refresh_token);

  const { client } = await connect();
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name), ["search_operations", "describe_operation", "call_operation", "team_status", "invite_teammate"]);
  const found = await client.callTool({ name: "search_operations", arguments: { query: "list reservations" } });
  assert.notEqual(found.isError, true);
  assert.match(found.content[0].text, /reservations/i);

  // The access token stops working: the SDK refreshes (rotating the refresh token) and retries.
  const before = saved.tokens.refresh_token;
  await mcpDb.prepare("UPDATE access_tokens SET expires_at = 0").run();
  const described = await client.callTool({ name: "describe_operation", arguments: { operation: "GET /v1/listings" } });
  assert.notEqual(described.isError, true);
  assert.notEqual(saved.tokens.refresh_token, before, "the refresh token rotated");
  await client.close();
});

// Cloudflare stops a Worker that passes 128 MB. Near the hosted limits (2,000 results and 32 MB
// over many pages, an 8 MB response) a call must stay well under that; a response that would parse
// into millions of values is refused before parsing. Wasm memory only grows, so the last reading
// is the peak.
test("near the hosted limits, a tool call's memory stays well under the Worker's 128 MB", async (t) => {
  const session = await signIn(client, admin);
  const filler = "x".repeat(300);
  const record = (i) => Object.fromEntries([["_id", `r${i}`], ...Array.from({ length: 52 }, (_, f) => [`field${f}`, `${filler}${i}`])]);
  const options = { worker: memoryWorker };
  const memory = (res) => Number(res.headers.get("x-wasm-memory-bytes"));

  const total = 1950;
  const pages = (entry, url) => {
    if (entry.path !== "/v1/listings" || !url.searchParams.has("skip")) return undefined;
    const skip = Number(url.searchParams.get("skip"));
    const limit = Number(url.searchParams.get("limit"));
    const results = Array.from({ length: Math.max(0, Math.min(limit, total - skip)) }, (_, i) => record(skip + i));
    return Response.json({ results, count: total, skip, limit });
  };
  const { result: paged, requests } = await withGuesty(pages, () => tool(session.access_token, "call_operation", { operation: "propertieslistinglist", all_pages: true }, options));
  assert.equal(failed(paged), false, textOf(paged));
  assert.equal(requests.length, 20);
  assert.match(textOf(paged), /^\{\n "count": 1950,\n "results": \[\n  \{/);
  assert.match(textOf(paged), /\[Truncated: showing the first 60,000 of [\d,]+ characters\./);
  t.diagnostic(`all_pages, 1,950 results (~31 MB): wasm memory ${memory(paged)} bytes`);

  const big = (entry, url) => (entry.path === "/v1/listings" && !url.searchParams.has("skip") ? Response.json({ results: Array.from({ length: 450 }, (_, i) => record(i)) }) : undefined);
  const { result: single } = await withGuesty(big, () => tool(session.access_token, "call_operation", { operation: "propertieslistinglist" }, options));
  assert.equal(failed(single), false, textOf(single));
  t.diagnostic(`one ~7.5 MB response: wasm memory ${memory(single)} bytes`);

  const flat = (entry, url) => (entry.path === "/v1/listings" && !url.searchParams.has("skip") ? new Response(`[${Array(3_000_000).fill(1).join(",")}]`, { headers: { "content-type": "application/json" } }) : undefined);
  const { result: refused } = await withGuesty(flat, () => tool(session.access_token, "call_operation", { operation: "propertieslistinglist" }, options));
  assert.equal(failed(refused), true);
  assert.match(textOf(refused), /returned more than 300,000 JSON values/);
  const peak = memory(refused);
  t.diagnostic(`after a 3,000,000-value response: wasm memory ${peak} bytes`);
  assert.ok(peak > 0 && peak < 96 * 1024 * 1024, `peak wasm memory ${peak} bytes`);
});
