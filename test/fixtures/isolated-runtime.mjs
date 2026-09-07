// All credentials, private files, network responses, clocks and installs are fake.
// No test in this fixture can contact Guesty, refresh a token, or run npm.
import fs from "node:fs";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { homedir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const scenario = JSON.parse(process.env.GUESTY_ISOLATED_SCENARIO);
const root = fileURLToPath(new URL("../../", import.meta.url)).replace(/\/$/, "");
const configDir = join(homedir(), ".guesty-cli");
const globalRoot = "/__guesty_test_global__/node_modules";
const originalRead = fs.readFileSync;
const originalWrite = fs.writeFileSync;
const originalExists = fs.existsSync;
const originalRealpath = fs.realpathSync;
const originalSetTimeout = globalThis.setTimeout;
const originalTimeout = AbortSignal.timeout;
let now = 1_800_000_000_000;
let checkData = scenario.checkData;
let installed = false;
let apiIndex = 0;
let sharedIndex = 0;
const trace = { requests: [], waits: [], writes: [], commands: [], tokenReads: 0, timeouts: [] };
globalThis.__guestyTestTrace = trace;
const token = (value = "fake-isolated-openapi-token") => ({ token_type: "openapi", access_token: value, expires_at: now + 36_000_000 });

Date.now = () => now;
process.env.SUPABASE_URL = "https://cache.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-isolated-cache-key";
process.env.GUESTY_CLIENT_ID = "fake-unused-client-id";
process.env.GUESTY_CLIENT_SECRET = "fake-unused-client-secret";
if (scenario.noConfig) {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}
for (const [key, value] of Object.entries(scenario.env ?? {})) {
  if (value === null) delete process.env[key];
  else process.env[key] = value;
}

function pathOf(value) {
  return value instanceof URL ? fileURLToPath(value) : typeof value === "string" ? resolve(value) : "";
}
fs.readFileSync = (file, ...args) => {
  const path = pathOf(file);
  if (path.endsWith("/.env")) {
    if (path === join(configDir, ".env")) return scenario.envFiles?.home ?? "";
    if (path === join(root, ".env")) return scenario.envFiles?.script ?? "";
    if (path === join(process.cwd(), ".env")) return scenario.envFiles?.cwd ?? "";
    return "";
  }
  if (path === join(configDir, "token.json")) {
    trace.tokenReads++;
    return JSON.stringify({ token: scenario.noDisk ? null : token() });
  }
  if (path === join(configDir, "update-check.json")) {
    if (checkData === undefined) throw new Error("no fake update cache");
    return typeof checkData === "string" ? checkData : JSON.stringify(checkData);
  }
  if (path.startsWith(configDir + "/")) throw new Error("private file read forbidden");
  if (path === join(root, "package.json")) {
    return JSON.stringify({ ...JSON.parse(originalRead(file, ...args)), version: scenario.localVersion ?? "1.0.0" });
  }
  if (path === join(globalRoot, "guesty-cli", "package.json")) return JSON.stringify({ version: installed ? scenario.installedVersion ?? "1.2.0" : "1.0.0" });
  if (path === scenario.inputPath) return Buffer.from(scenario.inputBase64, "base64");
  return originalRead(file, ...args);
};
fs.writeFileSync = (file, value, ...args) => {
  const path = pathOf(file);
  trace.writes.push({ path, text: typeof value === "string" ? value : undefined, base64: value instanceof Uint8Array ? Buffer.from(value).toString("base64") : undefined });
  if (path === join(configDir, "update-check.json")) { checkData = JSON.parse(value); return; }
  if (path === scenario.outputPath) return;
  throw new Error("file write forbidden");
};
fs.mkdirSync = (file) => {
  if (pathOf(file) !== configDir) throw new Error("directory write forbidden");
};
fs.existsSync = (file) => {
  const path = pathOf(file);
  if (path === join(root, ".git")) return scenario.sourceCheckout !== false;
  if (path === join(globalRoot, "guesty-cli", "dist", "cli.js")) return !scenario.installedMissingEntry;
  if (path === configDir || path === join(configDir, "update-check.json")) return true;
  return originalExists(file);
};
fs.realpathSync = (file, ...args) => {
  const path = pathOf(file);
  if (path === root) return root;
  if (path === join(globalRoot, "guesty-cli")) return scenario.globalMismatch ? "/__different_cli__" : root;
  if (path === join(root, "dist", "cli.js")) return path;
  return originalRealpath(file, ...args);
};
childProcess.execFileSync = (command, args, opts = {}) => {
  trace.commands.push({ command, args, cwd: opts.cwd });
  if (command !== "npm") throw new Error("external execution forbidden");
  if (args.join(" ") === "root --global") return globalRoot;
  if (args[0] === "install") {
    if (scenario.installFails) throw new Error("fake install failed");
    installed = true;
    return;
  }
  throw new Error("external execution forbidden");
};
syncBuiltinESMExports();

if (scenario.fastTimers !== false) {
  globalThis.setTimeout = (callback, ms, ...args) => {
    trace.waits.push(ms);
    now += ms;
    queueMicrotask(() => callback(...args));
    return { unref() {} };
  };
}
AbortSignal.timeout = (ms) => {
  trace.timeouts.push(ms);
  return originalTimeout(ms);
};

globalThis.fetch = async (input, options = {}) => {
  const url = new URL(String(input));
  trace.requests.push({ url: url.href, at: now, method: options.method ?? "GET", headers: Object.fromEntries(new Headers(options.headers)), body: typeof options.body === "string" ? options.body : undefined, bodyBase64: options.body instanceof Uint8Array ? Buffer.from(options.body).toString("base64") : undefined, timeout: options.signal instanceof AbortSignal, redirect: options.redirect });
  let reply;
  if (url.hostname === "open-api.guesty.com" && url.pathname.startsWith("/v1/") && !/oauth/i.test(url.pathname)) {
    const replies = scenario.responses ?? [{ json: { results: [] } }];
    reply = replies[Math.min(apiIndex++, replies.length - 1)];
    if (scenario.paginationCount !== undefined) {
      const skip = Number(url.searchParams.get("skip"));
      const limit = Number(url.searchParams.get("limit"));
      reply = { json: { results: Array.from({ length: Math.min(limit, Math.max(0, scenario.paginationCount - skip)) }, (_, index) => ({ _id: String(skip + index) })), count: scenario.paginationCount, skip, limit } };
    }
  } else if (url.href === "https://api.github.com/repos/164investments/guesty-cli/releases/latest") {
    reply = scenario.github ?? { status: 404, json: {} };
  } else if (url.hostname === "cache.invalid" && url.pathname === "/rest/v1/guesty_tokens" && options.method === "GET" && url.searchParams.get("token_type") === "eq.openapi") {
    const replies = scenario.sharedReplies ?? [[token()]];
    reply = { json: replies[Math.min(sharedIndex++, replies.length - 1)] };
  } else {
    throw new Error("network destination forbidden");
  }
  if (reply.throw) throw new Error("fake-isolated-network-secret");
  if (reply.timeout) {
    return new Promise((_, reject) => {
      const timer = originalSetTimeout(() => reject(new Error("abort never fired")), 500);
      options.signal.addEventListener("abort", () => { clearTimeout(timer); reject(options.signal.reason); }, { once: true });
    });
  }
  const content = "raw" in reply ? reply.raw : "base64" in reply ? Buffer.from(reply.base64, "base64") : JSON.stringify(reply.json ?? {});
  const response = new Response([204, 205, 304].includes(reply.status) ? null : content, { status: reply.status ?? 200, headers: { "content-type": "application/json", ...reply.headers } });
  if (reply.bodyReadFails) response.text = async () => { throw new Error("fake-isolated-network-secret"); };
  return response;
};

process.on("exit", () => originalWrite(process.env.GUESTY_ISOLATED_TRACE, JSON.stringify(trace)));
