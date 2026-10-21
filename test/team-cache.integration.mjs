// Verifies sql/team-token-cache.sql against a local Supabase stack and a mock
// Guesty OAuth server. It never contacts Guesty. It resets the team-cache
// tables, so it only runs against a database on this machine.
//
//   supabase start
//   TEAM_CACHE_API_KEY=<local publishable or anon key> npm run test:team-cache
//
// Optional: TEAM_CACHE_DB_URL, TEAM_CACHE_API_URL, TEAM_CACHE_MOCK_HOST (the
// address the database container uses to reach this machine).
import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dbUrl = process.env.TEAM_CACHE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const apiUrl = process.env.TEAM_CACHE_API_URL ?? "http://127.0.0.1:54321";
const apiKey = process.env.TEAM_CACHE_API_KEY;
const mockHost = process.env.TEAM_CACHE_MOCK_HOST ?? "host.docker.internal";
const clientId = "fake-team-client-id";
const clientSecret = "fake-team-client-secret";

for (const url of [dbUrl, apiUrl]) {
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
    throw new Error(`Refusing to reset a non-local database or API: ${new URL(url).hostname}`);
  }
}
if (!apiKey) throw new Error("Set TEAM_CACHE_API_KEY to the local stack's publishable or anon key.");

const oauth = { requests: [], replies: [] };
let mockPort;
let home;
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    oauth.requests.push({ method: req.method, path: req.url, contentType: req.headers["content-type"], form: Object.fromEntries(new URLSearchParams(body)) });
    const reply = oauth.replies.shift() ?? { status: 200 };
    setTimeout(() => {
      if (reply.hangUp) return req.socket.destroy();
      const n = oauth.requests.length;
      res.writeHead(reply.status, { "Content-Type": "application/json" });
      res.end(reply.raw ?? JSON.stringify(reply.status === 200
        ? { token_type: "Bearer", expires_in: 86400, access_token: `mock-token-${n}`, scope: "open-api" }
        : { error: "mock failure" }));
    }, reply.delayMs ?? 0);
  });
});

// Every call is asynchronous: the mock OAuth server shares this process and
// cannot answer the database while a synchronous child process blocks it.
function sql(query) {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-qAt", "-c", query]);
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { err += chunk; });
    child.on("close", (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(`psql exited ${code}: ${err}`))));
  });
}

function rpc(accessKey, tokenType = "openapi") {
  return fetch(`${apiUrl}/rest/v1/rpc/guesty_cli_token`, {
    method: "POST",
    headers: { apikey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_access_key: accessKey, p_token_type: tokenType }),
  });
}

function cli(args, accessKey) {
  const env = { ...process.env, HOME: home, GUESTY_TEAM_CACHE_URL: apiUrl, GUESTY_TEAM_CACHE_API_KEY: apiKey, GUESTY_TEAM_CACHE_ACCESS_KEY: accessKey };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(root, "dist/cli.js"), ...args], { cwd: home, env, timeout: 20_000 });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

function setVaultSecret(name, value) {
  return sql(`select vault.create_secret('${value}', '${name}')`);
}

async function requestLog(tokenType = "openapi") {
  return sql(`select coalesce(json_agg(json_build_object('succeeded', succeeded, 'http_status', http_status, 'detail', detail) order by id), '[]') from guesty_cli.token_requests where token_type = '${tokenType}'`);
}

// Moves the request history back so the next test starts outside the pause.
function ageRequests(interval) {
  return sql(`update guesty_cli.token_requests set requested_at = requested_at - interval '${interval}'`);
}

before(async () => {
  await new Promise((resolve) => server.listen(0, "0.0.0.0", resolve));
  mockPort = server.address().port;
  home = mkdtempSync(join(tmpdir(), "guesty-team-cache-home-"));
  execFileSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-q", "-f", join(root, "sql/team-token-cache.sql")], { stdio: "ignore" });
  await sql(`
    delete from guesty_cli.tokens;
    delete from guesty_cli.token_requests;
    delete from guesty_cli.access_keys;
    delete from vault.secrets where name like 'guesty\\_%';
    update guesty_cli.token_endpoints set token_url = 'http://${mockHost}:${mockPort}/' || token_type || '/oauth2/token';
  `);
});

after(() => {
  server.close();
  if (home) rmSync(home, { recursive: true, force: true });
});

test("an unconfigured cache makes no token request", async () => {
  assert.equal(await sql("select count(*) from guesty_cli.refresh_due_tokens()"), "0");
  assert.match(await sql("select guesty_cli.refresh_token('openapi')"), /^not configured/);
  assert.equal(oauth.requests.length, 0);
});

