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
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const params: Record<string, string | number> = {
      limit: parseInt(opts.limit),
      skip: parseInt(opts.skip),
    };
    if (opts.reservation) params.reservationId = opts.reservation;
    const data = await guestyFetch("/v1/communication/conversations", { params });
    print(data);
  });

conversations
  .command("get <id>")
  .description("Get a conversation and its posts")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/communication/conversations/${id}/posts`);
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
