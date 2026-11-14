#!/usr/bin/env node
// Runs the Node CLI (dist/cli.js, 1.x) and the Rust CLI (a test-hooks build)
// with the same arguments against the same local mock, and compares stdout,
// stderr, the exit code and every HTTP request they make.
//
//   npm run build && cargo build --features test-hooks
//   node scripts/parity/parity.mjs -- reservations list-v3 --limit 5
//   node scripts/parity/parity.mjs --cases cases.jsonl   # one JSON argv array (or {args, stdin, reply}) per line
//
// A case may give "replies": [reply, ...] to answer API requests in turn.
// Options: --stdin <text> (piped to both), --reply <json> (the mock's reply to
// API requests: {status, json|raw, headers}), --rust <path>, --node <path>,
// --env KEY=VALUE (repeatable), --quiet (print only failures).
// Nothing reaches Guesty: both CLIs send every request to the mock, and HOME
// is a fresh temporary directory configured with a fake token service.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const opts = { rust: join(root, "target/debug/guesty"), node: join(root, "dist/cli.js"), env: {}, quiet: false };
let cases = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--") { cases.push({ args: argv.slice(i + 1) }); break; }
  else if (a === "--cases") cases.push(...readFileSync(argv[++i], "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => {
    const v = JSON.parse(l);
    return Array.isArray(v) ? { args: v } : v;
  }));
  else if (a === "--stdin") opts.stdin = argv[++i];
  else if (a === "--reply") opts.reply = JSON.parse(argv[++i]);
  else if (a === "--rust") opts.rust = resolve(argv[++i]);
  else if (a === "--node") opts.node = resolve(argv[++i]);
  else if (a === "--env") { const [k, ...v] = argv[++i].split("="); opts.env[k] = v.join("="); }
  else if (a === "--quiet") opts.quiet = true;
  else throw new Error(`Unknown option ${a}`);
}

const IGNORED_HEADERS = new Set(["host", "user-agent", "accept-encoding", "accept-language", "sec-fetch-mode", "connection",
  "content-length", "transfer-encoding", "x-guesty-test-origin"]);
const now = Date.now();
let requests = [];
let reply = undefined;
let replies = undefined;
let replyIndex = 0;

async function normalizeBody(req, body) {
  const type = req.headers["content-type"] ?? "";
  if (!body.length) return undefined;
  if (type.startsWith("multipart/form-data")) {
    const form = await new Request("http://x/", { method: "POST", headers: { "content-type": type }, body }).formData();
    const fields = [];
    for (const [name, value] of form.entries()) {
      fields.push(typeof value === "string" ? { name, value } : { name, filename: value.name, type: value.type, base64: Buffer.from(await value.arrayBuffer()).toString("base64") });
    }
    return { multipart: fields };
  }
  const text = body.toString("utf8");
  return Buffer.from(text, "utf8").equals(body) ? text : { base64: body.toString("base64") };
}

const server = createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    const origin = req.headers["x-guesty-test-origin"] ?? "http://unknown";
    const url = `${origin}${req.url}`;
    const headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => !IGNORED_HEADERS.has(k)).sort());
    if (headers["content-type"]?.startsWith("multipart/form-data")) headers["content-type"] = "multipart/form-data";
    const body = await normalizeBody(req, Buffer.concat(chunks));
    requests.push({ method: req.method, url, headers, body });
    const send = (status, payload, extra = {}) => {
      const data = typeof payload === "string" ? payload : JSON.stringify(payload);
      res.writeHead(status, { "content-type": "application/json", ...extra });
      res.end(data);
    };
    const path = new URL(url).pathname;
    if (origin === "https://tokens.invalid" && path === "/v1/token") {
      const type = typeof body === "string" ? JSON.parse(body).token_type : "openapi";
      return send(200, { token_type: type, access_token: `parity-fake-${type}-token`, expires_at: now + 36_000_000 });
    }
    if (origin === "https://tokens.invalid") return send(200, { ok: true });
    if (origin === "https://api.github.com") return send(404, {});
    // "replies" answers API requests in turn (the last one repeats); "reply" answers all of them.
    const r = (replies ? replies[Math.min(replyIndex++, replies.length - 1)] : reply) ?? { status: 200, json: { ok: true } };
    if (r.raw !== undefined) return send(r.status ?? 200, r.raw, r.headers ?? {});
    return send(r.status ?? 200, r.json ?? {}, r.headers ?? {});
  });
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const mock = `http://127.0.0.1:${server.address().port}`;

