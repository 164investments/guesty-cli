#!/usr/bin/env node
// Drives the Node MCP server (PR #18, `guesty mcp` 1.6.0) and the Rust one
// (a test-hooks build) with the same JSON-RPC messages against the same local
// mock, and compares every reply byte for byte (except serverInfo.version),
// stderr, the exit code and every HTTP request they make.
//
//   cargo build --features test-hooks
//   node scripts/parity/mcp-parity.mjs [--node <a 1.6 build of PR #18: dist/cli.js>] [--rust <binary>] [--only <name>] [--quiet]
//
// Golden mode, for CI once no Node build is around: --record runs only the
// Node server and saves its results in scripts/parity/cases/mcp-golden.json.gz;
// --golden compares the Rust server with that file instead of running Node.
//
// Nothing reaches Guesty: both servers send every request to the mock, and
// HOME is a fresh temporary directory configured with a fake token service.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const opts = { rust: join(root, "target/debug/guesty"), node: join(root, "dist/cli.js"), quiet: false, only: undefined };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--rust") opts.rust = resolve(argv[++i]);
  else if (argv[i] === "--node") opts.node = resolve(argv[++i]);
  else if (argv[i] === "--only") opts.only = argv[++i];
  else if (argv[i] === "--quiet") opts.quiet = true;
  else if (argv[i] === "--record") opts.record = true;
  else if (argv[i] === "--golden") opts.golden = true;
  else throw new Error(`Unknown option ${argv[i]}`);
}

// ─── The mock ────────────────────────────────────────────────────────────────

const IGNORED_HEADERS = new Set(["host", "user-agent", "accept-encoding", "accept-language", "sec-fetch-mode", "connection",
  "content-length", "transfer-encoding", "x-guesty-test-origin"]);
// A fixed expiry keeps every run's output identical.
const EXPIRES_AT = 4_102_444_800_000;
const GOLDEN_FILE = join(root, "scripts/parity/cases/mcp-golden.json.gz");
const golden = opts.golden ? JSON.parse(gunzipSync(readFileSync(GOLDEN_FILE)).toString("utf8")) : {};
const recording = {};
let state;

const server = createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const origin = req.headers["x-guesty-test-origin"] ?? "http://unknown";
    const url = `${origin}${req.url}`;
    const headers = Object.fromEntries(Object.entries(req.headers).filter(([k]) => !IGNORED_HEADERS.has(k)).sort());
    const raw = Buffer.concat(chunks);
    const body = raw.length ? raw.toString("utf8") : undefined;
    state.requests.push({ method: req.method, url, headers, body });
    const send = (status, payload, extra = {}) => {
      res.writeHead(status, { "content-type": "application/json", ...extra });
      res.end([204, 205, 304].includes(status) ? undefined : typeof payload === "string" ? payload : JSON.stringify(payload));
    };
    const path = new URL(url).pathname;
    if (origin === "https://tokens.invalid" && path === "/v1/token") {
      const type = body ? JSON.parse(body).token_type : "openapi";
      return send(200, { token_type: type, access_token: `parity-fake-${type}-token`, expires_at: EXPIRES_AT });
    }
    if (origin === "https://tokens.invalid") {
      const r = state.c.tokenService?.[`${req.method} ${path}`] ?? { status: 404, json: { error: "not_found", message: "Not found." } };
      return r.raw !== undefined ? send(r.status ?? 200, r.raw, r.headers) : send(r.status ?? 200, r.json ?? {}, r.headers);
    }
    // "replies" answers API requests in turn (the last one repeats); "reply" answers all of them.
    const c = state.c;
    const r = (c.replies ? c.replies[Math.min(state.replyIndex++, c.replies.length - 1)] : c.reply) ?? { status: 200, json: { ok: true } };
    if (r.raw !== undefined) return send(r.status ?? 200, r.raw, r.headers ?? {});
    return send(r.status ?? 200, r.json ?? {}, r.headers ?? {});
  });
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const mock = `http://127.0.0.1:${server.address().port}`;

// ─── Running a server ────────────────────────────────────────────────────────

function expectsReply(line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return line.trim() ? 1 : 0;
  }
  if (!message || typeof message !== "object" || Array.isArray(message)) return 1;
  return typeof message.method === "string" && message.id !== undefined ? 1 : 0;
}

