// Gives the Node CLI (dist/cli.js) the Rust binary's test hooks (src/hooks.rs),
// so the converted tests can be checked against the implementation they were
// written for: GUESTY_CLI_BIN=test/harness/node/guesty node --test ...
// GUESTY_TEST_REDIRECT, _NOW, _FAST_SLEEP, _TRACE, _TTY and _VERSION mean what they mean there.
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url)).replace(/\/$/, "");
const tracePath = process.env.GUESTY_TEST_TRACE;
const appendFileSync = fs.appendFileSync;
const originalRead = fs.readFileSync;
let now = process.env.GUESTY_TEST_NOW ? Number(process.env.GUESTY_TEST_NOW) : undefined;
const clock = () => now ?? Date.now();
const trace = (kind, value) => { if (tracePath) appendFileSync(tracePath, JSON.stringify({ kind, value, at: clock() }) + "\n"); };

if (now !== undefined) Date.now = () => now;
const fromCli = () => (new Error().stack ?? "").includes(`${root}/dist/`);
if (process.env.GUESTY_TEST_FAST_SLEEP === "1") {
  const originalSetTimeout = globalThis.setTimeout;
  // Only the CLI's own sleeps; fetch's internal timers keep real time.
  globalThis.setTimeout = (callback, ms, ...args) => {
    if (!fromCli()) return originalSetTimeout(callback, ms, ...args);
    trace("wait", ms);
    if (now !== undefined) now += ms;
    queueMicrotask(() => callback(...args));
    return { unref() {}, ref() {}, hasRef() { return false; } };
  };
}
const originalTimeout = AbortSignal.timeout;
AbortSignal.timeout = (ms) => { trace("timeout", ms); return originalTimeout(ms); };

// Run from a package copy (<package>/dist/guesty), the CLI's package is that
// directory, as the Rust binary's is: its .git, its realpath, and the global
// install's entry point (dist/guesty for dist/cli.js).
const exe = process.env.GUESTY_TEST_EXE ?? "";
const packageRoot = dirname(exe).endsWith("/dist") ? dirname(dirname(exe)) : undefined;
const pathOf = (file) => file instanceof URL ? fileURLToPath(file) : typeof file === "string" ? resolve(file) : "";
const mapped = (path) => {
  if (!packageRoot) return path;
  if (path === root) return packageRoot;
  if (path === join(root, ".git")) return join(packageRoot, ".git");
  if (path.endsWith("/guesty-cli/dist/cli.js")) return path.replace(/cli\.js$/, "guesty");
  return path;
};
const tokenFile = join(homedir(), ".guesty-cli", "token.json");
fs.readFileSync = (file, ...args) => {
  const path = pathOf(file);
  if (path === tokenFile) trace("tokenRead", path);
  if (path === join(root, "package.json") && process.env.GUESTY_TEST_VERSION) {
    return JSON.stringify({ ...JSON.parse(originalRead(file, ...args)), version: process.env.GUESTY_TEST_VERSION });
  }
  return originalRead(file, ...args);
};
const originalExists = fs.existsSync;
fs.existsSync = (file) => originalExists(mapped(pathOf(file)));
const originalRealpath = fs.realpathSync;
fs.realpathSync = (file, ...args) => originalRealpath(mapped(pathOf(file)), ...args);
syncBuiltinESMExports();

const tty = process.env.GUESTY_TEST_TTY;
if (tty) for (const name of ["stdin", "stdout", "stderr"]) {
  if (tty === "1" || tty.split(",").includes(name)) Object.defineProperty(process[name], "isTTY", { value: true });
}

const target = process.env.GUESTY_TEST_REDIRECT;
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options = {}) => {
  const url = new URL(String(input));
  trace("request", url.href);
  if (!target) return originalFetch(input, options);
  const headers = new Headers(options.headers);
  headers.set("x-guesty-test-origin", url.origin);
  return originalFetch(`${target}${url.pathname}${url.search}`, { ...options, headers });
};

// The hidden test command the Rust binary needs (see the port report):
// `guesty __test-update-check [count]` runs the update check count times.
if (process.argv[2] === "__test-update-check") {
  const { checkForUpdate } = await import(join(root, "dist/update-check.js"));
  for (let i = 0; i < Number(process.argv[3] ?? 1); i++) await checkForUpdate();
  process.exit(0);
}
