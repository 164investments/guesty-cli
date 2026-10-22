// Drives the real CLI (../dist/cli.js, from npm run build in the repository
// root) against the bundled Worker in Miniflare. Guesty's token endpoint and
// Resend's email API are mocked; nothing here contacts Guesty or sends email.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test, { after, before } from "node:test";
import { Miniflare } from "miniflare";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cliPath = join(root, "..", "dist", "cli.js");
const oauthRequests = [];
const emails = [];
const homes = [];
const terminals = [];
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

// Runs the CLI in a pseudo-terminal, as a person would, through Python's
// standard pty module. expect() waits for text, then the test types a reply.
function terminal(homeDir, args) {
  // A recent update check keeps the CLI from contacting GitHub afterwards.
  mkdirSync(join(homeDir, ".guesty-cli"), { recursive: true });
  writeFileSync(join(homeDir, ".guesty-cli", "update-check.json"), JSON.stringify({ source: "github-release", lastCheck: Date.now(), latestVersion: null }));
  const env = { ...process.env, HOME: homeDir, TERM: "xterm-256color" };
  for (const name of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GUESTY_TOKEN_SERVICE_URL", "GUESTY_TOKEN_SERVICE_KEY", "NO_COLOR", "CI"]) delete env[name];
  // stty gives the new terminal a size before the CLI starts; it has none otherwise.
  const shim = "import os, pty, sys; sys.exit(os.waitstatus_to_exitcode(pty.spawn(sys.argv[1:])))";
  const child = spawn("python3", ["-c", shim, "sh", "-c", 'stty cols 100 rows 40 && exec "$@"', "sh", process.execPath, cliPath, ...args], { cwd: homeDir, env });
  terminals.push(child);
  let output = "";
  let seen = 0;
  child.stdout.on("data", (chunk) => { output += chunk; });
  const exit = new Promise((resolve) => child.on("close", resolve));
  const visible = () => output.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
  return {
    exit,
    visible,
    raw: () => output,
    async expect(text) {
      for (const end = Date.now() + 15_000; Date.now() < end;) {
        const at = visible().indexOf(text, seen);
        if (at >= 0) {
          seen = at + text.length;
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error(`The terminal never showed "${text}":\n${visible()}`);
    },
    type(keys) {
      child.stdin.write(keys);
    },
  };
}

function settings(homeDir) {
  const file = join(homeDir, ".guesty-cli", ".env");
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const linkPattern = () => new RegExp(`^${escapeRegExp(base)}/join/[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$`);

before(async () => {
  assert.ok(existsSync(cliPath), "Build the CLI first: npm run build in the repository root.");
  mf = new Miniflare({
    modules: true,
    scriptPath: join(root, "dist/index.js"),
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "guesty-token-service-cli" },
    bindings: {
      CREDENTIALS_KEY: btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))),
      RESEND_API_KEY: "re_test_key",
      INVITE_EMAIL_FROM: "Simply VRM <invites@example.com>",
    },
    async outboundService(request) {
      const url = new URL(request.url);
      if (url.href === "https://api.resend.com/emails") {
        emails.push(await request.json());
        return Response.json({ id: `mock-email-${emails.length}` });
      }
      assert.equal(url.pathname, "/oauth2/token");
      oauthRequests.push(Object.fromEntries(new URLSearchParams(await request.text())));
      return Response.json({ token_type: "Bearer", access_token: `mock-token-${oauthRequests.length}`, expires_in: 86400 });
    },
    host: "127.0.0.1",
    port: 0,
  });
  base = (await mf.ready).origin;
  const db = await mf.getD1Database("DB");
  for (const file of readdirSync(join(root, "migrations")).filter((name) => name.endsWith(".sql")).sort()) {
    const migration = readFileSync(join(root, "migrations", file), "utf8").replace(/--.*$/gm, "");
    for (const statement of migration.split(";").map((part) => part.trim()).filter(Boolean)) await db.prepare(statement).run();
  }
});