function run(command, c) {
  const home = mkdtempSync(join(tmpdir(), "guesty-mcp-parity-"));
  const project = join(home, "project");
  mkdirSync(project);
  if (c.home !== "none") {
    mkdirSync(join(home, ".guesty-cli"), { mode: 0o700 });
    writeFileSync(join(home, ".guesty-cli", ".env"), c.homeEnv ?? `GUESTY_TOKEN_SERVICE_URL=https://tokens.invalid\nGUESTY_TOKEN_SERVICE_KEY=gts_${"P".repeat(43)}\n`);
  }
  if (c.cwdEnv) writeFileSync(join(project, ".env"), c.cwdEnv);
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(GUESTY_|SUPABASE_|NODE_OPTIONS)/.test(k)));
  Object.assign(env, { HOME: home, GUESTY_TEST_REDIRECT: mock, NO_COLOR: "1", COLUMNS: "80" }, c.env ?? {});
  return new Promise((ok) => {
    const child = spawn(command[0], [...command.slice(1), ...(c.args ?? ["mcp"])], { cwd: project, env, stdio: ["pipe", "pipe", "pipe"] });
    const out = [];
    const err = [];
    let buffered = "";
    const lines = [];
    let waiter;
    child.stdout.on("data", (chunk) => {
      out.push(chunk);
      buffered += chunk.toString("utf8");
      let at;
      while ((at = buffered.indexOf("\n")) >= 0) {
        lines.push(buffered.slice(0, at));
        buffered = buffered.slice(at + 1);
      }
      waiter?.();
    });
    child.stderr.on("data", (chunk) => err.push(chunk));
    const waitFor = (count) => new Promise((done) => {
      const timer = setTimeout(done, 20_000);
      waiter = () => { if (lines.length >= count) { clearTimeout(timer); waiter = undefined; done(); } };
      waiter();
    });
    // A server that exits before reading all input closes the pipe; that is not a failure.
    child.stdin.on("error", () => {});
    child.on("close", (code) => {
      rmSync(home, { recursive: true, force: true });
      const clean = (s) => s.replaceAll(home, "$HOME");
      ok({ code, lines: lines.map(clean), tail: clean(buffered), stdout: clean(Buffer.concat(out).toString("utf8")), stderr: clean(Buffer.concat(err).toString("utf8")) });
    });
    (async () => {
      if (c.raw !== undefined) {
        child.stdin.end(c.raw);
        return;
      }
      const all = c.messages.map((m) => (typeof m === "string" ? m : JSON.stringify(m)));
      if (!c.sequential) {
        child.stdin.end(all.map((l) => `${l}\n`).join(""));
        return;
      }
      let expected = 0;
      for (const line of all) {
        child.stdin.write(`${line}\n`);
        expected += expectsReply(line);
        await waitFor(expected);
      }
      child.stdin.end();
    })();
  });
}

// ─── Cases ───────────────────────────────────────────────────────────────────

let nextId = 1;
const INIT = { jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "parity", version: "1" } } };
const INITIALIZED = { jsonrpc: "2.0", method: "notifications/initialized" };
const call = (name, args) => ({ jsonrpc: "2.0", id: nextId++, method: "tools/call", params: args === undefined ? { name } : { name, arguments: args } });
const search = (args) => call("search_operations", args);
const describe = (operation) => call("describe_operation", { operation });
const callOp = (args) => call("call_operation", args);
const session = (...messages) => [INIT, INITIALIZED, ...messages];
const SERVICE_ENV = { GUESTY_TOKEN_SERVICE_URL: "https://tokens.invalid", GUESTY_TOKEN_SERVICE_KEY: `gts_${"S".repeat(43)}` };
const catalogEntries = (file) => Object.values(JSON.parse(readFileSync(join(root, file), "utf8"))).flat();
const openApi = catalogEntries("api-spec.json");
const bookingEngine = catalogEntries("booking-engine-api-spec.json");
const everyOp = [...openApi, ...bookingEngine];

const cases = [];
const add = (name, c) => cases.push({ name, ...c });

