import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { collect, fields, integer, jsonArray } from "./query-options.js";

export const conversations = new Command("conversations")
  .alias("conv")
  .description("Manage conversations/messaging");

conversations
  .command("list")
  .description("List conversations")
  .option("--reservation <id>", "Filter by reservation ID")
  .option("--filters <json>", "JSON array of conversation filters")
  .option("--fields <fields>", "Fields to return (space- or comma-separated)")
  .option("--sort <field>", "Sort field, prefix with - for descending")
  .option("--limit <n>", "Max results", "25")
  .option("--cursor-after <cursor>", "Pagination cursor (forward)")
  .option("--cursor-before <cursor>", "Pagination cursor (backward)")
  .action(async (opts) => {
    const params: Record<string, string | number> = {
      limit: integer(opts.limit, "--limit", 1, 100),
    };
    if (opts.cursorAfter && opts.cursorBefore) throw new Error("Use only one of --cursor-after and --cursor-before.");
    if (opts.cursorAfter) params.cursorAfter = opts.cursorAfter;
    if (opts.cursorBefore) params.cursorBefore = opts.cursorBefore;
    if (opts.fields) {
      const selected = fields(opts.fields).split(" ");
      // Guesty cannot build pagination cursors when the projected response omits its sort field.
      const sortFields = opts.sort ? fields(opts.sort).split(" ").map((field) => field.replace(/^[+-]/, "")) : [];
      params.fields = [...new Set([...selected, ...sortFields])].join(" ");
    }
    if (opts.sort) params.sort = opts.sort;
    const filters = opts.filters ? jsonArray(opts.filters, "--filters") : [];
    if (opts.reservation) filters.push({ field: "reservation._id", operator: "$eq", value: opts.reservation });
    if (filters.length) params.filters = JSON.stringify(filters);
    const data = await guestyFetch("/v1/communication/conversations", { params });
    print(data);
  });

conversations
  .command("get <id>")
  .description("Get a conversation by ID")
  .option("--fields <fields>", "Fields to return (space- or comma-separated)")
  .action(async (id: string, opts) => {
    const params = opts.fields ? { fields: fields(opts.fields) } : undefined;
    const data = await guestyFetch(`/v1/communication/conversations/${id}`, { params });
    print(data);
  });

conversations
  .command("posts <id>")
  .description("Get posts for a conversation")
  .option("--sort <field>", "Sort field, prefix with - for descending")
  .option("--cursor-after <cursor>", "Pagination cursor (forward)")
  .option("--cursor-before <cursor>", "Pagination cursor (backward)")
  .action(async (id: string, opts) => {
    if (opts.cursorAfter && opts.cursorBefore) throw new Error("Use only one of --cursor-after and --cursor-before.");
    const params: Record<string, string> = {};
    if (opts.sort) params.sort = opts.sort;
    if (opts.cursorAfter) params.cursorAfter = opts.cursorAfter;
    if (opts.cursorBefore) params.cursorBefore = opts.cursorBefore;
    const data = await guestyFetch(`/v1/communication/conversations/${id}/posts`, { params });
    print(data);
  });

conversations
  .command("post <conversationId>")
  .description("Create a post in a conversation without sending it")
  .requiredOption("--module <type>", "Message module (sms, email, note, log, whatsapp, airbnb2)")
  .requiredOption("--body <text>", "Message body")
  .option("--sent-by <sender>", "Sender: host or guest")
  .action(async (conversationId: string, opts) => {
    if (opts.sentBy && !["host", "guest"].includes(opts.sentBy)) throw new Error("--sent-by must be host or guest.");
    const data = await guestyFetch(`/v1/communication/conversations/${conversationId}/posts`, {
      method: "POST",
      body: { body: opts.body, module: { type: opts.module }, ...(opts.sentBy ? { sentBy: opts.sentBy } : {}) },
    });
    print(data);
  });

conversations
  .command("send <conversationId>")
  .description("Send a message in a conversation")
  .requiredOption("--module <type>", "Message module (sms, email, note, log, whatsapp, airbnb2)")
  .requiredOption("--body <text>", "Message body")
  .option("--to <recipient>", "Recipient (repeat for multiple)", collect, [])
  .option("--cc <recipient>", "CC recipient (repeat for multiple)", collect, [])
  .option("--bcc <recipient>", "BCC recipient (repeat for multiple)", collect, [])
  .action(async (conversationId: string, opts) => {
    const module: Record<string, string | string[]> = { type: opts.module };
    for (const key of ["to", "cc", "bcc"]) if (opts[key].length) module[key] = opts[key];
    const data = await guestyFetch(`/v1/communication/conversations/${conversationId}/send-message`, {
      method: "POST",
      body: { body: opts.body, module },
    });
    print(data);
  });
