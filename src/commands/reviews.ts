import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";

export const reviews = new Command("reviews")
  .description("Manage reviews");

reviews
  .command("list")
  .description("List reviews")
  .option("--listing <id>", "Filter by listing ID")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const params: Record<string, string | number> = {
      limit: parseInt(opts.limit),
      skip: parseInt(opts.skip),
    };
    if (opts.listing) params.listingId = opts.listing;
    const data = await guestyFetch("/v1/reviews", { params });
    print(data);
  });

reviews
  .command("get <id>")
  .description("Get a single review")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/reviews/${id}`);
    print(data);
  });

reviews
  .command("reply <id>")
  .description("Reply to a review")
  .requiredOption("--body <text>", "Reply text")
  .action(async (id: string, opts) => {
    const data = await guestyFetch(`/v1/reviews/${id}/reply`, {
      method: "POST",
      body: { body: opts.body },
    });
    print(data);
  });