// Protocol.
for (const version of ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05", "1999-01-01", 20250618, null]) {
  add(`initialize ${version}`, { messages: [{ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: version } }] });
}
add("initialize without params", { messages: [{ jsonrpc: "2.0", id: 1, method: "initialize" }] });
add("initialize with array params", { messages: [{ jsonrpc: "2.0", id: 1, method: "initialize", params: ["2024-11-05"] }] });
add("initialize read-only", { args: ["mcp", "--read-only"], messages: [INIT] });
add("initialize read-only from env", { env: { GUESTY_MCP_READ_ONLY: "1" }, messages: [INIT] });
add("initialize env not 1", { env: { GUESTY_MCP_READ_ONLY: "true" }, messages: [INIT] });
add("lists", { messages: session(
  { jsonrpc: "2.0", id: 1, method: "tools/list" },
  { jsonrpc: "2.0", id: 2, method: "ping" },
  { jsonrpc: "2.0", id: 3, method: "resources/list" },
  { jsonrpc: "2.0", id: 4, method: "resources/templates/list" },
  { jsonrpc: "2.0", id: 5, method: "prompts/list" },
  { jsonrpc: "2.0", id: 6, method: "nope" },
  { jsonrpc: "2.0", id: 7, method: "tools/list", params: { cursor: "x" } },
) });
add("ids", { sequential: true, messages: [
  { jsonrpc: "2.0", id: "abc", method: "ping" },
  { jsonrpc: "2.0", id: null, method: "ping" },
  { jsonrpc: "2.0", id: 0, method: "ping" },
  '{"jsonrpc":"2.0","id":1.50,"method":"ping"}',
  '{"jsonrpc":"2.0","id":1e21,"method":"ping"}',
  { jsonrpc: "2.0", id: { a: 1 }, method: "ping" },
  { jsonrpc: "2.0", id: [1, "x"], method: "ping" },
  { jsonrpc: "2.0", id: true, method: "ping" },
  '{"jsonrpc":"2.0","id":"\\u00e9\\n","method":"ping"}',
  '{"id":2,"id":3,"method":"ping"}',
] });
add("no reply needed", { sequential: true, messages: [
  { jsonrpc: "2.0", method: "notifications/cancelled", params: {} },
  { jsonrpc: "2.0", id: 1, result: {} },
  { jsonrpc: "2.0", id: 2, method: 5 },
  { jsonrpc: "2.0", id: 9, method: "ping" },
] });
add("bad lines", { sequential: true, messages: ["not json", "[]", "null", "1", "\"x\"", "true", "{\"a\":", "[{\"id\":1,\"method\":\"ping\"}]", "0", "{}", "{\"id\":4,\"method\":\"ping\"} x", " {\"id\":5,\"method\":\"ping\"}"] });
add("blank lines, CRLF, CR and a last line without a newline", { raw: '\n   \n\t\n{"jsonrpc":"2.0","id":1,"method":"ping"}\r\n{"jsonrpc":"2.0","id":2,"method":"ping"}\r{"jsonrpc":"2.0","id":3,"method":"ping"}\r\r\n \n{"jsonrpc":"2.0","id":4,"method":"ping"}' });
add("line separators inside a message", { raw: '{"jsonrpc":"2.0","id":1,"method":"ping"}\u2028{"jsonrpc":"2.0","id":2,"method":"ping"}\u2029{"id":3,"method":"tools/call","params":{"name":"search_operations","arguments":{"query":"a\u2028b"}}}\n' });
add("invalid UTF-8", { raw: Buffer.from([0x7b, 0x22, 0x69, 0x64, 0x22, 0x3a, 0x22, 0xff, 0xfe, 0x22, 0x2c, 0x22, 0x6d, 0x65, 0x74, 0x68, 0x6f, 0x64, 0x22, 0x3a, 0x22, 0x70, 0x69, 0x6e, 0x67, 0x22, 0x7d, 0x0a]) });
add("empty input", { raw: "" });
add("extra arguments still serve", { args: ["mcp", "extra"], messages: [INIT] });
add("unknown tools", { messages: session(
  call("nope", {}),
  { jsonrpc: "2.0", id: 101, method: "tools/call" },
  { jsonrpc: "2.0", id: 102, method: "tools/call", params: { name: 5 } },
  { jsonrpc: "2.0", id: 103, method: "tools/call", params: { name: ["search_operations", null, ["x"]] } },
  { jsonrpc: "2.0", id: 104, method: "tools/call", params: { name: null } },
  { jsonrpc: "2.0", id: 105, method: "tools/call", params: { name: { a: 1 } } },
  { jsonrpc: "2.0", id: 106, method: "tools/call", params: "search_operations" },
  { jsonrpc: "2.0", id: 107, method: "tools/call", params: { name: 1.5e300 } },
) });
add("arguments that aren't objects", { messages: session(
  { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "search_operations", arguments: ["listings"] } },
  { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "search_operations", arguments: "listings" } },
  { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "describe_operation", arguments: null } },
  { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "search_operations" } },
) });

