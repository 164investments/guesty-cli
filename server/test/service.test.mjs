// Runs the bundled Worker in Miniflare with a local D1 database. Every
// outbound request goes to a mock of Guesty's token endpoint; nothing here
// contacts Guesty.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";
import { Miniflare } from "miniflare";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const oauth = { requests: [], replies: [] };
let mf;
let base;
let db;
let tokenCount = 0;

async function guestyOAuth(request) {
  const url = new URL(request.url);
  if (url.pathname !== "/oauth2/token" || !["open-api.guesty.com", "booking.guesty.com"].includes(url.hostname)) {
    throw new Error(`Unexpected outbound request to ${url.href}`);
  }
  oauth.requests.push({ host: url.hostname, contentType: request.headers.get("content-type"), form: Object.fromEntries(new URLSearchParams(await request.text())) });
  const reply = oauth.replies.shift() ?? { status: 200 };
  if (reply.delayMs) await new Promise((resolve) => setTimeout(resolve, reply.delayMs));
  if (reply.networkError) return Response.error();
  tokenCount += 1;
  const kind = url.hostname === "open-api.guesty.com" ? "open" : "booking";
  return new Response(reply.raw ?? JSON.stringify(reply.status === 200
    ? { token_type: "Bearer", access_token: `mock-${kind}-token-${tokenCount}`, expires_in: 86400, scope: "open-api" }
    : { error: "mock failure" }), { status: reply.status, headers: { "Content-Type": "application/json" } });
}

function call(method, path, { key, body, headers = {} } = {}) {
  return fetch(`${base}${path}`, {
    method,
    headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function callJson(method, path, options) {
  const res = await call(method, path, options);
  return { status: res.status, body: await res.json(), headers: res.headers };
}

const credentials = (n, secret = `secret-${n}`) => ({ client_id: `client-${n}`, client_secret: secret });

async function createTeam(n, extra = {}) {
  return callJson("POST", "/v1/teams", { body: { name: `Team ${n}`, credentials: { openapi: credentials(n) }, ...extra } });
}

function migrationStatements() {
  const migration = readFileSync(join(root, "migrations/0001_init.sql"), "utf8").replace(/--.*$/gm, "");
  return migration.split(";").map((part) => part.trim()).filter(Boolean);
}

function sql(query, ...params) {
  return db.prepare(query).bind(...params);
}

before(async () => {
  mf = new Miniflare({
    modules: true,
    scriptPath: join(root, "dist/index.js"),
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "guesty-token-service-test" },
    bindings: { CREDENTIALS_KEY: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))) },
    outboundService: guestyOAuth,
    host: "127.0.0.1",
    port: 0,
  });
  base = (await mf.ready).origin;
  db = await mf.getD1Database("DB");
  for (const statement of migrationStatements()) await db.prepare(statement).run();
});

after(() => mf?.dispose());

test("health check answers without a key", async () => {
  assert.deepEqual((await callJson("GET", "/health")).body, { service: "guesty-token-service", ok: true });
});

let admin;
let member;

