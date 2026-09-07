// Contract tests never access a real token, private configuration, or network.
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const originalRead = fs.readFileSync;
const originalWrite = fs.writeFileSync;
const originalExists = fs.existsSync;
const configDir = join(homedir(), ".guesty-cli");
const now = 1_800_000_000_000;
const trace = { requests: [], writes: [], tokenReads: 0 };
Date.now = () => now;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.GUESTY_CLIENT_ID;
delete process.env.GUESTY_CLIENT_SECRET;

function pathOf(value) {
  if (value instanceof URL) return fileURLToPath(value);
  return typeof value === "string" ? resolve(value) : "";
}

fs.readFileSync = (file, ...args) => {
  const path = pathOf(file);
  if (path.endsWith("/.env")) return "";
  if (path === join(configDir, "token.json")) {
    trace.tokenReads++;
    return JSON.stringify({ token: { access_token: "fake-openapi-token", token_type: "openapi", expires_at: now + 3_600_000 } });
  }
  if (path === join(configDir, "update-check.json")) return JSON.stringify({ lastCheck: now, latestVersion: "0.0.0" });
  if (path.startsWith(configDir + "/")) throw new Error("Unexpected private file read");
  return originalRead(file, ...args);
};
fs.existsSync = (file) => {
  const path = pathOf(file);
  return path === configDir || path.startsWith(configDir + "/") || originalExists(file);
};
fs.writeFileSync = (file) => { trace.writes.push(pathOf(file)); throw new Error("Contract tests forbid file writes"); };
fs.mkdirSync = (file) => { trace.writes.push(pathOf(file)); throw new Error("Contract tests forbid directory creation"); };
syncBuiltinESMExports();

globalThis.fetch = async (input, options = {}) => {
  const url = new URL(String(input));
  const multipart = [];
  if (options.body instanceof FormData) {
    for (const [name, value] of options.body.entries()) {
      multipart.push(typeof value === "string" ? { name, value } : {
        name, filename: value.name, type: value.type, data: Buffer.from(await value.arrayBuffer()).toString("base64"),
      });
    }
  }
  trace.requests.push({
    url: url.href,
    method: options.method ?? "GET",
    body: typeof options.body === "string" ? options.body : options.body === undefined ? undefined : "binary",
    ...(multipart.length ? { multipart, contentType: new Headers(options.headers).get("content-type") } : {}),
  });
  if (url.hostname !== "open-api.guesty.com" || !url.pathname.startsWith("/v1/") || /oauth/i.test(url.pathname)) {
    throw new Error("Contract tests forbid this network request");
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
};

process.on("exit", () => originalWrite(process.env.GUESTY_API_TEST_TRACE, JSON.stringify(trace)));