// Search.
const queries = [
  "listings", "cancel a reservation", "quote", "List reservations", "GET /v1/webhooks", "/v1/reservations", "/v1/listings/{id}",
  "send a guest message", "listing calendar availability", "payout", "refund a payment", "owner statements", "cleaning tasks",
  "create a webhook", "update listing price", "booking engine quote", "reviews", "constructor", "constructors list",
  "xyzzy nothing", "   ", "", "the a of", "PUT /v1/listings/{id}", "reservationsv2listcsvdownload", "getListings", "ListingsController",
  "check in this week", "checkins", "cancelled bookings", "messaging", "msg guests", "house rental pricing", "available homes",
  "/", "/v", "/v1/", "  GET   /v1/listings  ", "delete /v1/webhooks/{id}", "guests", "boxes", "addresses", "statuses",
  "inbox conversation", "chat", "block calendar", "show me everything", "integrations", "accounting categories", "saved replies",
  "custom fields", "taxes", "promotions", "rate plans", "rate strategies", "price adjustments", "users", "invoice items",
  "guest app", "guest code", "airbnb", "marketing", "payment providers", "channel commission", "basic fees", "additional fees",
  "icalendar", "block logs", "user scope", "properties export csv", "reservations csv download", "reservation 2", "v1 v2 v3",
  "ÉLÈVE İstanbul", "naïve café", "Ｌｉｓｔｉｎｇｓ", "listings calendar", "x".repeat(2000),
];
add("searches", { messages: session(...queries.map((query) => search({ query }))) });
add("search options", { messages: session(
  search({ query: "quote", api: "booking-engine" }),
  search({ query: "quote", api: "open-api" }),
  search({ query: "quote", api: "both" }),
  search({ query: "quote", api: "nope" }),
  search({ query: "reservations", limit: 3 }),
  search({ query: "reservations", limit: 0 }),
  search({ query: "reservations", limit: -5 }),
  search({ query: "reservations", limit: 1.9 }),
  search({ query: "reservations", limit: 100 }),
  search({ query: "reservations", limit: "5" }),
  search({ query: "reservations", limit: null }),
  search({ query: "List reservations", include_deprecated: true, limit: 25 }),
  search({ query: "List reservations", limit: 25 }),
  search({ query: "List reservations", include_deprecated: "yes", limit: 25 }),
  search({ query: 5 }),
  search({}),
  search({ query: " ﻿" }),
) });
add("search every title", { messages: session(...everyOp.map((op) => search({ query: op.title, limit: 25, include_deprecated: true }))) });
add("search every path", { messages: session(...everyOp.filter((_, i) => i % 3 === 0).map((op) => search({ query: `${op.method} ${op.path}` }))) });

// Describe.
add("describe every operation", { messages: session(...everyOp.map((op) => describe(op.slug))) });
add("describe by operationId and route", { messages: session(
  ...everyOp.filter((op) => op.operationId).filter((_, i) => i % 4 === 0).map((op) => describe(op.operationId)),
  ...everyOp.filter((_, i) => i % 4 === 1).map((op) => describe(`${op.method.toLowerCase()}  ${op.path}`)),
) });
add("describe errors", { messages: session(
  describe("list-the-listings"), describe("nothing-like-it-zzz"), describe(""), describe("   "), describe("constructor"),
  call("describe_operation", { operation: 5 }), call("describe_operation", {}), describe("GET /v1/listings x"), describe("GET/v1/listings"),
) });