test("creating a team checks the credentials with Guesty once and stores them encrypted", async () => {
  const { status, body } = await callJson("POST", "/v1/teams", {
    body: { name: "Acme", admin_label: "Dana", credentials: { openapi: { client_id: "acme-id", client_secret: "acme-secret\n" } } },
  });
  assert.equal(status, 201);
  assert.match(body.admin_key, /^gts_[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(body.token_types, ["openapi"]);
  admin = body.admin_key;
  assert.equal(oauth.requests.length, 1);
  assert.deepEqual(oauth.requests[0], {
    host: "open-api.guesty.com",
    contentType: "application/x-www-form-urlencoded",
    form: { grant_type: "client_credentials", scope: "open-api", client_id: "acme-id", client_secret: "acme-secret" },
  });
  const rows = JSON.stringify([
    (await sql("SELECT * FROM credentials").all()).results,
    (await sql("SELECT * FROM tokens").all()).results,
    (await sql("SELECT * FROM access_keys").all()).results,
  ]);
  for (const plaintext of ["acme-id", "acme-secret", "mock-open-token-1", admin]) assert.doesNotMatch(rows, new RegExp(plaintext));
});

test("every member reads the same cached token without another Guesty request", async () => {
  const invite = await callJson("POST", "/v1/team/keys", { key: admin, body: { label: "Sam" } });
  assert.equal(invite.status, 201);
  member = invite.body.key;
  const first = await callJson("POST", "/v1/token", { key: admin, body: { token_type: "openapi" } });
  const second = await callJson("POST", "/v1/token", { key: member, body: {} });
  assert.equal(first.status, 200);
  assert.equal(first.body.access_token, "mock-open-token-1");
  assert.equal(first.body.token_type, "openapi");
  assert.ok(first.body.expires_at > Date.now() + 23.9 * 3600_000);
  assert.deepEqual(second.body, first.body);
  assert.equal(oauth.requests.length, 1);
});

test("keys are checked: wrong, revoked, member-only and last-admin cases", async () => {
  assert.equal((await call("POST", "/v1/token", { key: `gts_${"A".repeat(43)}`, body: {} })).status, 401);
  assert.equal((await call("POST", "/v1/token", { body: {} })).status, 401);
  assert.equal((await call("GET", "/v1/team", { key: member })).status, 403);
  assert.equal((await callJson("DELETE", "/v1/team/keys/Dana", { key: admin })).body.error, "last_admin");
  const leaver = (await callJson("POST", "/v1/team/keys", { key: admin, body: { label: "Leaver" } })).body.key;
  assert.equal((await call("POST", "/v1/token", { key: leaver, body: {} })).status, 200);
  assert.equal((await callJson("DELETE", "/v1/team/keys/Leaver", { key: admin })).status, 200);
  assert.equal((await call("POST", "/v1/token", { key: leaver, body: {} })).status, 401);
  assert.equal((await callJson("POST", "/v1/team/keys", { key: admin, body: { label: "Sam" } })).body.error, "label_in_use");
});

test("a token near expiry is renewed once, even when several members ask at the same moment", async () => {
  await sql("UPDATE tokens SET expires_at = ?", Date.now() + 30 * 60_000).run();
  oauth.replies.push({ status: 200, delayMs: 300 });
  const results = await Promise.all([admin, member, admin, member].map((key) => callJson("POST", "/v1/token", { key, body: {} })));
  assert.equal(oauth.requests.length, 2);
  assert.ok(results.every(({ status }) => status === 200));
  assert.ok(results.some(({ body }) => body.access_token === "mock-open-token-2"));
  const after = await callJson("POST", "/v1/token", { key: member, body: {} });
  assert.equal(after.body.access_token, "mock-open-token-2");
});

const ageRequests = (ms) => sql("UPDATE token_requests SET requested_at = requested_at - ?", ms).run();

test("a failed request pauses renewals, but a still-valid token keeps working", async () => {
  await ageRequests(25 * 3600_000);
  const before = oauth.requests.length;
  oauth.replies.push({ status: 500 });
  const failed = await callJson("POST", "/v1/team/refresh", { key: admin, body: {} });
  assert.equal(failed.status, 502);
  assert.equal(failed.body.error, "guesty_unavailable");
  const waiting = await callJson("POST", "/v1/team/refresh", { key: admin, body: {} });
  assert.equal(waiting.status, 503);
  assert.equal(waiting.body.error, "waiting");
  assert.ok(Number(waiting.headers.get("Retry-After")) > 25 * 60);
  assert.equal((await callJson("POST", "/v1/token", { key: member, body: {} })).body.access_token, "mock-open-token-2");
  assert.equal(oauth.requests.length, before + 1);
});

test("the daily limit counts every request, and the next allowed time is reported", async () => {
  await ageRequests(31 * 60_000);
  const before = oauth.requests.length;
  assert.equal((await callJson("POST", "/v1/team/refresh", { key: admin, body: {} })).status, 200);
  assert.equal((await callJson("POST", "/v1/team/refresh", { key: admin, body: {} })).status, 200);
  const limited = await callJson("POST", "/v1/team/refresh", { key: admin, body: {} });
  assert.equal(limited.status, 503);
  assert.equal(limited.body.error, "limit_reached");
  assert.match(limited.body.message, /used its 3 openapi token requests/);
  assert.ok(limited.body.retry_at > Date.now());
  assert.equal(oauth.requests.length, before + 2);
});

test("an expired token with no request allowed fails with the reason", async () => {
  await sql("UPDATE tokens SET expires_at = ?", Date.now() - 1000).run();
  const before = oauth.requests.length;
  const result = await callJson("POST", "/v1/token", { key: member, body: {} });
  assert.equal(result.status, 503);
  assert.equal(result.body.error, "limit_reached");
  assert.equal(oauth.requests.length, before);
});

test("a 429 pauses renewals for two hours", async () => {
  await ageRequests(25 * 3600_000);
  const before = oauth.requests.length;
  oauth.replies.push({ status: 429 });
  assert.equal((await callJson("POST", "/v1/team/refresh", { key: admin, body: {} })).status, 502);
  await ageRequests(90 * 60_000);
  assert.equal((await callJson("POST", "/v1/team/refresh", { key: admin, body: {} })).body.error, "waiting");
  await ageRequests(31 * 60_000);
  assert.equal((await callJson("POST", "/v1/team/refresh", { key: admin, body: {} })).status, 200);
  assert.equal(oauth.requests.length, before + 2);
});

// Miniflare turns errors in an outbound mock into HTTP 500s, so a separate
// Worker points at a closed local port to make the request itself fail.
test("a request that never reaches Guesty is recorded and pauses renewals", async () => {
  const offline = new Miniflare({
    modules: true,
    scriptPath: join(root, "dist/index.js"),
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "guesty-token-service-offline" },
    bindings: { CREDENTIALS_KEY: btoa(String.fromCharCode(...new Uint8Array(32).fill(7))), OPENAPI_TOKEN_URL: "http://127.0.0.1:9/oauth2/token" },
  });
  try {
    const offlineDb = await offline.getD1Database("DB");
    for (const statement of migrationStatements()) await offlineDb.prepare(statement).run();
    const create = () => offline.dispatchFetch("http://local/v1/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Offline", credentials: { openapi: credentials("offline") } }),
    }).then(async (res) => ({ status: res.status, body: await res.json() }));
    const failed = await create();
    assert.equal(failed.status, 502);
    assert.equal(failed.body.error, "guesty_unavailable");
    assert.deepEqual(await offlineDb.prepare("SELECT outcome, detail FROM token_requests").first(), { outcome: "failed", detail: "request did not complete" });
    assert.equal((await create()).body.error, "waiting");
  } finally {
    await offline.dispose();
  }
});

