// Drives `guesty mcp` the way an MCP client does: JSON-RPC messages on stdin,
// one reply per line on stdout. Guesty, the token cache and the token service
// are a local mock (fixtures/rust-mcp.mjs); nothing leaves this machine.
import assert from "node:assert/strict";
import test from "node:test";
import { run } from "./fixtures/rust-mcp.mjs";

const SERVICE = { GUESTY_TOKEN_SERVICE_URL: "https://tokens.invalid", GUESTY_TOKEN_SERVICE_KEY: "gts_fake-isolated-team-key" };
let nextId = 1;

async function session(t, requests, { scenario = {}, args = [] } = {}) {
  const messages = [
    { jsonrpc: "2.0", id: 0, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    ...requests,
  ];
  const result = await run(t, { args: ["mcp", ...args], scenario, stdin: messages.map((message) => typeof message === "string" ? message : JSON.stringify(message)).join("\n") + "\n" });
  assert.equal(result.status, 0, result.stderr);
  const replies = result.stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  return { ...result, replies, reply: (id) => replies.find((reply) => reply.id === id) };
}

function call(name, args = {}) {
  return { jsonrpc: "2.0", id: nextId++, method: "tools/call", params: { name, arguments: args } };
}

function textOf(reply) {
  assert.ok(reply?.result, JSON.stringify(reply));
  return reply.result.content.map((part) => part.text).join("\n");
}

function jsonOf(reply) {
  assert.notEqual(reply.result.isError, true, textOf(reply));
  return JSON.parse(textOf(reply));
}

test("mcp: initialize negotiates the protocol, lists five tools and answers only requests", async (t) => {
  const old = { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "1999-01-01" } };
  const { reply, replies, trace } = await session(t, [
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "ping" },
    { jsonrpc: "2.0", id: 4, method: "nope" },
    "not json",
    { jsonrpc: "2.0", method: "notifications/cancelled", params: {} },
    old,
  ]);
  const init = reply(0).result;
  assert.equal(init.protocolVersion, "2025-06-18");
  assert.equal(init.serverInfo.name, "guesty-cli");
  assert.deepEqual(init.capabilities, { tools: { listChanged: false } });
  assert.match(init.instructions, /confirm: true/);
  assert.match(init.instructions, /Never ask the user for Guesty credentials/);
  assert.equal(reply(1).result.protocolVersion, "2025-11-25", "an unknown version gets the newest");
  const tools = reply(2).result.tools;
  assert.deepEqual(tools.map((tool) => tool.name), ["search_operations", "describe_operation", "call_operation", "team_status", "invite_teammate"]);
  for (const tool of tools) assert.equal(tool.inputSchema.type, "object");
  assert.deepEqual(reply(3).result, {});
  assert.equal(reply(4).error.code, -32601);
  assert.ok(replies.some((r) => r.id === null && r.error.code === -32700));
  assert.equal(replies.length, 6, "notifications get no reply");
  assert.equal(trace.requests.length, 0);
  assert.equal(trace.tokenReads, 0);
});

test("mcp: search finds operations in plain words, across both APIs, without reading a token", async (t) => {
  const listings = call("search_operations", { query: "listings" });
  const cancel = call("search_operations", { query: "cancel a reservation", limit: 3 });
  const quote = call("search_operations", { query: "quote", api: "booking-engine" });
  const old = call("search_operations", { query: "List reservations", include_deprecated: true, limit: 25 });
  const current = call("search_operations", { query: "List reservations", limit: 25 });
  const path = call("search_operations", { query: "GET /v1/webhooks" });
  const { reply, trace } = await session(t, [listings, cancel, quote, old, current, path]);
  const first = jsonOf(reply(listings.id)).results[0];
  assert.deepEqual([first.method, first.path, first.changes_data], ["GET", "/v1/listings", false]);
  assert.ok(jsonOf(reply(cancel.id)).results.some((op) => op.path === "/v1/reservations-v3/{reservationId}/request-cancellation"));
  const quotes = jsonOf(reply(quote.id)).results;
  assert.ok(quotes.length && quotes.every((op) => op.api === "booking-engine"));
  assert.ok(quotes.some((op) => op.method === "POST" && op.path === "/api/reservations/quotes"));
  assert.ok(jsonOf(reply(old.id)).results.some((op) => op.path === "/v1/reservations" && op.deprecated));
  assert.ok(!jsonOf(reply(current.id)).results.some((op) => op.deprecated), "deprecated operations are left out unless asked for");
  assert.equal(jsonOf(reply(path.id)).results[0].path, "/v1/webhooks");
  assert.equal(trace.tokenReads, 0);
  assert.equal(trace.requests.length, 0);
});

