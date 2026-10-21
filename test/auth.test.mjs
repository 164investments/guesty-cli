import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const now = 1_800_000_000_000;
const validToken = (tokenType = "openapi", overrides = {}) => ({
  token_type: tokenType,
  access_token: `fake-${tokenType}-token`,
  expires_at: now + 3_600_000,
  ...overrides,
});

function run(t, args, scenario = {}, script) {
  const temporary = mkdtempSync(join(tmpdir(), "guesty-cache-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const tracePath = join(temporary, "trace.json");
  const result = spawnSync(process.execPath, [
    "--import", join(root, "test/fixtures/mock-runtime.mjs"),
    ...(script ? ["--input-type=module", "-e", script] : [join(root, "dist/cli.js"), ...args]),
  ], {
    cwd: root,
    encoding: "utf8",
    timeout: 10_000,
    env: {
      ...process.env,
      GUESTY_CLI_TEST_SCENARIO: JSON.stringify(scenario),
      GUESTY_CLI_TEST_TRACE: tracePath,
    },
  });
  assert.ifError(result.error);
  const trace = JSON.parse(readFileSync(tracePath, "utf8"));
  assert.deepEqual(trace.writes, [], "no cache or configuration may be mutated");
  assert.ok(trace.requests.every(({ url, method }) => {
    const request = new URL(url);
    if (request.pathname === "/rest/v1/rpc/guesty_cli_token") return method === "POST";
    return method === "GET" && (
      (request.hostname === "cache.invalid" && request.pathname === "/rest/v1/guesty_tokens") ||
      (request.hostname === "open-api.guesty.com" && request.pathname === "/v1/listings")
    );
  }), "every network call must be a permitted read; no OAuth request may occur");
  assert.doesNotMatch(result.stdout + result.stderr, /fake-client-secret|fake-cache-key|fake-team-api-key|fake-team-access-key|fake-secret-in/);
  return { ...result, trace };
}

for (const tokenType of ["openapi", "beapi"]) {
  const args = ["token", ...(tokenType === "beapi" ? ["--beapi"] : [])];

  test(`${tokenType}: valid shared token includes scope and expiry`, (t) => {
    const token = validToken(tokenType);
    const result = run(t, [...args, "--json"], { shared: [token] });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), token);
    assert.equal(result.trace.requests.length, 1);
    const request = result.trace.requests[0];
    assert.equal(new URL(request.url).searchParams.get("token_type"), `eq.${tokenType}`);
    assert.equal(new URL(request.url).searchParams.get("select"), "access_token,expires_at,token_type");
    assert.equal(request.timeout, true);
    if (tokenType === "beapi") assert.equal(result.trace.tokenReads, 0);
  });

  test(`${tokenType}: bare output remains script-compatible`, (t) => {
    const result = run(t, args, { shared: [validToken(tokenType)] });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `fake-${tokenType}-token\n`);
  });

  const failures = {
    missing: [],
    expired: [validToken(tokenType, { expires_at: now - 1 })],
    "at expiry buffer": [validToken(tokenType, { expires_at: now + 300_000 })],
    "wrong type": [validToken(tokenType === "openapi" ? "beapi" : "openapi")],
    "missing type": [{ access_token: "fake-untyped", expires_at: now + 3_600_000 }],
    "empty token": [validToken(tokenType, { access_token: "" })],
    "non-string token": [validToken(tokenType, { access_token: 42 })],
    "whitespace token": [validToken(tokenType, { access_token: "fake\nsecret" })],
    "missing expiry": [{ token_type: tokenType, access_token: "fake-token" }],
    "non-numeric expiry": [validToken(tokenType, { expires_at: "2035-01-01T00:00:00Z" })],
    "non-array response": { token: validToken(tokenType) },
  };
  for (const [name, shared] of Object.entries(failures)) {
    test(`${tokenType}: ${name} fails without OAuth or cache writes`, (t) => {
      const result = run(t, args, { shared });
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, new RegExp(`No valid cached Guesty ${tokenType} token`));
      assert.match(result.stderr, /designated server refresh workflow/);
      assert.equal(result.trace.requests.length, 1);
    });
  }

  for (const [name, scenario] of Object.entries({
    "missing configuration": { noConfig: true },
    "cache unavailable": { sharedError: true },
    "cache HTTP failure": { sharedStatus: 503, shared: { error: "fake-secret-in-cache-error" } },
    "cache malformed JSON": { sharedRaw: "fake-secret-in-malformed-response" },
    "non-finite expiry": { sharedRaw: `[{"token_type":"${tokenType}","access_token":"fake-token","expires_at":1e400}]` },
  })) {
    test(`${tokenType}: ${name} fails safely even with OAuth credentials set`, (t) => {
      const result = run(t, args, scenario);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /CLI authentication is read-only/);
      assert.equal(result.trace.requests.length, scenario.noConfig ? 0 : 1);
    });
  }
}

