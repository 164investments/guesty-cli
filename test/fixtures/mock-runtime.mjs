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
const fakeServiceKey = `gts_${"F".repeat(43)}`;
if (scenario.team) {
  process.env.GUESTY_TOKEN_SERVICE_URL = "https://team-cache.invalid";
  process.env.GUESTY_TOKEN_SERVICE_KEY = fakeServiceKey;
  for (const [name, value] of Object.entries(scenario.teamEnv ?? {})) {
    if (value === null) delete process.env[name];
    else process.env[name] = value;
  }
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
let teamIndex = 0;
let apiIndex = 0;
globalThis.fetch = async (input, options = {}) => {
  const url = new URL(String(input));
  const teamRequest = url.pathname === "/v1/token";
  trace.requests.push({
    url: url.href,
    method: options.method ?? "GET",
    authorization: url.hostname === "open-api.guesty.com" || teamRequest ? options.headers?.Authorization : undefined,
    body: teamRequest ? JSON.parse(options.body) : undefined,
    timeout: options.signal instanceof AbortSignal,
  });
  if (teamRequest && ["team-cache.invalid", "127.0.0.1"].includes(url.hostname)) {
    if (options.method !== "POST") throw new Error("The token service is read through POST /v1/token");
    if (scenario.teamError) throw new Error("fake-secret-in-team-network-error");
    if (scenario.teamRaw !== undefined) return new Response(scenario.teamRaw, { status: 200 });
    const replies = scenario.teamReplies ?? [{ status: scenario.teamStatus ?? 200, body: scenario.teamBody ?? {} }];
    const reply = replies[Math.min(teamIndex++, replies.length - 1)];
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "Content-Type": "application/json" },
    });
  }
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
