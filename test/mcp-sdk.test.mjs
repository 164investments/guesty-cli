// The official MCP SDK's client, the one many apps build on, connects to
// `guesty mcp`, checks every reply against the protocol schema, and uses the tools.
// Guesty and the token cache are fake (fixtures/isolated-runtime.mjs).
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { root } from "./fixtures/isolated-runner.mjs";

test("mcp: the official MCP client connects, lists the tools and calls them", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "guesty-mcp-sdk-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", join(root, "test/fixtures/isolated-runtime.mjs"), join(root, "dist/cli.js"), "mcp"],
    cwd: root,
    stderr: "pipe",
    env: {
      ...process.env,
      GUESTY_ISOLATED_SCENARIO: JSON.stringify({ responses: [{ json: { results: [{ _id: "L1", title: "Seaside" }] } }] }),
      GUESTY_ISOLATED_TRACE: join(directory, "trace.json"),
    },
  });
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