test("valid typed local Open API cache works offline and exposes only token metadata", (t) => {
  const token = validToken();
  const result = run(t, ["token", "--json"], {
    noConfig: true,
    disk: { token: { ...token, secret: "fake-secret-in-unexpected-metadata" } },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), token);
  assert.equal(result.trace.requests.length, 0);
});

for (const [name, scenario] of Object.entries({
  "legacy untyped local token": { disk: { token: { access_token: "fake-legacy-token", expires_at: now + 3_600_000 } } },
  "wrong-type local token": { disk: { token: validToken("beapi") } },
  "expired local token": { disk: { token: validToken("openapi", { expires_at: now }) } },
  "malformed local JSON": { diskRaw: "invalid-json" },
  "unreadable local cache": { diskError: true },
})) {
  test(`${name} falls back to the correctly scoped shared cache`, (t) => {
    const result = run(t, ["token"], { ...scenario, shared: [validToken()] });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "fake-openapi-token\n");
    assert.equal(result.trace.requests.length, 1);
  });
  test(`${name} cannot bypass an unavailable shared cache`, (t) => {
    const result = run(t, ["token"], { ...scenario, noConfig: true });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.trace.requests.length, 0);
  });
}

test("BEAPI never falls back to the Open API disk cache", (t) => {
  const result = run(t, ["token", "--beapi"], { disk: { token: validToken() }, shared: [] });
  assert.equal(result.status, 1);
  assert.equal(result.trace.tokenReads, 0);
});

test("in-memory cache keeps API scopes separate and caller mutation cannot corrupt it", (t) => {
  const result = run(t, [], { sharedReplies: [[validToken()], [validToken("beapi")]] }, `
    import assert from "node:assert/strict";
    import { getCachedToken, getToken } from "./dist/auth.js";
    const first = await getCachedToken("openapi");
    first.access_token = "caller-mutated-token";
    assert.equal(await getToken(), "fake-openapi-token");
    assert.equal((await getCachedToken("beapi")).access_token, "fake-beapi-token");
    assert.equal(await getToken(), "fake-openapi-token");
  `);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.trace.requests.length, 2);
});

test("named API command stops on cache failure before contacting Guesty", (t) => {
  const result = run(t, ["ls", "list", "--limit", "1"], { sharedError: true });
  assert.equal(result.status, 1);
  assert.equal(result.trace.requests.length, 1);
});

test("401 retries once with a different cached token without mutating caches", (t) => {
  const result = run(t, ["raw", "GET", "/v1/listings"], {
    disk: { token: validToken() },
    shared: [validToken("openapi", { access_token: "fake-new-openapi-token" })],
    apiStatuses: [401, 200],
  });
  assert.equal(result.status, 0, result.stderr);
  const apiCalls = result.trace.requests.filter(({ url }) => new URL(url).hostname === "open-api.guesty.com");
  assert.deepEqual(apiCalls.map(({ authorization }) => authorization), ["Bearer fake-openapi-token", "Bearer fake-new-openapi-token"]);
  assert.equal(result.trace.requests.length, 3);
});

