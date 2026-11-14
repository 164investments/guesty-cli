// Runs the Rust `guesty` (a test-hooks build, or GUESTY_CLI_BIN) against a
// local mock of Guesty, the shared token cache and the team token service.
// The binary sends every request to the mock (GUESTY_TEST_REDIRECT), reads a
// fake token from a temporary HOME, and nothing leaves this machine.
//
// A scenario says what the fakes answer:
//   responses / bookingResponses: Open API / Booking Engine replies, in turn
//   byPath: { "/v1/path": reply }, for calls that run at the same time
//   paginationCount: answer Open API lists with this many records in pages
//   tokenService: { "METHOD /path": reply } for https://tokens.invalid
//   env: variables to set (null removes one); noConfig: no shared cache settings
//   noDisk: no cached token on disk; envFiles: { home, cwd } .env contents
// A reply is { status, json | raw, headers }.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const bin = resolve(process.env.GUESTY_CLI_BIN ?? join(root, "target/debug/guesty"));
export const now = 1_800_000_000_000;
const token = (value = "fake-isolated-openapi-token") => ({ token_type: "openapi", access_token: value, expires_at: now + 36_000_000 });
const beapiToken = (value = "fake-isolated-beapi-token") => ({ token_type: "beapi", access_token: value, expires_at: now + 36_000_000 });

/** Starts the mock. `trace.requests` lists every request it received. */
export async function startMock(scenario = {}) {
  const trace = { requests: [] };
  let apiIndex = 0;
  let bookingIndex = 0;
  const server = createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const origin = req.headers["x-guesty-test-origin"] ?? "http://unknown";
      const url = new URL(`${origin}${req.url}`);
      const headers = { ...req.headers };
      delete headers["x-guesty-test-origin"];
      const body = chunks.length ? Buffer.concat(chunks).toString("utf8") : undefined;
      trace.requests.push({ url: url.href, method: req.method, headers, body });
      let reply;
      if (scenario.byPath?.[url.pathname]) {
        reply = scenario.byPath[url.pathname];
      } else if (url.hostname === "open-api.guesty.com" && url.pathname.startsWith("/v1/")) {
        const replies = scenario.responses ?? [{ json: { results: [] } }];
        reply = replies[Math.min(apiIndex++, replies.length - 1)];
        if (scenario.paginationCount !== undefined) {
          const skip = Number(url.searchParams.get("skip"));
          const limit = Number(url.searchParams.get("limit"));
          const length = Math.min(limit, Math.max(0, scenario.paginationCount - skip));
          reply = { json: { results: Array.from({ length }, (_, index) => ({ _id: String(skip + index) })), count: scenario.paginationCount, skip, limit } };
        }
      } else if (url.hostname === "booking.guesty.com" && url.pathname.startsWith("/api/")) {
        const replies = scenario.bookingResponses ?? [{ json: { ok: true } }];
        reply = replies[Math.min(bookingIndex++, replies.length - 1)];
      } else if (url.hostname === "cache.invalid" && url.pathname === "/rest/v1/guesty_tokens" && req.method === "GET") {
        reply = { json: [url.searchParams.get("token_type") === "eq.beapi" ? beapiToken() : token()] };
      } else if (url.hostname === "tokens.invalid") {
        reply = scenario.tokenService?.[`${req.method} ${url.pathname}`] ?? { status: 404, json: { error: "not_found", message: "Not found." } };
      } else {
        // Any other destination is forbidden: fail like a network error.
        res.destroy();
        return;
      }
      const status = reply.status ?? 200;
      res.writeHead(status, { "content-type": "application/json", ...reply.headers });
      res.end([204, 205, 304].includes(status) ? undefined : "raw" in reply ? reply.raw : JSON.stringify(reply.json ?? {}));
    });
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { url: `http://127.0.0.1:${server.address().port}`, trace, close: () => new Promise((ok) => server.close(ok)) };
}

/**
 * A temporary HOME and project folder set up for a scenario, and the
 * environment to run the binary with.
 */
export function prepare(t, mock, scenario = {}) {
  const directory = mkdtempSync(join(tmpdir(), "guesty-rust-mcp-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const home = join(directory, "home");
  const cwd = join(directory, "project");
  const config = join(home, ".guesty-cli");
  mkdirSync(config, { recursive: true, mode: 0o700 });
  mkdirSync(cwd);
  const files = {
    [join(config, "token.json")]: JSON.stringify({ token: scenario.noDisk ? null : token() }),
    [join(config, ".env")]: scenario.envFiles?.home ?? "",
  };
  if (scenario.envFiles?.cwd !== undefined) files[join(cwd, ".env")] = scenario.envFiles.cwd;
  for (const [path, content] of Object.entries(files)) writeFileSync(path, content, { mode: 0o600 });
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(GUESTY_|SUPABASE_|NODE_OPTIONS$|XDG_CONFIG_HOME$|CODEX_HOME$)/.test(key)));
  Object.assign(env, {
    HOME: home,
    GUESTY_TEST_REDIRECT: mock.url,
    GUESTY_TEST_NOW: String(now),
    GUESTY_TEST_FAST_SLEEP: "1",
    GUESTY_TEST_TRACE: join(directory, "trace.jsonl"),
    SUPABASE_URL: "https://cache.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fake-isolated-cache-key",
    GUESTY_CLIENT_ID: "fake-unused-client-id",
    GUESTY_CLIENT_SECRET: "fake-unused-client-secret",
  });
  if (scenario.noConfig) {
    delete env.SUPABASE_URL;
    delete env.SUPABASE_SERVICE_ROLE_KEY;
  }
  for (const [key, value] of Object.entries(scenario.env ?? {})) {
    if (value === null) delete env[key];
    else env[key] = value;
  }
  const tokenReads = () => {
    const path = env.GUESTY_TEST_TRACE;
    if (!existsSync(path)) return 0;
    // Concurrent calls can interleave trace lines, so count entries rather than parse lines.
    return readFileSync(path, "utf8").match(/"kind":"tokenRead"/g)?.length ?? 0;
  };
  // The CLI must never write a token or credential file.
  const unchanged = () => {
    for (const [path, content] of Object.entries(files)) assert.equal(readFileSync(path, "utf8"), content, `${path} is unchanged`);
    assert.equal(existsSync(join(config, "token.json.tmp")), false);
  };
  return { home, cwd, env, tokenReads, unchanged };
}

/** Runs the binary with a scenario: { status, stdout, stderr, trace }. */
export async function run(t, { args = [], scenario = {}, stdin = "" } = {}) {
  const mock = await startMock(scenario);
  t.after(() => mock.close());
  const { cwd, env, tokenReads, unchanged } = prepare(t, mock, scenario);
  const result = await new Promise((ok, fail) => {
    const child = spawn(bin, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    const out = [];
    const err = [];
    const timer = setTimeout(() => child.kill("SIGKILL"), 15_000);
    child.stdout.on("data", (chunk) => out.push(chunk));
    child.stderr.on("data", (chunk) => err.push(chunk));
    child.on("error", fail);
    child.on("close", (status) => {
      clearTimeout(timer);
      ok({ status, stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8") });
    });
    child.stdin.end(stdin);
  });
  const trace = { requests: mock.trace.requests, tokenReads: tokenReads() };
  assert.ok(trace.requests.every(({ url }) => !/oauth/i.test(new URL(url).pathname)), "no OAuth requests");
  unchanged();
  assert.doesNotMatch(result.stdout + result.stderr, /fake-isolated-(?:openapi-token|cache-key|network-secret)/);
  return { ...result, trace };
}