test("the first refresh requests one token with trimmed credentials", async () => {
  await setVaultSecret("guesty_openapi_client_id", clientId);
  await setVaultSecret("guesty_openapi_client_secret", `${clientSecret}\n`);
  assert.equal(await sql("select outcome from guesty_cli.refresh_due_tokens()"), "refreshed");
  assert.equal(oauth.requests.length, 1);
  assert.deepEqual(oauth.requests[0], {
    method: "POST",
    path: "/openapi/oauth2/token",
    contentType: "application/x-www-form-urlencoded",
    form: { grant_type: "client_credentials", scope: "open-api", client_id: clientId, client_secret: clientSecret },
  });
  const hours = Number(await sql("select extract(epoch from expires_at - now()) / 3600 from guesty_cli.tokens"));
  assert.ok(hours > 23.9 && hours <= 24, `token lifetime ${hours}h`);
});

test("a fresh token is reused instead of requesting another", async () => {
  assert.equal(await sql("select outcome from guesty_cli.refresh_due_tokens()"), "fresh");
  assert.equal(oauth.requests.length, 1);
});

test("several members read the same token through the CLI", async () => {
  const alex = await sql("select guesty_cli.create_access_key('Alex')");
  const sam = await sql("select guesty_cli.create_access_key('Sam')");
  assert.match(alex, /^gtc_[0-9a-f]{64}$/);
  const outputs = [];
  for (const key of [alex, sam]) {
    const result = await cli(["token", "--json"], key);
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(key));
    outputs.push(JSON.parse(result.stdout));
  }
  assert.equal(outputs[0].access_token, "mock-token-1");
  assert.deepEqual(outputs[0], outputs[1]);
  assert.equal(outputs[0].token_type, "openapi");
  assert.equal(await sql("select count(*) from guesty_cli.access_keys where last_used_at is not null"), "2");
  assert.equal(oauth.requests.length, 1);
});

test("a wrong or revoked access key gets no token", async () => {
  assert.equal((await rpc("gtc_wrong")).status, 403);
  const key = await sql("select guesty_cli.create_access_key('Leaver')");
  assert.equal((await rpc(key)).status, 200);
  assert.equal(await sql("select guesty_cli.revoke_access_key('Leaver')"), "1");
  assert.equal((await rpc(key)).status, 403);
  const result = await cli(["token"], key);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /team cache rejected the access key or API key \(HTTP 403\)/);
});

