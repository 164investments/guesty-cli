// The Rust-binary replacement for test/fixtures/isolated-runner.mjs: the same
// scenario options and the same safety assertions on every run.
import assert from "node:assert/strict";
import { now, root } from "./cli.mjs";
import { runIsolatedScenario } from "./scenarios.mjs";

export { now, root };

export async function run(t, { args = [], scenario = {}, stdin, tty } = {}) {
  const result = await runIsolatedScenario(t, { args, scenario, stdin, tty });
  const { trace } = result;
  assert.ok(trace.requests.every(({ url }) => !/oauth/i.test(new URL(url).pathname)), "no OAuth requests");
  assert.ok(trace.writes.every(({ path }) => !path.endsWith("/token.json") && !path.endsWith("/.env")), "no token or credential file writes");
  assert.doesNotMatch(result.stdout + result.stderr, /fake-isolated-(?:openapi-token|cache-key|network-secret)/);
  return result;
}