// Calls.
const LISTING = { json: { _id: "abc/def", title: "Seaside" } };
add("read", { sequential: true, reply: LISTING, messages: session(callOp({ operation: "GET /v1/listings/{id}", path_params: { id: "abc/def ü?&" }, query: { fields: "title address", limit: 5, ok: true, ids: ["a", "b", 3], skip: null } })) });
add("read with numeric path value", { sequential: true, reply: LISTING, messages: session(callOp({ operation: "GET /v1/listings/{id}", path_params: { id: 12.50 } })) });
add("change preview and confirm", { sequential: true, reply: { json: { _id: "L1", title: "New title" } }, messages: session(
  callOp({ operation: "PUT /v1/listings/{id}", path_params: { id: "L1" }, body: { title: "New title", n: [1, { x: null }] } }),
  callOp({ operation: "PUT /v1/listings/{id}", path_params: { id: "L1" }, query: { a: "b" }, body: { title: "New title" } }),
  callOp({ operation: "PUT /v1/listings/{id}", path_params: { id: "L1" }, query: {} }),
  callOp({ operation: "PUT /v1/listings/{id}", path_params: { id: "L1" }, body: null, confirm: "true" }),
  callOp({ operation: "PUT /v1/listings/{id}", path_params: { id: "L1" }, body: { title: "New title" }, confirm: true }),
) });
add("bodies", { sequential: true, reply: { json: { ok: 1 } }, messages: session(
  callOp({ operation: "POST /v1/webhooks", body: "plain text", confirm: true }),
  callOp({ operation: "POST /v1/webhooks", body: null, confirm: true }),
  callOp({ operation: "POST /v1/webhooks", body: 42.0, confirm: true }),
  callOp({ operation: "POST /v1/webhooks", body: [1, "2"], confirm: true }),
  callOp({ operation: "POST /v1/webhooks", confirm: true }),
  callOp({ operation: "POST /v1/owners/{ownerId}/documents", path_params: { ownerId: "o" }, body: {} }),
  callOp({ operation: "POST /v1/owners/{ownerId}/documents", path_params: { ownerId: "o" }, confirm: true }),
) });
add("read-only flag", { sequential: true, args: ["mcp", "--read-only"], env: SERVICE_ENV, reply: { json: { results: [] } }, messages: session(
  callOp({ operation: "DELETE /v1/webhooks/{id}", path_params: { id: "W1" }, confirm: true }),
  call("invite_teammate", { name: "Alex" }),
  callOp({ operation: "GET /v1/webhooks" }),
) });
add("read-only env", { sequential: true, env: { GUESTY_MCP_READ_ONLY: "1" }, reply: { json: { results: [] } }, messages: session(
  callOp({ operation: "DELETE /v1/webhooks/{id}", path_params: { id: "W1" } }),
  call("invite_teammate", { name: "" }),
  callOp({ operation: "post_additional-fees-quotes-quoteid-amount", path_params: { quoteId: "q" }, body: {} }),
) });
add("argument checks", { sequential: true, messages: session(
  callOp({ operation: "GET /v1/listings/{id}" }),
  callOp({ operation: "GET /v1/listings/{id}", path_params: { id: "" } }),
  callOp({ operation: "GET /v1/listings/{id}", path_params: { id: null } }),
  callOp({ operation: "GET /v1/listings/{id}", path_params: { id: true } }),
  callOp({ operation: "GET /v1/listings/{id}", path_params: { id: ["x"] } }),
  callOp({ operation: "GET /v1/listings", path_params: { id: "x", "2": "y", b: 1 } }),
  callOp({ operation: "GET /v1/listings", path_params: ["x"] }),
  callOp({ operation: "GET /v1/listings", path_params: "x" }),
  callOp({ operation: "GET /v1/listings", query: "limit=1" }),
  callOp({ operation: "GET /v1/listings", query: [1] }),
  callOp({ operation: "GET /v1/listings", query: { filter: { a: 1 } } }),
  callOp({ operation: "GET /v1/listings", query: { n: [1, null] } }),
  callOp({ operation: "GET /v1/listings", body: {} }),
  callOp({ operation: "PUT /v1/listings/{id}", path_params: { id: "x" }, all_pages: true }),
  callOp({ operation: "GET /api/listings", all_pages: true }),
  callOp({ operation: "nope-nothing" }),
  callOp({ operation: "" }),
  callOp({}),
  callOp({ operation: "cancel the constructor" }),
) });
add("all pages", { sequential: true, replies: [{ json: { results: [{ _id: "1" }, { _id: "2" }], count: 3 } }, { json: { results: [{ _id: "3" }], count: 3 } }], messages: session(callOp({ operation: "GET /v1/listings", all_pages: true, query: { limit: 2, fields: "title" } })) });
add("all pages repeated record", { sequential: true, reply: { json: { results: [{ _id: "1" }], count: 5 } }, messages: session(callOp({ operation: "GET /v1/listings", all_pages: true })) });
add("all pages false", { sequential: true, reply: { json: { results: [] } }, messages: session(callOp({ operation: "GET /v1/listings", all_pages: false })) });
add("booking engine", { sequential: true, reply: { json: { results: [{ _id: "B1" }] } }, messages: session(
  callOp({ operation: "GET /api/listings", query: { limit: 1 } }),
  callOp({ operation: "POST /api/reservations/quotes", body: { listingId: "B1" } }),
  callOp({ operation: "POST /api/reservations/quotes", body: { listingId: "B1" }, confirm: true }),
) });
add("booking engine text", { sequential: true, reply: { raw: "hello", headers: { "content-type": "text/plain" } }, messages: session(callOp({ operation: "GET /api/listings" })) });
add("large response", { sequential: true, reply: { json: { results: ["x".repeat(80_000)] } }, messages: session(callOp({ operation: "GET /v1/listings" })) });
add("large response cut inside a character", { sequential: true, replies: [{ json: { r: "😀".repeat(40_000) } }, { json: { rr: "😀".repeat(40_000) } }], messages: session(callOp({ operation: "GET /v1/listings" }), callOp({ operation: "GET /v1/listings" })) });
add("exactly 60,000", { sequential: true, reply: { raw: "y".repeat(60_000), headers: { "content-type": "text/plain" } }, messages: session(callOp({ operation: "GET /v1/listings" })) });
add("60,001", { sequential: true, reply: { raw: "y".repeat(60_001), headers: { "content-type": "text/csv" } }, messages: session(callOp({ operation: "GET /v1/listings" })) });
add("file", { sequential: true, reply: { raw: "PDFDATA", headers: { "content-type": "application/pdf" } }, messages: session(callOp({ operation: "GET /v1/listings" })) });
add("big file", { sequential: true, reply: { raw: "P".repeat(1_234_567), headers: { "content-type": "application/octet-stream" } }, messages: session(callOp({ operation: "GET /v1/listings" })) });
add("no content", { sequential: true, reply: { status: 204 }, messages: session(callOp({ operation: "GET /v1/listings" }), callOp({ operation: "DELETE /v1/webhooks/{id}", path_params: { id: "W" }, confirm: true })) });
add("JSON string and null", { sequential: true, replies: [{ raw: "\"just text\"" }, { raw: "null" }, { raw: "[]" }, { raw: "" }], messages: session(...[1, 2, 3, 4].map(() => callOp({ operation: "GET /v1/listings" }))) });
add("API errors", { sequential: true, replies: [{ status: 404, json: { message: "Not found" } }, { status: 403, json: {} }, { status: 400, raw: "bad" }, { status: 409, json: { e: 1 } }], messages: session(
  callOp({ operation: "GET /v1/listings" }), callOp({ operation: "GET /v1/listings" }), callOp({ operation: "GET /v1/listings" }),
  callOp({ operation: "PUT /v1/listings/{id}", path_params: { id: "x" }, confirm: true }),
) });
add("concurrent calls", { reply: { json: { ok: true } }, messages: session(
  ...Array.from({ length: 6 }, (_, i) => callOp({ operation: "GET /v1/listings/{id}", path_params: { id: `L${i}` } })),
  search({ query: "listings" }),
  { jsonrpc: "2.0", id: 999, method: "ping" },
) });
add("no team and no cache", { sequential: true, home: "none", messages: session(callOp({ operation: "GET /v1/listings" }), callOp({ operation: "GET /api/listings" }), call("team_status"), call("invite_teammate", { name: "A" })) });
add("cwd .env is ignored", { sequential: true, home: "none", cwdEnv: `GUESTY_TOKEN_SERVICE_URL=https://tokens.invalid\nGUESTY_TOKEN_SERVICE_KEY=gts_${"C".repeat(43)}\nGUESTY_MCP_READ_ONLY=1\n`, tokenService: { "GET /v1/team": { json: { team: { name: "Seaside" } } } }, messages: session(call("team_status"), callOp({ operation: "GET /v1/listings" })) });

