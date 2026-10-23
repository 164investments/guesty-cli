import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { bookingEngineFetch, guestyFetch, paginateAll, type QueryParams } from "../client.js";
import { callTokenService, configuredService, invitedLink } from "../token-service.js";
import { describeOperation, findOperation, listing, searchOperations, type Api, type Operation } from "./catalog.js";

// A Model Context Protocol server over stdio: newline-delimited JSON-RPC 2.0.
// It offers tools only, so it needs no SDK and adds no dependencies.
const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_TEXT = 60_000;
const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;
type Json = Record<string, unknown>;
interface ToolResult { content: { type: "text"; text: string }[]; isError?: boolean }
export interface McpOptions { readOnly: boolean }

class ToolError extends Error {}

function version(): string {
  try {
    return (JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as { version?: string }).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function instructions(options: McpOptions): string {
  return [
    "Guesty CLI gives you every Guesty Open API and Booking Engine API operation through the user's team token, which their whole team shares.",
    "Work in three steps: search_operations finds an operation from plain words, describe_operation shows its parameters and body, and call_operation runs it.",
    options.readOnly
      ? "This server is read-only: it refuses every operation that changes data."
      : "Reads run straight away. An operation that changes data (creating, updating or deleting anything, payments, cancellations, messages to guests) is not sent until you call it again with confirm: true. Show the user exactly what will change and get their OK first.",
    "Never ask the user for Guesty credentials, client secrets or tokens. If the CLI isn't connected, ask them to run `guesty setup`, or `guesty join <invite link>`, in a terminal.",
    "Guesty allows about 120 requests a minute per account, so prefer filters, `fields` and `limit` over fetching everything.",
    "team_status shows the team's token use and members (admins only), and invite_teammate emails a teammate a one-time invite.",
  ].join("\n");
}

const TOOLS = [
  {
    name: "search_operations",
    title: "Search Guesty operations",
    description: "Find Guesty API operations from plain words, such as \"cancel a reservation\", \"listing calendar availability\" or \"send a guest message\". Searches all Open API and Booking Engine API operations and returns their ids. You can also search for a path such as /v1/reservations.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What you want to do or find, in plain words, or an API path." },
        api: { type: "string", enum: ["open-api", "booking-engine", "both"], description: "Which API to search. Default: both." },
        limit: { type: "integer", minimum: 1, maximum: 25, description: "Most results to return. Default: 10." },
        include_deprecated: { type: "boolean", description: "Include operations Guesty marks deprecated. Default: false." },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "describe_operation",
    title: "Describe a Guesty operation",
    description: "Show one operation's parameters, request body schema, response fields, docs link, whether it changes data, and an example call_operation input.",
    inputSchema: {
      type: "object",
      properties: { operation: { type: "string", description: "The operation id from search_operations, or \"METHOD /path\"." } },
      required: ["operation"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "call_operation",
    title: "Call a Guesty operation",
    description: "Run a Guesty API operation with the team's shared token and return Guesty's response. Reads run straight away. An operation that changes data returns a preview and sends nothing until you call again with confirm: true, after the user has approved the change.",
    inputSchema: {
      type: "object",
      properties: {
        operation: { type: "string", description: "The operation id from search_operations." },
        path_params: { type: "object", additionalProperties: { type: "string" }, description: "Values for the {placeholders} in the operation's path." },
        query: { type: "object", additionalProperties: true, description: "Query parameters. Values are strings, numbers, booleans or arrays of them; send JSON objects as strings." },
        body: { description: "The JSON request body, for operations that take one." },
        all_pages: { type: "boolean", description: "For Open API list reads: fetch every page (up to 10,000 results) instead of one." },
        confirm: { type: "boolean", description: "Set to true only after the user approved this exact change." },
      },
      required: ["operation"],
    },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
  },
  {
    name: "team_status",
    title: "Team status",
    description: "Show the team's shared token, its Guesty token requests in the last 24 hours, access keys and pending invites. Team admins only.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  {
    name: "invite_teammate",
    title: "Invite a teammate",
    description: "Create a one-time invite to the team, which expires in 7 days. With an email address, the token service emails it to them. Use only when the user asked to invite this person. Team admins only.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The teammate's name, used later to revoke their access." },
        email: { type: "string", description: "Their email address. Leave out to get a link to send yourself." },
        admin: { type: "boolean", description: "Let them manage the team too. Default: false." },
      },
      required: ["name"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
];

function text(value: string, isError = false): ToolResult {
  const shown = value.length > MAX_TEXT
    ? `${value.slice(0, MAX_TEXT)}\n…\n[Truncated: showing the first ${MAX_TEXT.toLocaleString("en-US")} of ${value.length.toLocaleString("en-US")} characters. Ask for less with query parameters such as fields, limit or filters.]`
    : value;
  return { content: [{ type: "text", text: shown }], ...(isError ? { isError: true } : {}) };
}

function json(value: unknown): ToolResult {
  return text(JSON.stringify(value, null, 1));
}

function objectArg(value: unknown, name: string): Json | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) throw new ToolError(`${name} must be a JSON object.`);
  return value as Json;
}

function operationArg(args: Json): Operation {
  const reference = args.operation;
  if (typeof reference !== "string" || !reference.trim()) throw new ToolError("Give the operation id from search_operations.");
  const op = findOperation(reference);
  if (op) return op;
  const guesses = searchOperations(reference, { limit: 3, includeDeprecated: true }).map((match) => match.id);
  throw new ToolError(`No Guesty operation "${reference}".${guesses.length ? ` Did you mean ${guesses.join(", ")}?` : ""} Use search_operations to find the id.`);
}

function requestPath(op: Operation, values: Json | undefined): string {
  const names = op.path.match(/\{([^}]+)\}/g)?.map((part) => part.slice(1, -1)) ?? [];
  const given = values ?? {};
  const unknown = Object.keys(given).filter((name) => !names.includes(name));
  if (unknown.length) throw new ToolError(`${op.id} has no path parameter ${unknown.join(", ")}. Its path is ${op.path}.`);
  const missing = names.filter((name) => given[name] === undefined || given[name] === null || given[name] === "");
  if (missing.length) throw new ToolError(`Fill in path_params ${missing.join(", ")} for ${op.path}.`);
  return op.path.replace(/\{([^}]+)\}/g, (_, name: string) => {
    const value = given[name];
    if (typeof value !== "string" && typeof value !== "number") throw new ToolError(`path_params.${name} must be a string or number.`);
    return encodeURIComponent(String(value));
  });
}