test("401 cannot reuse the rejected shared token or mint a replacement", (t) => {
  const result = run(t, ["raw", "GET", "/v1/listings"], {
    shared: [validToken()],
    apiStatuses: [401],
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No valid cached Guesty openapi token/);
  assert.equal(result.trace.requests.length, 3);
});

test("a second 401 stops with a sanitized error and no further retry", (t) => {
  const result = run(t, ["raw", "GET", "/v1/listings"], {
    sharedReplies: [[validToken()], [validToken("openapi", { access_token: "fake-new-openapi-token" })]],
    apiStatuses: [401, 401],
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CLI cannot refresh it/);
  assert.equal(result.trace.requests.length, 4);
});

for (const path of ["/oauth2/token", "/oauth/token", "/v1/../oauth2/token", "/%6fauth2/token", "/v1/%2e%2e%2foauth2/token"]) {
  test(`raw cannot request OAuth through ${path}`, (t) => {
    const result = run(t, ["raw", "POST", path], { disk: { token: validToken() } });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /OAuth endpoints are disabled/);
    assert.equal(result.trace.requests.length, 0);
    assert.equal(result.trace.tokenReads, 0);
  });
}

for (const path of ["https://other.invalid/v1/listings", ".other.invalid/v1/listings", "//other.invalid/v1/listings"]) {
  test(`raw rejects a non-resource path before reading credentials: ${path}`, (t) => {
    const result = run(t, ["raw", "GET", path]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /absolute Guesty Open API resource path/);
    assert.equal(result.trace.requests.length, 0);
    assert.equal(result.trace.tokenReads, 0);
  });
}

for (const args of [["init"], ["init", "--force"]]) {
  test(`${args.join(" ")} only displays cache setup instructions`, (t) => {
    const result = run(t, args);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(result.stdout, /GUESTY_TEAM_CACHE_URL, GUESTY_TEAM_CACHE_API_KEY and GUESTY_TEAM_CACHE_ACCESS_KEY/);
    assert.match(result.stdout, /guesty init --team-sql/);
    assert.doesNotMatch(result.stdout, /Client ID:|Client Secret:/);
    assert.equal(result.trace.requests.length, 0);
    assert.equal(result.trace.tokenReads, 0);
  });
}

for (const header of ["Authorization", "authorization", "AUTHORIZATION"]) {
  test(`raw cannot override cached Open API scope with ${header}`, (t) => {
    const result = run(t, ["raw", "GET", "/v1/listings", "--header", `${header}: Bearer fake-beapi-token`]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /custom Authorization headers are not supported/);
    assert.equal(result.trace.requests.length, 0);
    assert.equal(result.trace.tokenReads, 0);
  });
}

test("init --team-sql prints the packaged team-cache setup SQL", (t) => {
  const result = run(t, ["init", "--team-sql"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, readFileSync(join(root, "sql/team-token-cache.sql"), "utf8"));
  assert.equal(result.trace.requests.length, 0);
  assert.equal(result.trace.tokenReads, 0);
});

for (const tokenType of ["openapi", "beapi"]) {
  const args = ["token", ...(tokenType === "beapi" ? ["--beapi"] : [])];

  test(`team ${tokenType}: the access key reads the shared token instead of SUPABASE_URL`, (t) => {
    const token = validToken(tokenType);
    const result = run(t, [...args, "--json"], { team: true, teamRows: [token], shared: [validToken(tokenType, { access_token: "fake-wrong-project-token" })] });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), token);
    assert.equal(result.trace.requests.length, 1);
    const [request] = result.trace.requests;
    assert.equal(request.url, "https://team-cache.invalid/rest/v1/rpc/guesty_cli_token");
    assert.deepEqual(request.body, { p_access_key: "fake-team-access-key-must-not-be-printed", p_token_type: tokenType });
    assert.equal(request.apikey, "fake-team-api-key-must-not-be-printed");
    assert.equal(request.authorization, undefined);
    assert.equal(request.timeout, true);
  });

  for (const [name, scenario, reason] of [
    ["rejected access key", { teamStatus: 403, teamRows: { message: "fake-secret-in-team-error" } }, /team cache rejected the access key or API key \(HTTP 403\)/],
    ["no unexpired token", { teamRows: [] }, /team cache has no unexpired token/],
    ["server error", { teamStatus: 500 }, /team cache returned HTTP 500/],
    ["network error", { teamError: true }, /team cache request could not complete/],
    ["malformed JSON", { teamRaw: "fake-secret-in-team-response" }, /team cache returned invalid JSON/],
    ["wrong type", { teamRows: [validToken(tokenType === "openapi" ? "beapi" : "openapi")] }, /cached row is missing, expired/],
    ["at expiry buffer", { teamRows: [validToken(tokenType, { expires_at: now + 300_000 })] }, /cached row is missing, expired/],
  ]) {
    test(`team ${tokenType}: ${name} fails with the team admin's next step`, (t) => {
      const result = run(t, args, { team: true, ...scenario });
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, new RegExp(`No valid cached Guesty ${tokenType} token`));
      assert.match(result.stderr, reason);
      assert.match(result.stderr, /CLI authentication is read-only/);
      assert.match(result.stderr, new RegExp(`guesty_cli\\.status.*guesty_cli\\.refresh_token\\('${tokenType}', true\\)`));
      assert.equal(result.trace.requests.length, 1);
    });
  }
}