test("rejected credentials save nothing, and sign-up retries are limited to two a day", async () => {
  const before = oauth.requests.length;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    oauth.replies.push({ status: 401 });
    const result = await createTeam("typo");
    assert.equal(result.status, 422, `attempt ${attempt}`);
    assert.equal(result.body.error, "credentials_rejected");
  }
  const blocked = await createTeam("typo");
  assert.equal(blocked.body.error, "limit_reached");
  assert.match(blocked.body.message, /sign-up attempts/);
  assert.equal(oauth.requests.length, before + 2);
  assert.equal((await sql("SELECT COUNT(*) AS n FROM teams WHERE name = 'Team typo'").first()).n, 0);
});

test("deleting a team keeps its request history, so a new team cannot reset the limit", async () => {
  const created = await createTeam("short-lived");
  assert.equal(created.status, 201);
  assert.equal((await callJson("DELETE", "/v1/team", { key: created.body.admin_key })).status, 200);
  assert.equal((await call("POST", "/v1/token", { key: created.body.admin_key, body: {} })).status, 401);
  const history = await sql("SELECT COUNT(*) AS n, MAX(team_id) AS team FROM token_requests WHERE fingerprint = (SELECT fingerprint FROM token_requests ORDER BY id DESC LIMIT 1)").first();
  assert.deepEqual(history, { n: 1, team: null });
  assert.equal((await sql("SELECT COUNT(*) AS n FROM credentials").first()).n, 1);
});

test("booking-engine credentials get their own token, scope and endpoint", async () => {
  const created = await callJson("POST", "/v1/teams", {
    body: { name: "Both", credentials: { openapi: credentials("both"), beapi: { client_id: "be-id", client_secret: "be-secret" } } },
  });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.token_types, ["openapi", "beapi"]);
  const beapiRequest = oauth.requests.at(-1);
  assert.equal(beapiRequest.host, "booking.guesty.com");
  assert.equal(beapiRequest.form.scope, "booking_engine:api");
  const token = await callJson("POST", "/v1/token", { key: created.body.admin_key, body: { token_type: "beapi" } });
  assert.equal(token.body.token_type, "beapi");
  assert.match(token.body.access_token, /^mock-booking-token-/);
});

test("a team without booking-engine credentials says how to add them", async () => {
  const result = await callJson("POST", "/v1/token", { key: member, body: { token_type: "beapi" } });
  assert.equal(result.status, 404);
  assert.match(result.body.message, /guesty team credentials --beapi/);
});

test("a failed booking-engine credential still creates the team and reports it", async () => {
  oauth.replies.push({ status: 200 }, { status: 401 });
  const created = await callJson("POST", "/v1/teams", {
    body: { name: "Half", credentials: { openapi: credentials("half"), beapi: { client_id: "bad-be", client_secret: "x" } } },
  });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.token_types, ["openapi"]);
  assert.equal(created.body.beapi_error.error, "credentials_rejected");
});

