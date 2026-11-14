// Runs the Rust CLI (a `cargo build --features test-hooks` binary) against a
// local mock HTTP server in this test process. Nothing reaches Guesty, the
// token service, GitHub or npm:
//
// - The binary sends every request to the mock (GUESTY_TEST_REDIRECT) with
//   the URL it meant to reach in `x-guesty-test-origin`; `handle` answers it.
// - HOME and the working directory are fresh temporary directories holding
//   only the scenario's files; files the CLI writes are found by comparing
//   snapshots of them before and after.
// - The clock is fixed (GUESTY_TEST_NOW) and sleeps return at once
//   (GUESTY_TEST_FAST_SLEEP); waits, timeouts, requests and private-cache
//   reads come from the binary's trace (GUESTY_TEST_TRACE).
// - `npm` is a fake first on PATH that records its arguments.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import {
  chmodSync, copyFileSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const now = 1_800_000_000_000;
export const binary = resolve(process.env.GUESTY_CLI_BIN ?? join(root, "target/debug/guesty"));

/** Headers every HTTP client adds on its own; tests assert the CLI's headers. */
const TRANSPORT_HEADERS = new Set(["host", "user-agent", "accept-encoding", "connection", "content-length", "transfer-encoding", "x-guesty-test-origin"]);

let checked = false;
function checkBinary() {
  if (checked) return;
  assert.ok(existsSync(binary), `${binary} is missing. Run: cargo build --features test-hooks`);
  const directory = mkdtempSync(join(tmpdir(), "guesty-hook-check-"));
  try {
    const trace = join(directory, "trace.jsonl");
    spawnSync(binary, ["token"], { cwd: directory, env: { PATH: process.env.PATH, HOME: directory, GUESTY_TEST_TRACE: trace }, encoding: "utf8", timeout: 10_000 });
    assert.ok(existsSync(trace), `${binary} was built without test hooks. Run: cargo build --features test-hooks`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  checked = true;
}

/** Writes `{ relativePath: string | Buffer | { dir: true } }` under `base`. */
function writeTree(base, files = {}) {
  for (const [path, content] of Object.entries(files)) {
    if (content === undefined || content === null) continue;
    const target = join(base, path);
    if (typeof content === "object" && !Buffer.isBuffer(content) && content.dir) {
      mkdirSync(target, { recursive: true });
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

function snapshot(directories, skip) {
  const files = new Map();
  const walk = (directory) => {
    let entries;
    try { entries = readdirSync(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (skip.some((s) => path === s || path.startsWith(s + "/"))) continue;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.set(path, readFileSync(path));
    }
  };
  for (const directory of directories) walk(directory);
  return files;
}

/** Files created or changed between two snapshots, as `{ path, text, base64 }`. */
function diff(before, after) {
  const writes = [];
  for (const [path, bytes] of after) {
    const old = before.get(path);
    if (old && old.equals(bytes)) continue;
    writes.push({ path, text: bytes.toString("utf8"), base64: bytes.toString("base64") });
  }
  return writes;
}

const FAKE_NPM = `#!/usr/bin/env node
// Fake npm for tests: records its arguments and plays the scenario. It never installs anything.
const fs = require("node:fs");
const path = require("node:path");
const scenario = JSON.parse(process.env.GUESTY_FAKE_NPM ?? "{}");
const args = process.argv.slice(2);
fs.appendFileSync(scenario.log, JSON.stringify({ command: "npm", args, cwd: process.cwd() }) + "\\n");
if (args.join(" ") === "root --global" || args.join(" ") === "root -g") { process.stdout.write(scenario.globalRoot + "\\n"); process.exit(0); }
if (args[0] === "install") {
  if (scenario.installFails) { process.stderr.write("fake install failed\\n"); process.exit(1); }
  const pkg = path.join(scenario.globalRoot, "guesty-cli");
  fs.mkdirSync(pkg, { recursive: true });
  fs.writeFileSync(path.join(pkg, "package.json"), JSON.stringify({ name: "guesty-cli", version: scenario.installedVersion ?? "1.2.0" }));
  if (scenario.installedMissingEntry) for (const entry of ["dist/guesty", "dist/cli.js"]) fs.rmSync(path.join(pkg, entry), { force: true });
  process.exit(0);
}
process.stderr.write("external execution forbidden\\n");
process.exit(1);
`;

/** Answers one request: `{ status, json | raw | base64, headers }`, `{ throw }`, `{ timeout }` or `{ bodyReadFails }`. */
function respond(req, res, reply) {
  if (!reply || reply.throw) {
    req.socket.destroy();
    return;
  }
  if (reply.timeout) {
    // Never answers; the CLI's own timeout ends the request.
    const timer = setTimeout(() => req.socket.destroy(), 10_000);
    req.socket.on("close", () => clearTimeout(timer));
    return;
  }
  const status = reply.status ?? 200;
  const headers = { "content-type": "application/json", ...(reply.headers ?? {}) };
  if (reply.bodyReadFails) {
    res.writeHead(status, { ...headers, "content-length": "1000" });
    res.write('{"partial":');
    setTimeout(() => req.socket.destroy(), 5);
    return;
  }
  const empty = [204, 205, 304].includes(status) || req.method === "HEAD";
  const body = empty ? undefined
    : "raw" in reply ? Buffer.from(String(reply.raw))
    : "base64" in reply ? Buffer.from(reply.base64, "base64")
    : Buffer.from(JSON.stringify(reply.json ?? {}));
  res.writeHead(status, body ? { ...headers, "content-length": String(body.length) } : headers);
  res.end(body);
}

/** Splits a multipart body the way `FormData` sees it. */
async function multipartFields(contentType, body) {
  try {
    const form = await new Request("http://x/", { method: "POST", headers: { "content-type": contentType }, body }).formData();
    const fields = [];
    for (const [name, value] of form.entries()) {
      fields.push(typeof value === "string" ? { name, value } : { name, filename: value.name, type: value.type, data: Buffer.from(await value.arrayBuffer()).toString("base64") });
    }
    return fields;
  } catch {
    return undefined;
  }
}

/**
 * Runs the CLI once.
 *
 * options:
 * - args, stdin
 * - env: variables to set (null removes one); GUESTY_*, SUPABASE_* and NODE_OPTIONS from this process are dropped
 * - home: files under HOME; cwd: files in the working directory
 * - packageFiles: files next to a copy of the binary in `<package>/dist/guesty` (e.g. `{ ".env": "..." }`);
 *   `global: true` puts that package at `<global npm root>/guesty-cli`; `otherGlobal: true` installs a
 *   different copy there instead
 * - npm: the fake npm's scenario ({ installFails, installedVersion, installedMissingEntry })
 * - tty: true or "stdin,stdout,stderr" (GUESTY_TEST_TTY)
 * - fastTimers: false keeps real sleeps
 * - handle(request): the reply for each request; request is { method, url, headers, body (Buffer), ... }
 *
 * Returns { status, stdout, stderr, requests, trace, writes, commands, home, cwd, directory }.
 */
export async function runCli(t, options = {}) {
  checkBinary();
  const directory = mkdtempSync(join(tmpdir(), "guesty-rust-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const home = join(directory, "home");
  const cwd = join(directory, "cwd");
  const bin = join(directory, "bin");
  const tracePath = join(directory, "trace.jsonl");
  const npmLog = join(directory, "npm.jsonl");
  const globalRoot = join(directory, "global", "node_modules");
  for (const d of [home, cwd, bin, globalRoot]) mkdirSync(d, { recursive: true });
  writeTree(home, options.home);
  writeTree(cwd, options.cwd);
  writeFileSync(join(bin, "npm"), FAKE_NPM, { mode: 0o755 });
  writeFileSync(npmLog, "");

  let executable = binary;
  let packageRoot;
  if (options.packageFiles || options.global) {
    packageRoot = options.global ? join(globalRoot, "guesty-cli") : join(directory, "package");
    mkdirSync(join(packageRoot, "dist"), { recursive: true });
    executable = join(packageRoot, "dist", "guesty");
    try { linkSync(binary, executable); } catch { copyFileSync(binary, executable); chmodSync(executable, 0o755); }
    writeTree(packageRoot, options.packageFiles);
  }
  // Another copy of the CLI installed globally, so the running one isn't the global install.
  if (options.otherGlobal) {
    writeTree(join(globalRoot, "guesty-cli"), { "package.json": JSON.stringify({ name: "guesty-cli", version: "1.0.0" }), "dist/guesty": "#!/bin/sh\nexit 1\n" });
  }

  const requests = [];
  const server = createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      const origin = req.headers["x-guesty-test-origin"] ?? "http://unknown";
      const url = new URL(`${origin}${req.url}`).href;
      const headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => !TRANSPORT_HEADERS.has(k)));
      const body = Buffer.concat(chunks);
      const request = { method: req.method, url, headers, body };
      const type = headers["content-type"] ?? "";
      if (type.startsWith("multipart/form-data")) request.multipart = await multipartFields(type, body);
      requests.push(request);
      let reply;
      try {
        reply = options.handle ? await options.handle(request) : { json: { ok: true } };
      } catch {
        reply = { throw: true };
      }
      respond(req, res, reply);
    });
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const mock = `http://127.0.0.1:${server.address().port}`;

  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(GUESTY_|SUPABASE_|NODE_OPTIONS$)/.test(k)));
  Object.assign(env, {
    HOME: home,
    PATH: `${bin}:${process.env.PATH ?? ""}`,
    GUESTY_TEST_REDIRECT: mock,
    GUESTY_TEST_NOW: String(now),
    GUESTY_TEST_TRACE: tracePath,
    GUESTY_TEST_ORIGINAL_BIN: binary,
    GUESTY_FAKE_NPM: JSON.stringify({ ...(options.npm ?? {}), log: npmLog, globalRoot }),
  });
  if (options.fastTimers !== false) env.GUESTY_TEST_FAST_SLEEP = "1";
  if (options.tty) env.GUESTY_TEST_TTY = options.tty === true ? "1" : options.tty;
  for (const [key, value] of Object.entries(options.env ?? {})) {
    if (value === null || value === undefined) delete env[key];
    else env[key] = value;
  }

  // Writes the CLI makes; the package and the fake npm's global root are not the CLI's to write.
  const watched = [home, cwd];
  const skip = [];
  const before = snapshot(watched, skip);
  const result = await new Promise((ok, fail) => {
    const child = spawn(executable, options.args ?? [], { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    const out = [], err = [];
    const timer = setTimeout(() => child.kill("SIGKILL"), options.timeoutMs ?? 30_000);
    child.stdout.on("data", (c) => out.push(c));
    child.stderr.on("data", (c) => err.push(c));
    child.on("error", fail);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      ok({ status: code, signal, stdoutBytes: Buffer.concat(out), stderr: Buffer.concat(err).toString("utf8") });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(options.stdin ?? "");
  });
  await new Promise((ok) => server.close(ok));
  server.closeAllConnections?.();
  assert.equal(result.signal, null, "the CLI finished before the test timeout");

  const trace = existsSync(tracePath)
    ? readFileSync(tracePath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line))
    : [];
  // Each traced request is preceded by its timeout; requests reach the mock in the same order.
  const traced = [];
  let timeout;
  for (const line of trace) {
    if (line.kind === "timeout") timeout = line.value;
    if (line.kind === "request") { traced.push({ url: line.value, at: line.at, timeout }); timeout = undefined; }
  }
  requests.forEach((request, index) => {
    request.at = traced[index]?.at;
    request.timeoutMs = traced[index]?.timeout;
  });
  const commands = readFileSync(npmLog, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  return {
    status: result.status,
    stdout: result.stdoutBytes.toString("utf8"),
    stdoutBytes: result.stdoutBytes,
    stderr: result.stderr,
    requests,
    trace,
    waits: trace.filter((l) => l.kind === "wait").map((l) => l.value),
    timeouts: trace.filter((l) => l.kind === "timeout").map((l) => l.value),
    tokenReads: trace.filter((l) => l.kind === "tokenRead").length,
    writes: diff(before, snapshot(watched, skip)),
    commands,
    home, cwd, directory, packageRoot, globalRoot,
  };
}