for (const [name, teamEnv, reason] of [
  ["missing access key", { GUESTY_TEAM_CACHE_ACCESS_KEY: null }, /team-cache configuration is incomplete/],
  ["missing API key", { GUESTY_TEAM_CACHE_API_KEY: null }, /team-cache configuration is incomplete/],
  ["plain-HTTP remote URL", { GUESTY_TEAM_CACHE_URL: "http://team-cache.invalid" }, /GUESTY_TEAM_CACHE_URL must use https/],
  ["invalid URL", { GUESTY_TEAM_CACHE_URL: "team-cache.invalid" }, /GUESTY_TEAM_CACHE_URL is not a valid URL/],
]) {
  test(`team cache with ${name} sends nothing and never falls back to SUPABASE_URL`, (t) => {
    const result = run(t, ["token"], { team: true, teamEnv, shared: [validToken()] });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, reason);
    assert.equal(result.trace.requests.length, 0);
  });
}

test("team cache on this machine may use plain HTTP for local development", (t) => {
  const result = run(t, ["token"], { team: true, teamEnv: { GUESTY_TEAM_CACHE_URL: "http://127.0.0.1:54321/" }, teamRows: [validToken()] });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "fake-openapi-token\n");
  assert.equal(result.trace.requests[0].url, "http://127.0.0.1:54321/rest/v1/rpc/guesty_cli_token");
});

test("team cache: a 401 retries once with a newer shared token", (t) => {
  const result = run(t, ["raw", "GET", "/v1/listings"], {
    team: true,
    teamReplies: [[validToken()], [validToken("openapi", { access_token: "fake-new-openapi-token" })]],
    apiStatuses: [401, 200],
  });
  assert.equal(result.status, 0, result.stderr);
  const apiCalls = result.trace.requests.filter(({ url }) => new URL(url).hostname === "open-api.guesty.com");
  assert.deepEqual(apiCalls.map(({ authorization }) => authorization), ["Bearer fake-openapi-token", "Bearer fake-new-openapi-token"]);
});

test("team cache: a rejected token cannot be reused and points to the admin's replacement command", (t) => {
  const result = run(t, ["raw", "GET", "/v1/listings"], { team: true, teamRows: [validToken()], apiStatuses: [401] });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /No valid cached Guesty openapi token/);
  assert.match(result.stderr, /guesty_cli\.refresh_token\('openapi', true\)/);
  assert.equal(result.trace.requests.length, 3);
});
