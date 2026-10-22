// Runs the bundled Worker in Miniflare with a local D1 database. Every
// outbound request goes to a mock of Guesty's token endpoint or of Resend's
// email API; nothing here contacts Guesty or sends email.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";
import { Miniflare } from "miniflare";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const oauth = { requests: [], replies: [] };
const resend = { requests: [], replies: [] };
let mf;
let base;
let db;
let tokenCount = 0;

async function outbound(request) {
  const url = new URL(request.url);
  if (url.href === "https://api.resend.com/emails") {
    resend.requests.push({ authorization: request.headers.get("authorization"), body: await request.json() });
    const reply = resend.replies.shift() ?? { status: 200 };
    return Response.json(reply.status === 200 ? { id: `mock-email-${resend.requests.length}` } : { message: "mock failure" }, { status: reply.status });
  }
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

async function migrate(database) {
  for (const file of readdirSync(join(root, "migrations")).filter((name) => name.endsWith(".sql")).sort()) {
    const migration = readFileSync(join(root, "migrations", file), "utf8").replace(/--.*$/gm, "");
    for (const statement of migration.split(";").map((part) => part.trim()).filter(Boolean)) await database.prepare(statement).run();
  }
}

function serviceKey() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
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
    bindings: { CREDENTIALS_KEY: serviceKey(), RESEND_API_KEY: "re_test_key", INVITE_EMAIL_FROM: "Simply VRM <invites@example.com>" },
    outboundService: outbound,
    host: "127.0.0.1",
    port: 0,
  });
  base = (await mf.ready).origin;
  db = await mf.getD1Database("DB");
  await migrate(db);
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
  assert.match(limited.body.message, /used its token requests for the last 24 hours \(the team allows 3, and Guesty allows 5 in all\)/);
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
    await migrate(offlineDb);
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

test("a stranger's failed sign-up does not pause the team's renewals", async () => {
  await ageRequests(25 * 3600_000);
  oauth.replies.push({ status: 500 });
  const stranger = await callJson("POST", "/v1/teams", { body: { name: "Copy", credentials: { openapi: { client_id: "acme-id", client_secret: "odd" } } } });
  assert.equal(stranger.status, 502);
  assert.equal((await callJson("POST", "/v1/team/refresh", { key: admin, body: {} })).status, 200);
});

