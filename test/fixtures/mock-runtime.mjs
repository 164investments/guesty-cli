// Every child process installs this before loading CLI code. No real token,
// credential file, cache mutation, or network request is allowed in these tests.
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scenario = JSON.parse(process.env.GUESTY_CLI_TEST_SCENARIO);
const trace = { requests: [], writes: [], tokenReads: 0 };
const configDir = join(homedir(), ".guesty-cli");
const tokenFile = join(configDir, "token.json");
const updateFile = join(configDir, "update-check.json");
const originalRead = fs.readFileSync;
const originalWrite = fs.writeFileSync;
const originalExists = fs.existsSync;
const now = 1_800_000_000_000;

Date.now = () => now;
process.env.GUESTY_CLIENT_ID = "fake-client-id-must-not-be-used";
process.env.GUESTY_CLIENT_SECRET = "fake-client-secret-must-not-be-used";
process.env.SUPABASE_URL = "https://cache.invalid";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-cache-key-must-not-be-printed";
if (scenario.noConfig) {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function pathOf(value) {
  if (value instanceof URL) return fileURLToPath(value);
  return typeof value === "string" ? resolve(value) : "";
}

fs.readFileSync = (file, ...args) => {
  const path = pathOf(file);
  if (path.endsWith("/.env")) return "";
  if (path === tokenFile) {
    trace.tokenReads++;
    if (scenario.diskError) throw new Error("fake private cache error");
    if (scenario.diskRaw !== undefined) return scenario.diskRaw;
    return JSON.stringify(scenario.disk ?? { token: null });
  }
  if (path === updateFile) {
    return JSON.stringify({ lastCheck: now, latestVersion: "0.0.0" });
  }
  if (path.startsWith(configDir + "/")) throw new Error("Unexpected private file read");
  return originalRead(file, ...args);
};
fs.existsSync = (file) => {
  const path = pathOf(file);
  if (path === configDir || path.startsWith(configDir + "/")) return true;
  return originalExists(file);
};
fs.writeFileSync = (file) => {
  trace.writes.push(pathOf(file));
  throw new Error("Tests forbid CLI file writes");
};
fs.mkdirSync = (file) => {
  trace.writes.push(pathOf(file));
  throw new Error("Tests forbid CLI directory creation");
};
syncBuiltinESMExports();

let sharedIndex = 0;
let apiIndex = 0;
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(String(input));
  trace.requests.push({
    url: url.href,
    method: options.method ?? "GET",
    authorization: url.hostname === "open-api.guesty.com" ? options.headers?.Authorization : undefined,
    timeout: options.signal instanceof AbortSignal,
  });
  if (url.hostname === "cache.invalid" && url.pathname === "/rest/v1/guesty_tokens") {
    if ((options.method ?? "GET") !== "GET") throw new Error("Tests forbid cache mutation");
    if (scenario.sharedError) throw new Error("fake-secret-in-private-network-error");
    if (scenario.sharedRaw !== undefined) return new Response(scenario.sharedRaw, { status: 200 });
    const replies = scenario.sharedReplies ?? [scenario.shared ?? []];
    const body = replies[Math.min(sharedIndex++, replies.length - 1)];
    return new Response(JSON.stringify(body), {
      status: scenario.sharedStatus ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (url.hostname === "open-api.guesty.com" && url.pathname === "/v1/listings") {
    const statuses = scenario.apiStatuses ?? [200];
    const status = statuses[Math.min(apiIndex++, statuses.length - 1)];
    return new Response(JSON.stringify(status === 200 ? { results: [] } : { error: "fake-secret-in-auth-error" }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
  throw new Error("Tests forbid this network request");
};

process.on("exit", () => {
  originalWrite(process.env.GUESTY_CLI_TEST_TRACE, JSON.stringify(trace));
});
