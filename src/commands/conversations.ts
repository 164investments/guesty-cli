import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";

export const conversations = new Command("conversations")
  .alias("conv")
  .description("Manage conversations/messaging");

conversations
  .command("list")
  .description("List conversations")
  .option("--reservation <id>", "Filter by reservation ID")
  .option("--limit <n>", "Max results", "25")
  .option("--cursor-after <cursor>", "Pagination cursor (forward)")
  .option("--cursor-before <cursor>", "Pagination cursor (backward)")
  .action(async (opts) => {
    const params: Record<string, string | number> = {
      limit: parseInt(opts.limit),
    };
    if (opts.cursorAfter) params.cursorAfter = opts.cursorAfter;
    if (opts.cursorBefore) params.cursorBefore = opts.cursorBefore;
    if (opts.reservation) params.reservationId = opts.reservation;
    const data = await guestyFetch("/v1/communication/conversations", { params });
    print(data);
  });

conversations
  .command("get <id>")
  .description("Get a conversation by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/communication/conversations/${id}`);
    print(data);
  });

conversations
  .command("posts <id>")
  .description("Get posts for a conversation")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/communication/conversations/${id}/posts`);
    print(data);
  });

conversations
  .command("post <conversationId>")
  .description("Create a post in a conversation without sending it")
  .requiredOption("--body <text>", "Message body")
  .action(async (conversationId: string, opts) => {
    const data = await guestyFetch(`/v1/communication/conversations/${conversationId}/posts`, {
      method: "POST",
      body: { body: opts.body },
    });
    print(data);
  });

conversations
  .command("send <conversationId>")
  .description("Send a message in a conversation")
  .requiredOption("--body <text>", "Message body")
  .action(async (conversationId: string, opts) => {
    const data = await guestyFetch(`/v1/communication/conversations/${conversationId}/send-message`, {
      method: "POST",
      body: { body: opts.body },
    });
    print(data);
  });