function describeResult(data: unknown): string {
  if (data === undefined) return "Guesty returned no content.";
  if (Buffer.isBuffer(data)) return `Guesty returned a ${data.length.toLocaleString("en-US")}-byte file, which isn't shown here. Use the matching Guesty CLI command with --output to save it.`;
  if (typeof data === "string") return data;
  return JSON.stringify(data, null, 1);
}

async function callOperation(args: Json, options: McpOptions): Promise<ToolResult> {
  const op = operationArg(args);
  const path = requestPath(op, objectArg(args.path_params, "path_params"));
  const query = objectArg(args.query, "query") as QueryParams | undefined;
  const body = args.body;
  const contentTypes = Object.keys(((op.spec.requestBody as Json | undefined)?.content ?? {}) as Json);
  if (body !== undefined && contentTypes.length && !contentTypes.some((type) => type.includes("json"))) {
    throw new ToolError(`${op.id} takes ${contentTypes[0]}, which call_operation can't send. Use the matching Guesty CLI command in a terminal instead.`);
  }
  if (args.all_pages === true && (op.method !== "GET" || op.api !== "open-api")) {
    throw new ToolError("all_pages works only for Open API GET operations that return lists.");
  }
  if (op.changesData) {
    if (options.readOnly) throw new ToolError(`This server is read-only, so it won't run ${op.method} ${op.path} (${op.title}).`);
    if (args.confirm !== true) {
      return text([
        `Not sent. "${op.title}" changes data in Guesty: ${op.method} ${path}.`,
        query ? `Query: ${JSON.stringify(query)}` : "",
        body !== undefined ? `Body: ${JSON.stringify(body, null, 1)}` : "",
        "Tell the user exactly what this will change and get their OK. Then call call_operation again with the same arguments and confirm: true.",
      ].filter(Boolean).join("\n"));
    }
  }
  const api: Api = op.api;
  let data: unknown;
  if (api === "booking-engine") {
    data = await bookingEngineFetch(path, { method: op.method as "GET" | "POST" | "PUT", params: query, body });
  } else if (args.all_pages === true) {
    const results = await paginateAll(path, query ?? {});
    data = { count: results.length, results };
  } else {
    data = await guestyFetch(path, { method: op.method, params: query, body });
  }
  const shown = describeResult(data);
  return text(op.changesData ? `Done: ${op.method} ${path} (${op.title}).\n${shown}` : shown);
}