test("the public API role cannot reach tables, credentials, or admin functions", async () => {
  for (const table of ["tokens", "access_keys", "token_requests", "settings"]) {
    const res = await fetch(`${apiUrl}/rest/v1/${table}`, { headers: { apikey: apiKey, "Accept-Profile": "guesty_cli" } });
    assert.notEqual(res.status, 200, table);
  }
  for (const fn of ["refresh_token", "create_access_key"]) {
    const res = await fetch(`${apiUrl}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json", "Content-Profile": "guesty_cli" },
      body: JSON.stringify({ p_token_type: "openapi", p_label: "x" }),
    });
    assert.notEqual(res.status, 200, fn);
  }
  const denied = spawnSync("psql", [dbUrl, "-qAt", "-c", "set role anon; select count(*) from guesty_cli.tokens"], { encoding: "utf8" });
  assert.match(denied.stderr, /permission denied/);
  const vault = spawnSync("psql", [dbUrl, "-qAt", "-c", "set role anon; select count(*) from vault.decrypted_secrets"], { encoding: "utf8" });
  assert.match(vault.stderr, /permission denied/);
  assert.equal(oauth.requests.length, 1);
});

test("a failed request is recorded and pauses further requests", async () => {
  oauth.replies.push({ status: 500 });
  assert.equal(await sql("select guesty_cli.refresh_token('openapi', true)"), "Guesty returned HTTP 500");
  assert.match(await sql("select guesty_cli.refresh_token('openapi', true)"), /^waiting/);
  assert.equal(oauth.requests.length, 2);
  assert.deepEqual(JSON.parse(await requestLog()).at(-1), { succeeded: false, http_status: 500, detail: "Guesty did not issue a token" });
});

test("the daily cap stops requests even after the pause", async () => {
  await ageRequests("31 minutes");
  // Two requests so far, so one more fits the default cap of three.
  oauth.replies.push({ status: 200, raw: "not json" });
  assert.match(await sql("select guesty_cli.refresh_token('openapi', true)"), /^unexpected token response/);
  await ageRequests("31 minutes");
  assert.match(await sql("select guesty_cli.refresh_token('openapi', true)"), /^limit reached: 3 token requests/);
  assert.equal(oauth.requests.length, 3);
});

test("a 429 pauses requests for two hours", async () => {
  await ageRequests("25 hours");
  oauth.replies.push({ status: 429 });
  assert.equal(await sql("select guesty_cli.refresh_token('openapi', true)"), "Guesty returned HTTP 429");
  await ageRequests("90 minutes");
  assert.match(await sql("select guesty_cli.refresh_token('openapi', true)"), /^waiting/);
  await ageRequests("31 minutes");
  assert.equal(await sql("select guesty_cli.refresh_token('openapi', true)"), "refreshed");
  assert.equal(oauth.requests.length, 5);
});

test("a slow response within 20 seconds succeeds and a dropped connection is recorded", async () => {
  await ageRequests("25 hours");
  oauth.replies.push({ status: 200, delayMs: 7000 });
  assert.equal(await sql("select guesty_cli.refresh_token('openapi', true)"), "refreshed");
  oauth.replies.push({ hangUp: true });
  assert.match(await sql("select guesty_cli.refresh_token('openapi', true)"), /^request failed/);
  const last = JSON.parse(await requestLog()).at(-1);
  assert.equal(last.succeeded, false);
  assert.match(last.detail, /^request failed: /);
  assert.doesNotMatch(last.detail, new RegExp(clientSecret));
  assert.equal(oauth.requests.length, 7);
});

test("concurrent refreshes of a due token request it only once", async () => {
  await ageRequests("25 hours");
  await sql("update guesty_cli.tokens set expires_at = now() + interval '30 minutes'");
  oauth.replies.push({ status: 200, delayMs: 1500 });
  const outcomes = await Promise.all([1, 2, 3].map(() => sql("select guesty_cli.refresh_token('openapi')")));
  assert.deepEqual(outcomes.sort(), ["fresh", "fresh", "refreshed"]);
  assert.equal(oauth.requests.length, 8);
});

test("the booking engine token uses its own credentials, scope, and endpoint", async () => {
  await setVaultSecret("guesty_beapi_client_id", "fake-beapi-client-id");
  await setVaultSecret("guesty_beapi_client_secret", "fake-beapi-client-secret");
  assert.equal(await sql("select string_agg(token_type || '=' || outcome, ',' order by token_type) from guesty_cli.refresh_due_tokens()"), "beapi=refreshed,openapi=fresh");
  const request = oauth.requests.at(-1);
  assert.equal(request.path, "/beapi/oauth2/token");
  assert.equal(request.form.scope, "booking_engine:api");
  assert.equal(request.form.client_id, "fake-beapi-client-id");
  const key = await sql("select guesty_cli.create_access_key('Booking')");
  const beapi = await cli(["token", "--beapi", "--json"], key);
  assert.equal(beapi.status, 0, beapi.stderr);
  assert.equal(JSON.parse(beapi.stdout).token_type, "beapi");
  const openapi = await cli(["token", "--json"], key);
  assert.equal(JSON.parse(openapi.stdout).token_type, "openapi");
  assert.notEqual(JSON.parse(beapi.stdout).access_token, JSON.parse(openapi.stdout).access_token);
});

test("an expired team token fails in the CLI with the admin's next step", async () => {
  const key = await sql("select guesty_cli.create_access_key('Expired')");
  await sql("update guesty_cli.tokens set expires_at = now() - interval '1 minute' where token_type = 'openapi'");
  const result = await cli(["token"], key);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /team cache has no unexpired token/);
  assert.match(result.stderr, /guesty_cli\.status/);
});

test("the scheduled job runs the refresh as its owner", async () => {
  await ageRequests("25 hours");
  const before = oauth.requests.length;
  await sql("select cron.alter_job((select jobid from cron.job where jobname = 'guesty-cli-refresh-tokens'), schedule => '2 seconds')");
  try {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && await sql("select count(*) from guesty_cli.tokens where token_type = 'openapi' and expires_at > now()") === "0") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } finally {
    await sql("select cron.alter_job((select jobid from cron.job where jobname = 'guesty-cli-refresh-tokens'), schedule => '*/10 * * * *')");
  }
  assert.equal(await sql("select count(*) from guesty_cli.tokens where token_type = 'openapi' and expires_at > now()"), "1");
  assert.equal(oauth.requests.length, before + 1);
  assert.equal(await sql("select schedule from cron.job where jobname = 'guesty-cli-refresh-tokens'"), "*/10 * * * *");
});
