// The Rust-binary replacement for test/fixtures/reservation-runner.mjs (which
// test/cli-contract.test.mjs still uses with the Node CLI): the same replies,
// the same recorded resource requests and the same safety assertions.
import assert from "node:assert/strict";
import { runReservationScenario } from "./scenarios.mjs";

export async function run(t, args, { replies, stdin = "" } = {}) {
  const result = await runReservationScenario(t, args, { replies, stdin });
  assert.deepEqual(result.auth.writes, []);
  assert.ok(result.auth.requests.every(({ url, method }) => {
    const request = new URL(url);
    return method === "GET" && request.hostname === "cache.invalid" &&
      request.pathname === "/rest/v1/guesty_tokens" && request.searchParams.get("token_type") === "eq.openapi";
  }), "authentication may only read the fake Open API cache");
  assert.doesNotMatch(result.stdout + result.stderr, /fake-resource-token|fake-client-secret|fake-cache-key/);
  return result;
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