// Team.
const INVITES = (reply) => ({ "GET /v1/team": { json: { team: { name: "Seaside Stays", max_requests_per_day: 3 }, keys: [] } }, "POST /v1/team/invites": reply });
const expires = 1_800_604_800_000;
add("team", { sequential: true, env: SERVICE_ENV, tokenService: INVITES({ json: { link: "https://tokens.invalid/join/ABCD-EFGH-JKMN", expires_at: expires, email: { address: "alex@example.com", sent: true } } }), messages: session(
  call("team_status"),
  call("team_status", { extra: 1 }),
  call("invite_teammate", { name: "  Alex Rivera ", email: " alex@example.com ", confirm: true }),
  call("invite_teammate", { name: "Sam", confirm: true }),
  call("invite_teammate", { name: "Lee", email: "not-an-email", confirm: true }),
  call("invite_teammate", { name: "Mallory", email: "mallory@example.com" }),
  call("invite_teammate", { name: "Mallory" }),
  call("invite_teammate", { name: "Mallory", email: "mallory@example.com", admin: true, confirm: true }),
  call("invite_teammate", { name: "Mallory", admin: "true" }),
  call("invite_teammate", { name: 5 }),
  call("invite_teammate", {}),
  call("invite_teammate", { name: "X", email: 5 }),
) });
for (const email of ["a@b.c", "a@.bc", "a@bc.", "a@b..c", "a b@c.d", "a@b@c.d", "@b.c", "a@b", "a(b)@c.d", "ü@ß.de", "a@b.c x", "a@b.c."]) {
  add(`email ${email}`, { env: SERVICE_ENV, messages: session(call("invite_teammate", { name: "N", email })) });
}
add("invite not emailed", { sequential: true, env: SERVICE_ENV, tokenService: INVITES({ json: { link: "https://tokens.invalid/join/ABCD-EFGH-JKMN", expires_at: 1_784_000_000_000, email: { address: "x@y.z", sent: false, message: "Daily email limit reached." } } }), messages: session(call("invite_teammate", { name: "Pat", email: "x@y.z", confirm: true })) });
add("invite not emailed, no reason", { sequential: true, env: SERVICE_ENV, tokenService: INVITES({ json: { link: "https://tokens.invalid/join/ABCD-EFGH-JKMN", expires_at: 0, email: { sent: "yes" } } }), messages: session(call("invite_teammate", { name: "Pat", email: "x@y.z", confirm: true }), call("invite_teammate", { name: "Pat", confirm: true })) });
add("invite without expiry", { sequential: true, env: SERVICE_ENV, tokenService: INVITES({ json: { link: "https://tokens.invalid/join/abcd-efgh-jkmn" } }), messages: session(call("invite_teammate", { name: "Pat", confirm: true })) });
add("invite bad links", { sequential: true, env: SERVICE_ENV, tokenService: INVITES({ json: { link: "https://elsewhere.invalid/join/ABCD-EFGH-JKMN", expires_at: expires } }), messages: session(call("invite_teammate", { name: "Pat", confirm: true })) });
add("invite no link", { sequential: true, env: SERVICE_ENV, tokenService: INVITES({ json: { expires_at: expires } }), messages: session(call("invite_teammate", { name: "Pat", confirm: true })) });
add("team refusals", { sequential: true, env: SERVICE_ENV, tokenService: { "GET /v1/team": { status: 403, json: { error: "forbidden", message: "Only team admins can do that.\u001b[31m" } }, "POST /v1/team/invites": { status: 429, json: { error: "limited" } } }, messages: session(call("team_status"), call("invite_teammate", { name: "Pat", confirm: true })) });
add("team unexpected reply", { sequential: true, env: SERVICE_ENV, tokenService: { "GET /v1/team": { status: 200, raw: "<html>" } }, messages: session(call("team_status")) });
add("bad service URL", { sequential: true, env: { GUESTY_TOKEN_SERVICE_URL: "http://example.com", GUESTY_TOKEN_SERVICE_KEY: "k" }, messages: session(call("team_status"), call("invite_teammate", { name: "A" })) });

