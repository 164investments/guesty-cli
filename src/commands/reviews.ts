import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const reviews = new Command("reviews")
  .description("Manage reviews");

reviews
  .command("custom-channels")
  .description("List custom review channels")
  .action(async () => {
    const data = await guestyFetch("/v1/reviews/custom-channels");
    print(data);
  });

reviews
  .command("create-custom-channel")
  .description("Create a custom review channel (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/reviews/custom-channels", {
      method: "POST",
      body,
    });
    print(data);
  });

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
  .command("listings-average")
  .description("Get average review scores by listing IDs")
  .option("--listing <id>", "Listing ID", (value: string, previous: string[]) => [...previous, value], [])
  .action(async (opts) => {
    const params = opts.listing.length > 0 ? { listingIds: opts.listing } : undefined;
    const data = await guestyFetch("/v1/reviews/listings-average", { params });
    print(data);
  });

reviews
  .command("create-custom-channel-review")
  .description("Publish a custom-channel review (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/reviews/custom-channel-reviews", {
      method: "POST",
      body,
    });
    print(data);
  });

reviews
  .command("reply <id>")
  .description("Reply to a review")
  .requiredOption("--body <text>", "Reply text")
  .action(async (id: string, opts) => {
    const data = await guestyFetch(`/v1/reviews/${id}/reply`, {
      method: "PUT",
      body: { body: opts.body },
    });
    print(data);
  });