test("all requests for one client stay within Guesty's five, even when the team allows five", async () => {
  await ageRequests(25 * 3600_000);
  await sql("UPDATE team_creation_attempts SET attempted_at = attempted_at - ?", 2 * 3600_000).run();
  assert.equal((await callJson("PATCH", "/v1/team", { key: admin, body: { max_requests_per_day: 5 } })).status, 200);
  oauth.replies.push({ status: 401 });
  assert.equal((await callJson("POST", "/v1/teams", { body: { name: "Copy", credentials: { openapi: { client_id: "acme-id", client_secret: "guess" } } } })).status, 422);
  const before = oauth.requests.length;
  for (let n = 1; n <= 4; n += 1) assert.equal((await callJson("POST", "/v1/team/refresh", { key: admin, body: {} })).status, 200, `refresh ${n}`);
  const fifth = await callJson("POST", "/v1/team/refresh", { key: admin, body: {} });
  assert.equal(fifth.body.error, "limit_reached");
  assert.match(fifth.body.message, /Guesty allows 5 in all/);
  assert.equal(oauth.requests.length, before + 4);
  assert.equal((await callJson("PATCH", "/v1/team", { key: admin, body: { max_requests_per_day: 3 } })).status, 200);
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

const CODE = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;
const invite = (key, body) => callJson("POST", "/v1/team/invites", { key, body });

test("an invite link shows the steps, and its code works once for a member key", async () => {
  const created = await invite(admin, { label: "Riley" });
  assert.equal(created.status, 201);
  const { code, link, join_command: joinCommand, expires_at: expiresAt } = created.body;
  assert.match(code, CODE);
  assert.equal(link, `${base}/join/${code}`);
  // Only the hosted service's codes work without its address.
  assert.equal(joinCommand, `guesty join ${link}`);
  assert.ok(Math.abs(expiresAt - (Date.now() + 7 * 86400_000)) < 60_000);
  assert.equal(created.body.email, undefined);
  assert.doesNotMatch(JSON.stringify((await sql("SELECT * FROM invites").all()).results), new RegExp(code.replace(/-/g, "")));

  // Opening the link, as a mail scanner would, leaves the invite unused.
  for (let n = 0; n < 2; n += 1) {
    const page = await call("GET", `/join/${code}`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-security-policy"), /default-src 'none'/);
    const html = await page.text();
    assert.match(html, /Dana invited you to the Acme team/);
    assert.ok(html.includes(`releases/latest/download/guesty-cli.tgz &#38;&#38; ${joinCommand}`));
    assert.match(html, /Already have Guesty CLI 1\.5 or later\?/);
  }

  // Lower case, spaces, and O and l for 0 and 1 all read as the same code.
  const loose = code.toLowerCase().replace(/-/g, " ").replace(/0/g, "o").replace(/1/g, "l");
  const joined = await callJson("POST", "/v1/join", { body: { code: loose } });
  assert.equal(joined.status, 201);
  assert.match(joined.body.key, /^gts_[A-Za-z0-9_-]{43}$/);
  assert.deepEqual([joined.body.label, joined.body.role, joined.body.team.name], ["Riley", "member", "Acme"]);
  assert.equal((await call("POST", "/v1/token", { key: joined.body.key, body: {} })).status, 200);
  assert.equal((await call("GET", "/v1/team", { key: joined.body.key })).status, 403);

  const again = await callJson("POST", "/v1/join", { body: { code } });
  assert.equal(again.status, 410);
  assert.match(again.body.message, /already used\. If that wasn't you, ask Dana for a new one/);
  const page = await call("GET", `/join/${code}`);
  assert.equal(page.status, 410);
  assert.match(await page.text(), /already used/);
});

test("a new invite for the same name replaces the pending one; revoke cancels it; expired invites are refused", async () => {
  const first = (await invite(admin, { label: "Morgan" })).body;
  const second = (await invite(admin, { label: "Morgan", role: "admin" })).body;
  assert.match((await callJson("POST", "/v1/join", { body: { code: first.code } })).body.message, /was cancelled/);
  const status = (await callJson("GET", "/v1/team", { key: admin })).body;
  assert.deepEqual(status.invites.map(({ label, role, email, invited_by: by }) => [label, role, email, by]), [["Morgan", "admin", null, "Dana"]]);
  assert.doesNotMatch(JSON.stringify(status), new RegExp(`${second.code.replace(/-/g, "")}|code_hash|email_hash`));

  assert.deepEqual((await callJson("DELETE", "/v1/team/keys/Morgan", { key: admin })).body, { revoked: "Morgan", key: false, invite: true });
  assert.equal((await callJson("POST", "/v1/join", { body: { code: second.code } })).body.error, "invite_closed");
  assert.deepEqual((await callJson("GET", "/v1/team", { key: admin })).body.invites, []);
  assert.equal((await callJson("DELETE", "/v1/team/keys/Morgan", { key: admin })).status, 404);

  const late = (await invite(admin, { label: "Late" })).body;
  await sql("UPDATE invites SET expires_at = ? WHERE label = 'Late'", Date.now() - 1000).run();
  assert.match((await callJson("POST", "/v1/join", { body: { code: late.code } })).body.message, /^This invite expired .+ Ask Dana for a new one\.$/);

  assert.equal((await invite(admin, { label: "Riley" })).body.error, "label_in_use");
  assert.equal((await call("POST", "/v1/team/invites", { key: member, body: { label: "Nope" } })).status, 403);
  assert.equal((await invite(admin, { label: "Nope", email: "not-an-address" })).body.error, "invalid_email");
  assert.equal((await invite(admin, { label: "Nope", role: "owner" })).status, 400);
});

test("an emailed invite goes through Resend once, escapes the names, and keeps to the daily caps", async () => {
  const sender = (await callJson("POST", "/v1/team/keys", { key: admin, body: { label: "<b>Ana</b>\u001b[31m\u202e\u200b", role: "admin" } })).body.key;
  resend.requests.length = 0;
  const created = await invite(sender, { label: "Quinn", email: " quinn@example.com " });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.email, { address: "quinn@example.com", sent: true });
  assert.equal(resend.requests.length, 1);
  const { authorization, body: sent } = resend.requests[0];
  assert.equal(authorization, "Bearer re_test_key");
  assert.equal(sent.from, "Simply VRM <invites@example.com>");
  assert.deepEqual(sent.to, ["quinn@example.com"]);
  // The team name stays out of the subject; names lose control, zero-width and direction characters.
  assert.equal(sent.subject, "<b>Ana</b> [31m invited you to Guesty CLI");
  assert.ok(sent.html.includes("&#60;b&#62;Ana&#60;/b&#62; [31m invited you to the Acme team"));
  assert.doesNotMatch(sent.html, /<b>Ana/);
  assert.doesNotMatch(sent.subject + sent.html + sent.text, /[\u001b\u202e\u200b]/);
  assert.ok(sent.text.includes(`guesty-cli.tgz && ${created.body.join_command}`));
  assert.ok(sent.html.includes(`href="${created.body.link}"`));
  assert.match(sent.text, /works once and expires (Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M P[DS]T\./);
  const page = await (await call("GET", `/join/${created.body.code}`)).text();
  assert.ok(page.includes("&#60;b&#62;Ana&#60;/b&#62;"));
  assert.doesNotMatch(page, /<b>Ana/);
  assert.equal((await callJson("GET", "/v1/team", { key: admin })).body.invites.find(({ label }) => label === "Quinn").email, "quinn@example.com");

  // Three emails a day per address, whatever its case or plus tag.
  assert.equal((await invite(admin, { label: "Quinn 2", email: "QUINN+cli@example.com" })).body.email.sent, true);
  assert.equal((await invite(admin, { label: "Quinn 3", email: "quinn+other@example.com" })).body.email.sent, true);
  const capped = await invite(admin, { label: "Quinn 4", email: "quinn@example.com" });
  assert.equal(capped.status, 201);
  assert.deepEqual(capped.body.email, { address: "quinn@example.com", sent: false, message: "That address got 3 invite emails in the last 24 hours, the most allowed." });
  assert.equal(resend.requests.length, 3);

  // A failed send is reported; the invite and its link still work.
  resend.replies.push({ status: 500 });
  const failed = await invite(admin, { label: "Avery", email: "avery@example.com" });
  assert.deepEqual(failed.body.email, { address: "avery@example.com", sent: false, message: "The email service didn't accept the message." });
  assert.equal((await call("GET", `/join/${failed.body.code}`)).status, 200);
  assert.equal(resend.requests.length, 4);

  // Twenty emails a day per team, failed sends included.
  const teamId = (await callJson("GET", "/v1/team", { key: admin })).body.team.id;
  const { fingerprint } = await sql("SELECT fingerprint FROM credentials WHERE team_id = ? AND token_type = 'openapi'", teamId).first();
  assert.equal((await sql("SELECT COUNT(*) AS n FROM invite_emails WHERE sender = ?", fingerprint).first()).n, 4);
  for (let n = 0; n < 16; n += 1) await sql("INSERT INTO invite_emails (sender, address, sent_at) VALUES (?, ?, ?)", fingerprint, `earlier-${n}`, Date.now()).run();
  assert.equal((await invite(admin, { label: "Blair", email: "blair@example.com" })).body.email.message, "This team emailed 20 invites in the last 24 hours, the most allowed.");
  await sql("DELETE FROM invite_emails WHERE address LIKE 'earlier-%'").run();
  assert.equal(resend.requests.length, 4);

  // Only a pending invite keeps its address, and the email records hold none.
  assert.equal((await callJson("POST", "/v1/join", { body: { code: created.body.code } })).status, 201);
  const rows = (await sql("SELECT label, email FROM invites WHERE label IN ('Quinn', 'Quinn 2', 'Quinn 4', 'Avery') ORDER BY label").all()).results;
  assert.deepEqual(rows.map(({ label, email }) => [label, email]), [["Avery", null], ["Quinn", null], ["Quinn 2", "QUINN+cli@example.com"], ["Quinn 4", null]]);
  assert.doesNotMatch(JSON.stringify((await sql("SELECT * FROM invite_emails").all()).results), /quinn|avery|example/i);
});

test("email caps hold for requests sent together and after the team is deleted and recreated", async () => {
  const first = await createTeam("caps");
  const before = resend.requests.length;
  // Gmail ignores dots and plus tags, so these are all one inbox.
  const addresses = ["r.iver@gmail.com", "river+a@gmail.com", "RIVER@googlemail.com", "ri.ver+b@gmail.com", "river@gmail.com", "riv.er@gmail.com"];
  const results = await Promise.all(addresses.map((email, n) => invite(first.body.admin_key, { label: `River ${n}`, email })));
  assert.equal(results.filter(({ body }) => body.email.sent).length, 3);
  assert.equal(resend.requests.length - before, 3);

  // The history is keyed by the team's Guesty client, so it outlives the team.
  assert.equal((await call("DELETE", "/v1/team", { key: first.body.admin_key })).status, 200);
  const again = await createTeam("caps");
  assert.equal(again.status, 201);
  const { fingerprint } = await sql("SELECT fingerprint FROM credentials WHERE team_id = ?", again.body.team.id).first();
  assert.equal((await sql("SELECT COUNT(*) AS n FROM invite_emails WHERE sender = ?", fingerprint).first()).n, 3);
  for (let n = 0; n < 17; n += 1) await sql("INSERT INTO invite_emails (sender, address, sent_at) VALUES (?, ?, ?)", fingerprint, `earlier-${n}`, Date.now()).run();
  assert.equal((await invite(again.body.admin_key, { label: "Sky", email: "sky@example.com" })).body.email.message, "This team emailed 20 invites in the last 24 hours, the most allowed.");
  await sql("DELETE FROM invite_emails WHERE address LIKE 'earlier-%'").run();

  // And the whole service sends at most 200 a day.
  const { n: sentToday } = await sql("SELECT COUNT(*) AS n FROM invite_emails WHERE sent_at > ?", Date.now() - 86400_000).first();
  for (let n = sentToday; n < 200; n += 1) await sql("INSERT INTO invite_emails (sender, address, sent_at) VALUES (?, ?, ?)", `elsewhere-${n}`, `elsewhere-${n}`, Date.now()).run();
  assert.equal((await invite(again.body.admin_key, { label: "Wren", email: "wren@example.com" })).body.email.message, "This token service sent as many invite emails today as it allows.");
  await sql("DELETE FROM invite_emails WHERE sender LIKE 'elsewhere-%'").run();
});

test("revoking a key cancels the invites it created", async () => {
  const temporary = (await callJson("POST", "/v1/team/keys", { key: admin, body: { label: "Temp admin", role: "admin" } })).body.key;
  const left = (await invite(temporary, { label: "Left behind", role: "admin" })).body;
  assert.deepEqual((await callJson("DELETE", "/v1/team/keys/Temp%20admin", { key: admin })).body, { revoked: "Temp admin", key: true, invite: false });
  assert.match((await callJson("POST", "/v1/join", { body: { code: left.code } })).body.message, /was cancelled/);
});

test("a service without a mail key still creates invite links and says email isn't set up", async () => {
  const plain = new Miniflare({
    modules: true,
    scriptPath: join(root, "dist/index.js"),
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "guesty-token-service-no-mail" },
    bindings: { CREDENTIALS_KEY: serviceKey() },
    outboundService: outbound,
    host: "127.0.0.1",
    port: 0,
  });
  try {
    const origin = (await plain.ready).origin;
    await migrate(await plain.getD1Database("DB"));
    const post = async (path, body, key) => (await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify(body),
    })).json();
    const team = await post("/v1/teams", { name: "No Mail", credentials: { openapi: credentials("no-mail") } });
    const before = resend.requests.length;
    const created = await post("/v1/team/invites", { label: "Sky", email: "sky@example.com" }, team.admin_key);
    assert.deepEqual(created.email, { address: "sky@example.com", sent: false, message: "This token service isn't set up to send email." });
    assert.match(created.link, /\/join\/[0-9A-Z-]{14}$/);
    assert.equal(resend.requests.length, before);
  } finally {
    await plain.dispose();
  }
});

test("wrong invite codes are limited per address, and an unknown link reflects nothing back", async () => {
  await sql("DELETE FROM join_failures").run();
  // Requests sent together can't get past the limit either.
  const burst = await Promise.all(Array.from({ length: 30 }, () => call("POST", "/v1/join", { body: { code: "AAAA-AAAA-AAAA" } })));
  assert.ok(burst.filter(({ status }) => status === 404).length <= 10);
  assert.ok(burst.some(({ status }) => status === 429));
  await sql("DELETE FROM join_failures").run();

  for (let n = 0; n < 9; n += 1) assert.equal((await callJson("POST", "/v1/join", { body: { code: "AAAA-AAAA-AAAA" } })).body.error, "invite_not_found");
  const unknown = await call("GET", "/join/%3Cscript%3Ealert(1)%3C%2Fscript%3E");
  assert.equal(unknown.status, 404);
  assert.doesNotMatch(await unknown.text(), /alert|<script/);

  const real = (await invite(admin, { label: "Rowan" })).body;
  const blocked = await callJson("POST", "/v1/join", { body: { code: real.code } });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error, "too_many_attempts");
  assert.equal((await call("GET", `/join/${real.code}`)).status, 429);
  await sql("DELETE FROM join_failures").run();
  assert.equal((await callJson("POST", "/v1/join", { body: { code: real.code } })).status, 201);

  // An IPv6 /64 counts as one address.
  const from = (ip) => ({ "CF-Connecting-IP": ip });
  for (let n = 1; n <= 10; n += 1) await call("POST", "/v1/join", { body: { code: "AAAA-AAAA-AAAA" }, headers: from(`2001:db8:1:2::${n}`) });
  const next = (await invite(admin, { label: "Ash" })).body;
  assert.equal((await call("POST", "/v1/join", { body: { code: next.code }, headers: from("2001:0db8:0001:0002:ffff::9") })).status, 429);
  assert.equal((await call("POST", "/v1/join", { body: { code: next.code }, headers: from("2001:db8:1:3::1") })).status, 201);
  await sql("DELETE FROM join_failures").run();
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