after(async () => {
  for (const child of terminals) child.kill();
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

test("an invite link lets a teammate join once and share the same token", async () => {
  const created = await cli(admin, ["team", "invite", "Sam"]);
  assert.equal(created.status, 0, created.stderr);
  invite = created.stdout.trim();
  assert.match(invite, linkPattern());
  assert.match(created.stderr, new RegExp(`Or they run: guesty join ${escapeRegExp(invite)}`));
  assert.match(created.stderr, /It works once\. To cancel it, run guesty team revoke "Sam"\./);
  const joined = await cli(member, ["join", invite]);
  assert.equal(joined.status, 0, joined.stderr);
  assert.match(joined.stderr, /You're on the "Acme" team\n {2}Service: .+\n {2}Your name: Sam\n {2}Role: Member/);
  const token = await cli(member, ["token"]);
  assert.equal(token.stdout, "mock-token-1\n");
  assert.equal(oauthRequests.length, 1);
  const reused = await cli(home(), ["setup"], `3\n${invite}\n`);
  assert.equal(reused.status, 1);
  assert.match(reused.stderr, /This invite was already used/);
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

test("an emailed invite shows in status until it's cancelled, and a CLI 1.4 invite code still works", async () => {
  const emailed = await cli(admin, ["team", "invite", "Lee", "--email", "lee@example.com"]);
  assert.equal(emailed.status, 0, emailed.stderr);
  assert.match(emailed.stderr, /Emailing Lee an invite/);
  assert.equal(emails.length, 1);
  assert.deepEqual(emails[0].to, ["lee@example.com"]);
  assert.equal(emails[0].subject, "Dana invited you to Guesty CLI");
  const lee = emailed.stdout.trim();
  assert.ok(emails[0].text.includes(lee));

  const status = JSON.parse((await cli(admin, ["team", "status"])).stdout);
  assert.deepEqual(status.invites.map(({ label, email }) => [label, email]), [["Lee", "lee@example.com"]]);

  // Joining from a CLI that's already connected asks first, and input that ends answers no.
  const declined = await cli(admin, ["join", lee]);
  assert.equal(declined.status, 1);
  assert.match(declined.stderr, /already connected to a team\. Replace that connection\? \(y\/N\)/);
  assert.match(declined.stderr, /Nothing was changed/);
  assert.match(settings(admin), /GUESTY_TOKEN_SERVICE_KEY=gts_/);

  const cancelled = await cli(admin, ["team", "revoke", "Lee"]);
  assert.equal(cancelled.status, 0, cancelled.stderr);
  assert.match(cancelled.stderr, /Cancelled Lee's invite\./);
  const refused = await cli(home(), ["join", lee]);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /This invite was cancelled\. Ask Dana for a new one\./);

  // CLI 1.4 printed codes that hold the key itself.
  const adminKey = /^GUESTY_TOKEN_SERVICE_KEY=(.+)$/m.exec(settings(admin))[1];
  const res = await fetch(`${base}/v1/team/keys`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ label: "Legacy" }),
  });
  const legacy = `gti_${Buffer.from(JSON.stringify({ url: base, key: (await res.json()).key })).toString("base64url")}`;
  const older = home();
  const joined = await cli(older, ["team", "join", legacy]);
  assert.equal(joined.status, 0, joined.stderr);
  assert.equal((await cli(older, ["token"])).stdout, "mock-token-1\n");
  assert.equal((await cli(admin, ["team", "revoke", "Legacy"])).status, 0);
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
  const pending = (await cli(admin, ["team", "invite", "Kai"])).stdout.trim();
  const result = await cli(admin, ["team", "delete", "--yes"]);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(settings(admin), /GUESTY_TOKEN_SERVICE/);
  const joined = await cli(home(), ["join", pending]);
  assert.equal(joined.status, 1);
  assert.match(joined.stderr, /isn't valid/);
});

const hasPython = spawnSync("python3", ["--version"]).status === 0;

test("in a terminal, setup shows each question, masks the secret and creates the team", { skip: !hasPython && "needs python3 for a pseudo-terminal" }, async () => {
  const dir = home();
  const session = terminal(dir, ["setup", "--server", base]);
  await session.expect("Team name");
  session.type("Terminal Co\r");
  await session.expect("Your name");
  session.type("\r");
  await session.expect("Guesty Open API client ID");
  session.type("terminal-id\r");
  await session.expect("Guesty Open API client secret");
  session.type("terminal-secret\r");
  await session.expect("Add booking engine API credentials too?");
  session.type("\r");
  await session.expect('Team "Terminal Co" is ready');
  // Setup offers to invite teammates straight away.
  await session.expect("Invite a teammate now?");
  session.type("\x1b[D\r");
  await session.expect("Teammate's name");
  session.type("Pat\r");
  await session.expect("Their email address");
  session.type("pat@example.com\r");
  await session.expect("Emailed the invite to pat@example.com");
  await session.expect("Invite for Pat");
  await session.expect("Invite someone else?");
  session.type("\r");
  assert.equal(await session.exit, 0, session.visible());
  assert.match(session.visible(), /Or they run\s+guesty join http:\/\/127\.0\.0\.1:\d+\/join\/[0-9A-Z-]{14}/);
  assert.doesNotMatch(session.visible(), /terminal-secret/);
  assert.match(settings(dir), /^GUESTY_TOKEN_SERVICE_KEY=gts_/m);
  assert.deepEqual(emails.at(-1).to, ["pat@example.com"]);
  assert.equal(emails.at(-1).subject, "You're invited to a team on Guesty CLI");
  assert.match(emails.at(-1).text, /^You're invited to the Terminal Co team on Guesty CLI\./);

  // A name is whatever an admin typed; status shows it without its escape sequences.
  assert.equal((await cli(dir, ["team", "invite", "Evil\u001b]0;renamed\u0007"])).status, 0);
  const status = terminal(dir, ["team", "status"]);
  assert.equal(await status.exit, 0, status.visible());
  assert.match(status.visible(), /Pending invites/);
  assert.match(status.visible(), /Evil\?\]0;renamed\?\s+member, link only, expires/);
  assert.match(status.visible(), /Pat\s+member, emailed to pat@example\.com, expires/);
  assert.doesNotMatch(status.raw(), /\u001b\]0;renamed/);
});

test("in a terminal, Ctrl+C stops setup before anything is sent or saved", { skip: !hasPython && "needs python3 for a pseudo-terminal" }, async () => {
  const dir = home();
  const before = oauthRequests.length;
  const session = terminal(dir, ["setup", "--server", base]);
  await session.expect("Team name");
  session.type("\x03");
  assert.equal(await session.exit, 1);
  assert.match(session.visible(), /Stopped\. Nothing was changed\./);
  assert.doesNotMatch(session.visible(), /Error:/);
  assert.equal(settings(dir), "");
  assert.equal(oauthRequests.length, before);
});