// ─── Compare ─────────────────────────────────────────────────────────────────

const VERSION = /"serverInfo":\{"name":"guesty-cli","title":"Guesty CLI","version":"[^"]*"\}/g;
const normalize = (line) => line.replace(VERSION, '"serverInfo":{"name":"guesty-cli","title":"Guesty CLI","version":"<version>"}');
const idOf = (line) => { try { return JSON.stringify(JSON.parse(line).id); } catch { return ""; } };
const nodeCommand = [process.execPath, "--import", join(root, "scripts/parity/node-hook.mjs"), opts.node];
let failures = 0;
let total = 0;
for (const c of cases) {
  if (opts.only && !c.name.includes(opts.only)) continue;
  total++;
  state = { c, requests: [], replyIndex: 0 };
  const node = opts.golden ? golden[c.name] : await run(nodeCommand, c);
  if (!node) throw new Error(`No golden result for ${c.name}; record with --record`);
  const nodeRequests = opts.golden ? node.requests : state.requests;
  if (opts.record) {
    recording[c.name] = { ...node, requests: nodeRequests };
    continue;
  }
  state = { c, requests: [], replyIndex: 0 };
  const rust = await run([opts.rust], c);
  const rustRequests = state.requests;
  const order = (lines) => (c.sequential || c.raw !== undefined ? lines : [...lines].sort((a, b) => (idOf(a) < idOf(b) ? -1 : idOf(a) > idOf(b) ? 1 : 0)));
  const nl = order(node.lines.map(normalize));
  const rl = order(rust.lines.map(normalize));
  const diffs = [];
  if (node.code !== rust.code) diffs.push(`exit: node ${node.code}, rust ${rust.code}`);
  if (nl.length !== rl.length) diffs.push(`replies: node ${nl.length}, rust ${rl.length}`);
  for (let i = 0; i < Math.max(nl.length, rl.length); i++) {
    if (nl[i] !== rl[i]) {
      diffs.push(`reply ${i}:\n--- node\n${nl[i]?.slice(0, 3000)}\n--- rust\n${rl[i]?.slice(0, 3000)}`);
      if (diffs.length > 4) break;
    }
  }
  if (node.tail !== rust.tail) diffs.push(`unterminated stdout: node ${JSON.stringify(node.tail)}, rust ${JSON.stringify(rust.tail)}`);
  if (node.stderr !== rust.stderr) diffs.push(`stderr:\n--- node\n${node.stderr}\n--- rust\n${rust.stderr}`);
  const sortRequests = (list) => (c.sequential ? list : [...list].map((r) => JSON.stringify(r)).sort().map((r) => JSON.parse(r)));
  const nr = JSON.stringify(sortRequests(nodeRequests), null, 1);
  const rr = JSON.stringify(sortRequests(rustRequests), null, 1);
  if (nr !== rr) diffs.push(`requests:\n--- node\n${nr.slice(0, 4000)}\n--- rust\n${rr.slice(0, 4000)}`);
  if (diffs.length) {
    failures++;
    console.log(`DIFF ${c.name}\n${diffs.join("\n")}\n`);
  } else if (!opts.quiet) {
    console.log(`same ${c.name} (${nl.length} replies, ${nodeRequests.length} requests)`);
  }
}