test("mcp: describe shows parameters, the body schema, the docs and an example call", async (t) => {
  const update = call("describe_operation", { operation: "PUT /v1/listings/{id}" });
  const read = call("describe_operation", { operation: "GET /v1/listings" });
  const missing = call("describe_operation", { operation: "list-the-listings" });
  const { reply } = await session(t, [update, read, missing]);
  const described = jsonOf(reply(update.id));
  assert.equal(described.changes_data, true);
  assert.match(described.docs, /^https:\/\/open-api-docs\.guesty\.com\/reference\//);
  assert.ok(described.parameters.some((param) => param.name === "id" && param.in === "path" && param.required));
  assert.equal(described.request_body.content_type, "application/json");
  assert.equal(typeof described.request_body.schema, "object");
  assert.deepEqual(described.example_call.path_params, { id: "<id>" });
  assert.equal(described.example_call.confirm, true);
  const listed = jsonOf(reply(read.id));
  assert.equal(listed.changes_data, false);
  assert.equal(listed.request_body, null);
  assert.ok(listed.parameters.some((param) => param.in === "query" && param.name === "limit"));
  assert.equal(reply(missing.id).result.isError, true);
  assert.match(textOf(reply(missing.id)), /No Guesty operation "list-the-listings"\. Did you mean/);
});

test("mcp: a read runs with the cached token, encodes path values and never shows the token", async (t) => {
  const get = call("call_operation", { operation: "GET /v1/listings/{id}", path_params: { id: "abc/def" }, query: { fields: "title address" } });
  const { reply, trace } = await session(t, [get], { scenario: { responses: [{ json: { _id: "abc/def", title: "Seaside" } }] } });
  assert.deepEqual(jsonOf(reply(get.id)), { _id: "abc/def", title: "Seaside" });
  assert.equal(trace.requests.length, 1);
  const url = new URL(trace.requests[0].url);
  assert.equal(url.pathname, "/v1/listings/abc%2Fdef");
  assert.equal(url.searchParams.get("fields"), "title address");
  assert.equal(trace.requests[0].headers.authorization, "Bearer fake-isolated-openapi-token");
});

test("mcp: a change sends nothing until it is confirmed, then sends exactly once", async (t) => {
  const args = { operation: "PUT /v1/listings/{id}", path_params: { id: "L1" }, body: { title: "New title" } };
  const preview = call("call_operation", args);
  const { reply: previewReply, trace: previewTrace } = await session(t, [preview]);
  assert.match(textOf(previewReply(preview.id)), /^Not sent\. "Update a listing" changes data in Guesty: PUT \/v1\/listings\/L1\./);
  assert.match(textOf(previewReply(preview.id)), /confirm: true/);
  assert.equal(previewTrace.requests.length, 0);
  assert.equal(previewTrace.tokenReads, 0);

  const confirmed = call("call_operation", { ...args, confirm: true });
  const { reply, trace } = await session(t, [confirmed], { scenario: { responses: [{ json: { _id: "L1", title: "New title" } }] } });
  assert.match(textOf(reply(confirmed.id)), /^Done: PUT \/v1\/listings\/L1 \(Update a listing\)\./);
  assert.equal(trace.requests.length, 1);
  assert.equal(trace.requests[0].method, "PUT");
  assert.deepEqual(JSON.parse(trace.requests[0].body), { title: "New title" });
});

test("mcp: --read-only and GUESTY_MCP_READ_ONLY refuse changes even when confirmed", async (t) => {
  for (const options of [{ args: ["--read-only"] }, { scenario: { env: { GUESTY_MCP_READ_ONLY: "1" } } }]) {
    const change = call("call_operation", { operation: "DELETE /v1/webhooks/{id}", path_params: { id: "W1" }, confirm: true });
    const invite = call("invite_teammate", { name: "Alex" });
    const read = call("call_operation", { operation: "GET /v1/webhooks" });
    const { reply, trace } = await session(t, [change, invite, read], options);
    assert.equal(reply(0).result.instructions.includes("read-only"), true);
    assert.equal(reply(change.id).result.isError, true);
    assert.match(textOf(reply(change.id)), /read-only/);
    assert.equal(reply(invite.id).result.isError, true);
    assert.equal(reply(read.id).result.isError, undefined);
    assert.deepEqual(trace.requests.map((request) => request.method), ["GET"]);
  }
});

test("mcp: path parameters are checked before anything is sent", async (t) => {
  const missing = call("call_operation", { operation: "GET /v1/listings/{id}" });
  const extra = call("call_operation", { operation: "GET /v1/listings", path_params: { id: "x" } });
  const body = call("call_operation", { operation: "GET /v1/listings", body: {} });
  const pages = call("call_operation", { operation: "PUT /v1/listings/{id}", path_params: { id: "x" }, all_pages: true });
  const { reply, trace } = await session(t, [missing, extra, body, pages]);
  assert.match(textOf(reply(missing.id)), /Fill in path_params id/);
  assert.match(textOf(reply(extra.id)), /has no path parameter id/);
  assert.match(textOf(reply(body.id)), /cannot contain a body/);
  assert.match(textOf(reply(pages.id)), /all_pages works only/);
  for (const request of [missing, extra, body, pages]) assert.equal(reply(request.id).result.isError, true);
  assert.equal(trace.requests.length, 0);
});

test("mcp: all_pages collects every page of an Open API list", async (t) => {
  const all = call("call_operation", { operation: "GET /v1/listings", all_pages: true });
  const { reply, trace } = await session(t, [all], { scenario: { paginationCount: 250 } });
  const result = jsonOf(reply(all.id));
  assert.equal(result.count, 250);
  assert.equal(result.results.length, 250);
  assert.equal(trace.requests.length, 3);
});

test("mcp: Booking Engine operations use the booking engine token and host", async (t) => {
  const listings = call("call_operation", { operation: "GET /api/listings" });
  const { reply, trace } = await session(t, [listings], { scenario: { bookingResponses: [{ json: { results: [{ _id: "B1" }] } }] } });
  assert.deepEqual(jsonOf(reply(listings.id)), { results: [{ _id: "B1" }] });
  assert.equal(new URL(trace.requests.at(-1).url).host, "booking.guesty.com");
  assert.equal(trace.requests.at(-1).headers.authorization, "Bearer fake-isolated-beapi-token");
});

test("mcp: large responses are cut with a note, and files aren't dumped into the chat", async (t) => {
  // The two calls run at the same time, so the mock answers each by its path.
  const big = call("call_operation", { operation: "GET /v1/listings" });
  const file = call("call_operation", { operation: "GET /v1/listings/{id}", path_params: { id: "F1" } });
  const { reply } = await session(t, [big, file], { scenario: { byPath: { "/v1/listings": { json: { results: ["x".repeat(80_000)] } }, "/v1/listings/F1": { raw: "PDFDATA", headers: { "content-type": "application/pdf" } } } } });
  const text = textOf(reply(big.id));
  assert.ok(text.length < 61_000);
  assert.match(text, /\[Truncated: showing the first 60,000 of [\d,]+ characters\./);
  assert.match(textOf(reply(file.id)), /7-byte file, which isn't shown here/);
});

test("mcp: without a team or token cache, calls explain how to connect and nothing asks Guesty for a token", async (t) => {
  const get = call("call_operation", { operation: "GET /v1/listings" });
  const status = call("team_status");
  const { reply, trace } = await session(t, [get, status], { scenario: { noConfig: true, noDisk: true } });
  assert.equal(reply(get.id).result.isError, true);
  assert.match(textOf(reply(get.id)), /isn't connected to a team yet.*guesty setup/s);
  assert.match(textOf(reply(status.id)), /isn't connected to a team\. Ask the user to run `guesty setup`/);
  assert.equal(trace.requests.length, 0);
});

test("mcp: the server ignores the .env of the folder it was started in", async (t) => {
  const lines = `GUESTY_TOKEN_SERVICE_URL=${SERVICE.GUESTY_TOKEN_SERVICE_URL}\nGUESTY_TOKEN_SERVICE_KEY=${SERVICE.GUESTY_TOKEN_SERVICE_KEY}\n`;
  const team = { "GET /v1/team": { json: { team: { name: "Seaside Stays" } } } };
  const fromProject = call("team_status");
  const project = await session(t, [fromProject], { scenario: { noConfig: true, envFiles: { cwd: lines }, tokenService: team } });
  assert.match(textOf(project.reply(fromProject.id)), /isn't connected to a team/);
  assert.equal(project.trace.requests.length, 0);
  const fromHome = call("team_status");
  const home = await session(t, [fromHome], { scenario: { noConfig: true, envFiles: { home: lines }, tokenService: team } });
  assert.equal(jsonOf(home.reply(fromHome.id)).team.name, "Seaside Stays");
});

test("mcp: team_status and invite_teammate use the team's access key with the token service", async (t) => {
  const status = call("team_status");
  const invite = call("invite_teammate", { name: "Alex Rivera", email: "alex@example.com", confirm: true });
  const linkOnly = call("invite_teammate", { name: "Sam", confirm: true });
  const badEmail = call("invite_teammate", { name: "Lee", email: "not-an-email", confirm: true });
  const expires = 1_800_604_800_000;
  const { reply, trace } = await session(t, [status, invite, linkOnly, badEmail], {
    scenario: {
      env: SERVICE,
      tokenService: {
        "GET /v1/team": { json: { team: { name: "Seaside Stays", max_requests_per_day: 3 }, keys: [] } },
        "POST /v1/team/invites": { json: { link: "https://tokens.invalid/join/ABCD-EFGH-JKMN", expires_at: expires, email: { address: "alex@example.com", sent: true } } },
      },
    },
  });
  assert.equal(jsonOf(reply(status.id)).team.name, "Seaside Stays");
  const invited = textOf(reply(invite.id));
  assert.match(invited, /^Emailed Alex Rivera an invite at alex@example\.com\./);
  assert.match(invited, /guesty join https:\/\/tokens\.invalid\/join\/ABCD-EFGH-JKMN/);
  assert.match(invited, /It works once and expires/);
  assert.match(textOf(reply(badEmail.id)), /doesn't look right/);
  const sent = trace.requests.filter((request) => new URL(request.url).host === "tokens.invalid");
  assert.equal(sent.length, 3);
  for (const request of sent) assert.equal(request.headers.authorization, `Bearer ${SERVICE.GUESTY_TOKEN_SERVICE_KEY}`);
  // The calls run at the same time, so the invites may arrive in either order.
  const invites = sent.filter((request) => request.method === "POST").map((request) => JSON.parse(request.body));
  assert.deepEqual(invites.find((body) => body.label === "Alex Rivera"), { label: "Alex Rivera", role: "member", email: "alex@example.com" });
  assert.deepEqual(invites.find((body) => body.label === "Sam"), { label: "Sam", role: "member" });
});

test("mcp: an invite needs the user's approval, and admin invites need a terminal", async (t) => {
  const preview = call("invite_teammate", { name: "Mallory", email: "mallory@example.com" });
  const admin = call("invite_teammate", { name: "Mallory", email: "mallory@example.com", admin: true, confirm: true });
  const { reply, trace } = await session(t, [preview, admin], { scenario: { env: SERVICE } });
  assert.match(textOf(reply(preview.id)), /^Not sent\. This would invite Mallory \(mallory@example\.com\) to the team as a member/);
  assert.match(textOf(reply(preview.id)), /confirm: true/);
  assert.equal(reply(admin.id).result.isError, true);
  assert.match(textOf(reply(admin.id)), /Admin invites can't be made here\. Ask the user to run `guesty team invite --admin`/);
  assert.equal(trace.requests.length, 0);
});

test("mcp: a member's team request shows the service's refusal", async (t) => {
  const status = call("team_status");
  const { reply } = await session(t, [status], {
    scenario: { env: SERVICE, tokenService: { "GET /v1/team": { status: 403, json: { error: "forbidden", message: "Only team admins can do that." } } } },
  });
  assert.equal(reply(status.id).result.isError, true);
  assert.match(textOf(reply(status.id)), /Only team admins can do that\./);
});

test("mcp: a project's .env can't point the server at another token service or key", async (t) => {
  const home = `GUESTY_TOKEN_SERVICE_URL=${SERVICE.GUESTY_TOKEN_SERVICE_URL}\nGUESTY_TOKEN_SERVICE_KEY=${SERVICE.GUESTY_TOKEN_SERVICE_KEY}\n`;
  const project = "GUESTY_TOKEN_SERVICE_URL=https://evil.invalid\nGUESTY_TOKEN_SERVICE_KEY=gts_project-key\nGUESTY_MCP_READ_ONLY=1\n";
  const status = call("team_status");
  const change = call("call_operation", { operation: "DELETE /v1/webhooks/{id}", path_params: { id: "W1" } });
  const { reply, trace } = await session(t, [status, change], {
    scenario: { noConfig: true, envFiles: { home, cwd: project }, tokenService: { "GET /v1/team": { json: { team: { name: "Seaside Stays" } } } } },
  });
  assert.equal(jsonOf(reply(status.id)).team.name, "Seaside Stays");
  assert.deepEqual(trace.requests.map((request) => `${request.method} ${request.url}`), ["GET https://tokens.invalid/v1/team"]);
  assert.equal(trace.requests[0].headers.authorization, `Bearer ${SERVICE.GUESTY_TOKEN_SERVICE_KEY}`);
  assert.doesNotMatch(reply(0).result.instructions, /read-only/, "the project's GUESTY_MCP_READ_ONLY is ignored too");
  assert.match(textOf(reply(change.id)), /^Not sent\./);
});

test("mcp: calls run concurrently and every reply is one whole line", async (t) => {
  const reads = Array.from({ length: 8 }, (_, index) => call("call_operation", { operation: "GET /v1/listings/{id}", path_params: { id: `L${index}` } }));
  const searches = Array.from({ length: 8 }, () => call("search_operations", { query: "reservations", limit: 25 }));
  const { replies, stdout } = await session(t, [...reads, ...searches], { scenario: { responses: [{ json: { results: ["y".repeat(50_000)] } }] } });
  assert.equal(replies.length, 1 + reads.length + searches.length);
  assert.ok(stdout.endsWith("\n"));
  for (const request of [...reads, ...searches]) assert.ok(replies.some((r) => r.id === request.id && r.result));
});
