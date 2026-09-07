import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const now = 1_800_000_000_000;
export function run(t, { args = [], script, scenario = {}, stdin, cwd = root } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "guesty-isolated-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const tracePath = join(directory, "trace.json");
  const result = spawnSync(process.execPath, [
    "--import", join(root, "test/fixtures/isolated-runtime.mjs"),
    ...(script ? ["--input-type=module", "-e", script] : [join(root, "dist/cli.js"), ...args]),
  ], {
    cwd, encoding: "utf8", timeout: 15_000, input: stdin,
    env: { ...process.env, GUESTY_ISOLATED_SCENARIO: JSON.stringify(scenario), GUESTY_ISOLATED_TRACE: tracePath },
  });
  assert.ifError(result.error);
  const trace = JSON.parse(readFileSync(tracePath, "utf8"));
  assert.ok(trace.requests.every(({ url }) => !/oauth/i.test(new URL(url).pathname)), "no OAuth requests");
  assert.ok(trace.writes.every(({ path }) => !path.endsWith("/token.json") && !path.endsWith("/.env")), "no token or credential file writes");
  assert.doesNotMatch(result.stdout + result.stderr, /fake-isolated-(?:openapi-token|cache-key|network-secret)/);
  return { ...result, trace };
}