function pacific(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

function teamService(): { url: string; key: string } {
  const service = configuredService();
  if (!service) {
    throw new ToolError("This computer's Guesty CLI isn't connected to a team. Ask the user to run `guesty setup` (or `guesty join <invite link>`) in a terminal.");
  }
  return service;
}

async function inviteTeammate(args: Json, options: McpOptions): Promise<ToolResult> {
  if (options.readOnly) throw new ToolError("This server is read-only, so it won't create invites.");
  const name = typeof args.name === "string" ? args.name.trim() : "";
  if (!name) throw new ToolError("Give the teammate's name.");
  const email = typeof args.email === "string" ? args.email.trim() : "";
  if (email && !EMAIL.test(email)) throw new ToolError("That email address doesn't look right.");
  const service = teamService();
  const invite = await callTokenService<{ link: string; expires_at: number; email?: { address: string; sent: boolean; message?: string } }>(
    service.url, "POST", "/v1/team/invites",
    { key: service.key, body: { label: name, role: args.admin === true ? "admin" : "member", ...(email ? { email } : {}) } },
  );
  const { link, command } = invitedLink(service.url, invite.link);
  const emailed = invite.email?.sent === true;
  return text([
    emailed ? `Emailed ${name} an invite at ${invite.email?.address}.` : `Created ${name}'s invite.${email ? ` It wasn't emailed: ${invite.email?.message ?? "the token service didn't say why"}. Send them the link instead.` : ""}`,
    `Link: ${link}`,
    `They join by installing the Guesty CLI and running: ${command}`,
    `It works once and expires ${pacific(invite.expires_at)}.`,
  ].join("\n"));
}

async function callTool(name: unknown, args: Json, options: McpOptions): Promise<ToolResult> {
  switch (name) {
    case "search_operations": {
      if (typeof args.query !== "string" || !args.query.trim()) throw new ToolError("Give a query, such as \"list reservations\".");
      const api = args.api === "open-api" || args.api === "booking-engine" ? args.api : undefined;
      const limit = typeof args.limit === "number" ? args.limit : undefined;
      const results = searchOperations(args.query, { api, limit, includeDeprecated: args.include_deprecated === true });
      if (!results.length) return text(`No operations matched "${args.query}". Try other words, such as the thing you want (reservation, listing, calendar, guest, payment) and what to do with it.`);
      return json({ results: results.map(listing), next: "describe_operation shows an operation's parameters; call_operation runs it." });
    }
    case "describe_operation":
      return json(describeOperation(operationArg(args)));
    case "call_operation":
      return callOperation(args, options);
    case "team_status": {
      const service = teamService();
      return json(await callTokenService(service.url, "GET", "/v1/team", { key: service.key }));
    }
    case "invite_teammate":
      return inviteTeammate(args, options);
    default:
      throw new ToolError(`Unknown tool ${String(name)}.`);
  }
}

function send(message: Json): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handle(message: Json, options: McpOptions): Promise<void> {
  const { id, method } = message;
  if (typeof method !== "string" || id === undefined) return; // Notifications and replies need no answer.
  const reply = (result: unknown) => send({ jsonrpc: "2.0", id, result });
  const fail = (code: number, text: string) => send({ jsonrpc: "2.0", id, error: { code, message: text } });
  const params = (message.params && typeof message.params === "object" ? message.params : {}) as Json;
  switch (method) {
    case "initialize": {
      const requested = params.protocolVersion;
      reply({
        protocolVersion: typeof requested === "string" && PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "guesty-cli", title: "Guesty CLI", version: version() },
        instructions: instructions(options),
      });
      return;
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "resources/list":
      return reply({ resources: [] });
    case "resources/templates/list":
      return reply({ resourceTemplates: [] });
    case "prompts/list":
      return reply({ prompts: [] });
    case "tools/call": {
      if (!TOOLS.some((tool) => tool.name === params.name)) return fail(-32602, `Unknown tool ${String(params.name)}.`);
      const args = params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments) ? params.arguments as Json : {};
      try {
        reply(await callTool(params.name, args, options));
      } catch (err) {
        reply(text(err instanceof Error ? err.message : String(err), true));
      }
      return;
    }
    default:
      return fail(-32601, `Method not found: ${method}`);
  }
}

export async function serveMcp(options: McpOptions): Promise<void> {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const pending = new Set<Promise<void>>();
  for await (const line of lines) {
    if (!line.trim()) continue;
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      continue;
    }
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      send({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Send one JSON-RPC message per line." } });
      continue;
    }
    const work = handle(message as Json, options).catch((err: unknown) => {
      process.stderr.write(`Guesty MCP error: ${err instanceof Error ? err.message : String(err)}\n`);
    });
    pending.add(work);
    void work.finally(() => pending.delete(work));
  }
  await Promise.all(pending);
}