function run(command, args, stdin, extraEnv) {
  const home = mkdtempSync(join(tmpdir(), "guesty-parity-home-"));
  mkdirSync(join(home, ".guesty-cli"), { mode: 0o700 });
  writeFileSync(join(home, ".guesty-cli", ".env"), `GUESTY_TOKEN_SERVICE_URL=https://tokens.invalid\nGUESTY_TOKEN_SERVICE_KEY=gts_${"P".repeat(43)}\n`);
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(GUESTY_|SUPABASE_|NODE_OPTIONS)/.test(k)));
  Object.assign(env, { HOME: home, GUESTY_TEST_REDIRECT: mock, NO_COLOR: "1", COLUMNS: "80" }, extraEnv);
  return new Promise((ok) => {
    const child = spawn(command[0], [...command.slice(1), ...args], { cwd: home, env, stdio: ["pipe", "pipe", "pipe"] });
    const out = [], err = [];
    child.stdout.on("data", (c) => out.push(c));
    child.stderr.on("data", (c) => err.push(c));
    child.on("close", (code) => {
      rmSync(home, { recursive: true, force: true });
      ok({ code, stdout: Buffer.concat(out).toString("utf8").replaceAll(home, "$HOME"), stderr: Buffer.concat(err).toString("utf8").replaceAll(home, "$HOME") });
    });
    child.stdin.end(stdin ?? "");
  });
}

const nodeCommand = [process.execPath, "--import", join(root, "scripts/parity/node-hook.mjs"), opts.node];
let failures = 0;
for (const c of cases) {
  const stdin = c.stdin ?? opts.stdin;
  reply = c.reply ?? opts.reply;
  replies = c.replies;
  const env = { ...opts.env, ...(c.env ?? {}) };
  requests = [];
  replyIndex = 0;
  const node = await run(nodeCommand, c.args, stdin, env);
  const nodeRequests = requests;
  requests = [];
  replyIndex = 0;
  const rust = await run([opts.rust], c.args, stdin, env);
  const rustRequests = requests;
  // The versions differ by design.
  const version = (s) => s.replace(/^\d+\.\d+\.\d+(-[\w.]+)?\n$/, "<version>\n");
  const diffs = [];
  if (node.code !== rust.code) diffs.push(`exit: node ${node.code}, rust ${rust.code}`);
  if (version(node.stdout) !== version(rust.stdout)) diffs.push(`stdout:\n--- node\n${node.stdout}\n--- rust\n${rust.stdout}`);
  if (node.stderr !== rust.stderr) diffs.push(`stderr:\n--- node\n${node.stderr}\n--- rust\n${rust.stderr}`);
  const nr = JSON.stringify(nodeRequests, null, 1), rr = JSON.stringify(rustRequests, null, 1);
  if (nr !== rr) diffs.push(`requests:\n--- node\n${nr}\n--- rust\n${rr}`);
  const label = JSON.stringify(c.args);
  if (diffs.length) {
    failures++;
    console.log(`DIFF ${label}\n${diffs.join("\n")}\n`);
  } else if (!opts.quiet) {
    console.log(`same ${label} (exit ${node.code}, ${nodeRequests.length} request${nodeRequests.length === 1 ? "" : "s"})`);
  }
}
server.close();
console.log(`${cases.length - failures}/${cases.length} cases match`);
process.exit(failures ? 1 : 0);
