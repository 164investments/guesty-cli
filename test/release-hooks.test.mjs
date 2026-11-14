import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { binary as hooksBinary, root } from "./harness/cli.mjs";

// A build without the test-hooks feature (what ships) must ignore every
// GUESTY_TEST_* variable: requests go to their real hosts, the clock is real,
// and nothing is traced. Nothing is contacted: the shared cache is
// https://cache.invalid, a name that never resolves (RFC 6761).
const releaseBinary = resolve(process.env.GUESTY_CLI_RELEASE_BIN ?? join(root, "target/no-test-hooks/debug/guesty"));

async function run(t, binary, args) {
  const directory = mkdtempSync(join(tmpdir(), "guesty-release-hooks-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const home = join(directory, "home");
  mkdirSync(join(home, ".guesty-cli"), { recursive: true });
  // Valid by the real clock (until 2033), expired by the fake one (2096).
  writeFileSync(join(home, ".guesty-cli/token.json"), JSON.stringify({ token: { token_type: "openapi", access_token: "fake-release-openapi-token", expires_at: 2_000_000_000_000 } }));
  const requests = [];
  const server = createServer((req, res) => { requests.push(req.url); res.writeHead(200, { "content-type": "application/json" }); res.end("[]"); });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const trace = join(directory, "trace.jsonl");
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(GUESTY_|SUPABASE_|NODE_OPTIONS$)/.test(k)));
  Object.assign(env, {
    HOME: home,
    SUPABASE_URL: "https://cache.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fake-release-cache-key",
    GUESTY_TEST_REDIRECT: `http://127.0.0.1:${server.address().port}`,
    GUESTY_TEST_NOW: "4000000000000",
    GUESTY_TEST_FAST_SLEEP: "1",
    GUESTY_TEST_TRACE: trace,
    GUESTY_TEST_TTY: "1",
    GUESTY_TEST_VERSION: "0.0.1",
  });
  const result = await new Promise((ok, fail) => {
    const child = spawn(binary, args, { cwd: directory, env, stdio: ["ignore", "pipe", "pipe"] });
    const out = [], err = [];
    child.stdout.on("data", (c) => out.push(c));
    child.stderr.on("data", (c) => err.push(c));
    child.on("error", fail);
    child.on("close", (status) => ok({ status, stdout: Buffer.concat(out).toString(), stderr: Buffer.concat(err).toString() }));
  });
  await new Promise((ok) => server.close(ok));
  return { ...result, requests, traced: existsSync(trace) };
}

test("a build without test hooks ignores GUESTY_TEST_REDIRECT, GUESTY_TEST_NOW and GUESTY_TEST_TRACE", { skip: !existsSync(releaseBinary) && `build it first: cargo build --target-dir target/no-test-hooks` }, async (t) => {
  const cached = await run(t, releaseBinary, ["token"]);
  assert.equal(cached.status, 0, cached.stderr);
  assert.equal(cached.stdout, "fake-release-openapi-token\n", "the real clock, not GUESTY_TEST_NOW, decides expiry");
  assert.equal(cached.traced, false, "no trace file");

  const shared = await run(t, releaseBinary, ["token", "--beapi"]);
  assert.equal(shared.status, 1);
  assert.match(shared.stderr, /the shared-cache request could not complete/);
  assert.deepEqual(shared.requests, [], "the request went to cache.invalid, not the local mock");
  assert.equal(shared.traced, false);
});

test("the same run with test hooks reaches the mock, so the check above can fail", async (t) => {
  const shared = await run(t, hooksBinary, ["token", "--beapi"]);
  assert.equal(shared.status, 1);
  assert.equal(shared.requests.length, 1);
  assert.equal(shared.traced, true);
  const cached = await run(t, hooksBinary, ["token"]);
  assert.notEqual(cached.stdout, "fake-release-openapi-token\n", "GUESTY_TEST_NOW makes the disk token expired");
});
