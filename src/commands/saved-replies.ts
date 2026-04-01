import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const savedReplies = new Command("saved-replies")
  .alias("replies")
  .description("Manage saved replies");

savedReplies
  .command("list")
  .description("List saved replies")
  .action(async () => {
    const data = await guestyFetch("/v1/saved-replies");
    print(data);
  });

savedReplies
  .command("get <replyId>")
  .description("Get a saved reply by ID")
  .action(async (replyId: string) => {
    const data = await guestyFetch(`/v1/saved-replies/${replyId}`);
    print(data);
  });

savedReplies
  .command("create")
  .description("Create a saved reply (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/saved-replies", { method: "POST", body });
    print(data);
  });

savedReplies
  .command("update <replyId>")
  .description("Update a saved reply (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (replyId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/saved-replies/${replyId}`, { method: "PUT", body });
    print(data);
  });

savedReplies
  .command("delete <replyId>")
  .description("Delete a saved reply")
  .action(async (replyId: string) => {
    const data = await guestyFetch<string>(`/v1/saved-replies/${replyId}`, {
      method: "DELETE",
      responseType: "text",
    });
    print(data);
  });

savedReplies
  .command("by-listing <listingId>")
  .description("Get saved replies for a listing")
  .action(async (listingId: string) => {
    const data = await guestyFetch(`/v1/saved-replies/listing/${listingId}`);
    print(data);
  });
