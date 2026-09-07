import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

export function run(t, args, { replies, stdin = "" } = {}) {
  const temporary = mkdtempSync(join(tmpdir(), "guesty-reservation-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const tracePath = join(temporary, "auth-trace.json");
  const resourceTracePath = join(temporary, "resource-trace.json");
  const result = spawnSync(process.execPath, [
    "--import", join(root, "test/fixtures/reservation-runtime.mjs"),
    join(root, "dist/cli.js"), ...args,
  ], {
    cwd: root,
    encoding: "utf8",
    input: stdin,
    timeout: 10_000,
    env: {
      ...process.env,
      GUESTY_CLI_TEST_SCENARIO: JSON.stringify({
        shared: [{ token_type: "openapi", access_token: "fake-resource-token", expires_at: 1_800_003_600_000 }],
        resourceReplies: replies,
      }),
      GUESTY_CLI_TEST_TRACE: tracePath,
      GUESTY_CLI_RESOURCE_TRACE: resourceTracePath,
    },
  });
  assert.ifError(result.error);
  const auth = JSON.parse(readFileSync(tracePath, "utf8"));
  assert.deepEqual(auth.writes, []);
  assert.ok(auth.requests.every(({ url, method }) => {
    const request = new URL(url);
    return method === "GET" && request.hostname === "cache.invalid" &&
      request.pathname === "/rest/v1/guesty_tokens" && request.searchParams.get("token_type") === "eq.openapi";
  }), "authentication may only read the fake Open API cache");
  assert.doesNotMatch(result.stdout + result.stderr, /fake-resource-token|fake-client-secret|fake-cache-key/);
  return { ...result, auth, requests: JSON.parse(readFileSync(resourceTracePath, "utf8")) };
}

export function request(method, path, { query = {}, body = null } = {}) {
  return { method, path, query, body, contentType: body === null ? null : "application/json" };
}

export function rejectsWithoutRequest(result, pattern) {
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, pattern);
  assert.deepEqual(result.requests, []);
  assert.deepEqual(result.auth.requests, []);
}
