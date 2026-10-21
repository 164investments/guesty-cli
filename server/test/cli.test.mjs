// Drives the real CLI (../dist/cli.js, from npm run build in the repository
// root) against the bundled Worker in Miniflare. Guesty's token endpoint is
// mocked; nothing here contacts Guesty.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";
import { Miniflare } from "miniflare";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPath = join(root, "..", "dist", "cli.js");
const oauthRequests = [];
const homes = [];
let mf;
let base;

function home() {
  const dir = mkdtempSync(join(tmpdir(), "guesty-cli-home-"));
  homes.push(dir);
  return dir;
}

function cli(homeDir, args, input = "") {
  const env = { ...process.env, HOME: homeDir };
  for (const name of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GUESTY_TOKEN_SERVICE_URL", "GUESTY_TOKEN_SERVICE_KEY"]) delete env[name];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, ...args], { cwd: homeDir, env, timeout: 30_000 });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (status) => resolve({ status, stdout, stderr }));
    child.stdin.end(input);
  });
}

function settings(homeDir) {
  const file = join(homeDir, ".guesty-cli", ".env");
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

before(async () => {
  assert.ok(existsSync(cliPath), "Build the CLI first: npm run build in the repository root.");
  mf = new Miniflare({
    modules: true,
    scriptPath: join(root, "dist/index.js"),
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "guesty-token-service-cli" },
    bindings: { CREDENTIALS_KEY: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))) },
    async outboundService(request) {
      const url = new URL(request.url);
      assert.equal(url.pathname, "/oauth2/token");
      oauthRequests.push(Object.fromEntries(new URLSearchParams(await request.text())));
      return Response.json({ token_type: "Bearer", access_token: `mock-token-${oauthRequests.length}`, expires_in: 86400 });
    },
    host: "127.0.0.1",
    port: 0,
  });
  base = (await mf.ready).origin;
  const db = await mf.getD1Database("DB");
  const migration = readFileSync(join(root, "migrations/0001_init.sql"), "utf8").replace(/--.*$/gm, "");
  for (const statement of migration.split(";").map((part) => part.trim()).filter(Boolean)) await db.prepare(statement).run();
});

after(async () => {
  await mf?.dispose();
  for (const dir of homes) rmSync(dir, { recursive: true, force: true });
});

const admin = home();
const member = home();
let invite;

test("guesty setup creates a team and saves only the service URL and admin key", async () => {
  const result = await cli(admin, ["setup"], `2\n${base}\nAcme\nDana\nacme-id\nacme-secret\nn\n`);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /Team "Acme" is ready/);
  assert.equal(oauthRequests.length, 1);
  assert.equal(oauthRequests[0].client_secret, "acme-secret");
  const saved = settings(admin);
  assert.match(saved, new RegExp(`^GUESTY_TOKEN_SERVICE_URL=${base.replace(/[.]/g, "\\.")}$`, "m"));
  assert.match(saved, /^GUESTY_TOKEN_SERVICE_KEY=gts_[A-Za-z0-9_-]{43}$/m);
  assert.doesNotMatch(saved + result.stdout + result.stderr, /acme-secret/);
  assert.equal(statSync(join(admin, ".guesty-cli", ".env")).mode & 0o777, 0o600);
});

test("the admin's CLI reads the team token", async () => {
  const result = await cli(admin, ["token", "--json"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).access_token, "mock-token-1");
});

test("an invite code lets a teammate join and share the same token", async () => {
  const created = await cli(admin, ["team", "invite", "Sam"]);
  assert.equal(created.status, 0, created.stderr);
  invite = created.stdout.trim();
  assert.match(invite, /^gti_[A-Za-z0-9_-]+$/);
  const joined = await cli(member, ["setup"], `3\n${invite}\n`);
  assert.equal(joined.status, 0, joined.stderr);
  const token = await cli(member, ["token"]);
  assert.equal(token.stdout, "mock-token-1\n");
  assert.equal(oauthRequests.length, 1);
});

test("only admins see team status", async () => {
  const status = await cli(admin, ["team", "status"]);
  assert.equal(status.status, 0, status.stderr);
  const body = JSON.parse(status.stdout);
  assert.deepEqual(body.keys.map(({ label }) => label), ["Dana", "Sam"]);
  const denied = await cli(member, ["team", "status"]);
  assert.equal(denied.status, 1);
  assert.match(denied.stderr, /admin keys/);
});

test("a revoked teammate can no longer get the token", async () => {
  assert.equal((await cli(admin, ["team", "revoke", "Sam"])).status, 0);
  const result = await cli(member, ["token"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /token service rejected the access key \(HTTP 401\)/);
});

test("rerunning setup with the same credentials points to an invite, then recovers admin access the next day", async () => {
  const other = home();
  const answers = "Acme again\nDana\nacme-id\nacme-secret\nn\n";
  const sameDay = await cli(other, ["setup", "--server", base], answers);
  assert.equal(sameDay.status, 1);
  assert.match(sameDay.stderr, /already belong to a team on this service\. Ask one of its admins for an invite/);
  assert.equal(settings(other), "");
  assert.equal(oauthRequests.length, 1);
  const db = await mf.getD1Database("DB");
  await db.prepare("UPDATE token_requests SET requested_at = requested_at - ?").bind(25 * 3600_000).run();
  const nextDay = await cli(other, ["setup", "--server", base], answers);
  assert.equal(nextDay.status, 0, nextDay.stderr);
  assert.match(nextDay.stderr, /already belong to the team "Acme"/);
  assert.equal(oauthRequests.length, 2);
  assert.equal((await cli(other, ["token"])).stdout, "mock-token-2\n");
  assert.equal((await cli(admin, ["token"])).stdout, "mock-token-2\n");
});

test("deleting the team removes it from the service and this CLI's settings", async () => {
  const result = await cli(admin, ["team", "delete", "--yes"]);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(settings(admin), /GUESTY_TOKEN_SERVICE/);
  assert.equal((await cli(member, ["team", "join", invite])).status, 1);
});