// `mcp install --print`: the launch command differs by design. Node runs node
// with its script; the native binary runs itself. Compare the rest.
async function printed(command, args) {
  const result = await run(command, { args, raw: "" });
  return { ...result, json: result.code === 0 ? JSON.parse(result.stdout) : undefined };
}
for (const extra of [[], ["--read-only"]]) {
  if (opts.only && !"install --print".includes(opts.only)) break;
  total++;
  state = { c: {}, requests: [], replyIndex: 0 };
  const key = `install --print ${extra.join(" ")}`;
  const node = opts.golden ? golden[key] : await printed(nodeCommand, ["mcp", "install", "--print", ...extra]);
  if (opts.record) {
    recording[key] = node;
    continue;
  }
  const rust = await printed([opts.rust], ["mcp", "install", "--print", ...extra]);
  const n = node.json?.mcpServers?.["guesty-cli"];
  const r = rust.json?.mcpServers?.["guesty-cli"];
  const problems = [];
  if (node.code !== 0 || rust.code !== 0) problems.push(`exit: node ${node.code}, rust ${rust.code}\n${node.stderr}${rust.stderr}`);
  if (JSON.stringify(Object.keys(node.json ?? {})) !== JSON.stringify(Object.keys(rust.json ?? {}))) problems.push("top-level keys differ");
  if (JSON.stringify(Object.keys(n ?? {})) !== JSON.stringify(Object.keys(r ?? {}))) problems.push("server keys differ");
  if (!n?.args?.[0]?.endsWith("bin.js") || JSON.stringify(n.args.slice(1)) !== JSON.stringify(r?.args)) problems.push(`args: node ${JSON.stringify(n?.args)}, rust ${JSON.stringify(r?.args)}`);
  if (r?.command !== realpathSync(opts.rust)) problems.push(`rust command ${r?.command} is not ${realpathSync(opts.rust)}`);
  if (node.stderr !== rust.stderr) problems.push(`stderr: ${node.stderr} / ${rust.stderr}`);
  if (problems.length) {
    failures++;
    console.log(`DIFF install --print ${extra.join(" ")}\n${problems.join("\n")}\n`);
  } else if (!opts.quiet) {
    console.log(`same install --print ${extra.join(" ")} (structurally; command is the native binary by design)`);
  }
}

server.close();
if (opts.record) {
  writeFileSync(GOLDEN_FILE, gzipSync(JSON.stringify(recording, null, 1) + "\n", { level: 9 }));
  console.log(`Recorded ${Object.keys(recording).length} cases in ${GOLDEN_FILE}`);
  process.exit(0);
}
console.log(`${total - failures}/${total} cases match`);
process.exit(failures ? 1 : 0);
