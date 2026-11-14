// The official MCP SDK's client, the one many apps build on, connects to
// `guesty mcp`, checks every reply against the protocol schema, and uses the tools.
// Guesty and the token cache are a local mock (fixtures/rust-mcp.mjs).
// Needs the @modelcontextprotocol/sdk dev dependency.
import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { bin, prepare, startMock } from "./fixtures/rust-mcp.mjs";

test("mcp: the official MCP client connects, lists the tools and calls them", async (t) => {
  const mock = await startMock({ responses: [{ json: { results: [{ _id: "L1", title: "Seaside" }] } }] });
  t.after(() => mock.close());
  const { cwd, env } = prepare(t, mock);
  const transport = new StdioClientTransport({ command: bin, args: ["mcp"], cwd, stderr: "pipe", env });
  const client = new Client({ name: "guesty-cli-test", version: "1.0.0" });
  await client.connect(transport);
  t.after(() => client.close());

  assert.equal(client.getServerVersion()?.name, "guesty-cli");
  assert.match(client.getInstructions() ?? "", /search_operations/);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((tool) => tool.name).sort(), ["call_operation", "describe_operation", "invite_teammate", "search_operations", "team_status"]);

  const search = await client.callTool({ name: "search_operations", arguments: { query: "reservations", limit: 3 } });
  assert.equal(JSON.parse(search.content[0].text).results.length, 3);

  const listings = await client.callTool({ name: "call_operation", arguments: { operation: "GET /v1/listings", query: { limit: 1 } } });
  assert.deepEqual(JSON.parse(listings.content[0].text), { results: [{ _id: "L1", title: "Seaside" }] });

  const preview = await client.callTool({ name: "call_operation", arguments: { operation: "POST /v1/webhooks", body: { url: "https://example.com/hook" } } });
  assert.match(preview.content[0].text, /^Not sent\./);

  const unknown = await client.callTool({ name: "describe_operation", arguments: { operation: "nope-nothing" } });
  assert.equal(unknown.isError, true);
});