test("an admin can replace credentials, and Guesty confirms them first", async () => {
  await ageRequests(25 * 3600_000);
  oauth.replies.push({ status: 401 });
  const bad = await callJson("PUT", "/v1/team/credentials", { key: admin, body: { token_type: "openapi", client_id: "acme-id", client_secret: "wrong" } });
  assert.equal(bad.body.error, "credentials_rejected");
  const good = await callJson("PUT", "/v1/team/credentials", { key: admin, body: { token_type: "openapi", client_id: "acme-id", client_secret: "rotated" } });
  assert.equal(good.status, 200);
  assert.equal(oauth.requests.at(-1).form.client_secret, "rotated");
  const latest = `mock-open-token-${tokenCount}`;
  assert.equal((await callJson("POST", "/v1/token", { key: member, body: {} })).body.access_token, latest);
  const taken = await callJson("PUT", "/v1/team/credentials", { key: admin, body: { token_type: "openapi", ...credentials("both") } });
  assert.equal(taken.body.error, "credentials_in_use");
});

test("someone who only knows a team's client ID cannot take it over or use up its renewals", async () => {
  const acme = (secret) => callJson("POST", "/v1/teams", { body: { name: "Copy", credentials: { openapi: { client_id: "acme-id", client_secret: secret } } } });
  await ageRequests(25 * 3600_000);
  await sql("UPDATE team_creation_attempts SET attempted_at = attempted_at - ?", 2 * 3600_000).run();
  const before = oauth.requests.length;
  oauth.replies.push({ status: 401 });
  const guess = await acme("guessed");
  assert.equal(guess.status, 422);
  const again = await acme("guessed-again");
  assert.equal(again.status, 409);
  assert.match(again.body.message, /Ask one of its admins for an invite/);
  assert.equal(oauth.requests.length, before + 1);
  // The team's own renewals are counted separately and still work.
  assert.equal((await callJson("POST", "/v1/team/refresh", { key: admin, body: {} })).status, 200);
  assert.equal(oauth.requests.length, before + 2);
});

test("the current client secret recovers admin access after Guesty accepts it", async () => {
  await ageRequests(25 * 3600_000);
  const before = oauth.requests.length;
  const recovered = await callJson("POST", "/v1/teams", { body: { name: "Again", credentials: { openapi: { client_id: "acme-id", client_secret: "rotated" } } } });
  assert.equal(recovered.status, 200, JSON.stringify(recovered.body));
  assert.equal(recovered.body.recovered, true);
  assert.equal(oauth.requests.length, before + 1);
  assert.equal(oauth.requests.at(-1).form.client_secret, "rotated");
  const status = await callJson("GET", "/v1/team", { key: recovered.body.admin_key });
  assert.equal(status.body.team.name, "Acme");
  const sameDay = await callJson("POST", "/v1/teams", { body: { name: "Again", credentials: { openapi: { client_id: "acme-id", client_secret: "rotated" } } } });
  assert.equal(sameDay.status, 409);
});

test("status shows token health and keys but no secrets", async () => {
  const { status, body } = await callJson("GET", "/v1/team", { key: admin });
  assert.equal(status, 200);
  assert.equal(body.team.name, "Acme");
  const openapi = body.token_types.find((entry) => entry.token_type === "openapi");
  assert.equal(openapi.configured, true);
  assert.ok(openapi.token_expires_at > Date.now());
  assert.deepEqual(body.keys.map(({ label }) => label).slice(0, 3), ["Dana", "Sam", "Leaver"]);
  assert.doesNotMatch(JSON.stringify(body), /secret|mock-open-token|key_hash|fingerprint/);
});

test("the admin can change the daily limit within Guesty's five", async () => {
  assert.equal((await call("PATCH", "/v1/team", { key: admin, body: { max_requests_per_day: 6 } })).status, 400);
  assert.equal((await callJson("PATCH", "/v1/team", { key: admin, body: { max_requests_per_day: 2 } })).body.team.max_requests_per_day, 2);
});

test("bad requests are refused before any work", async () => {
  assert.equal((await call("POST", "/v1/teams", { body: "{not json" })).status, 400);
  assert.equal((await call("POST", "/v1/teams", { body: { name: "x".repeat(20_000) } })).status, 413);
  assert.equal((await call("POST", "/v1/teams", { body: { name: "No credentials" } })).status, 400);
  assert.equal((await call("POST", "/v1/token", { key: admin, body: { token_type: "other" } })).status, 400);
  assert.equal((await call("GET", "/v1/nothing", { key: admin })).status, 404);
});

test("one address can create at most ten teams an hour", async () => {
  await sql("UPDATE team_creation_attempts SET attempted_at = attempted_at - ?", 2 * 3600_000).run();
  const before = 0;
  for (let n = 0; n < 10 - before; n += 1) await createTeam(`burst-${n}`);
  const blocked = await createTeam("burst-over");
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error, "too_many_teams");
});
