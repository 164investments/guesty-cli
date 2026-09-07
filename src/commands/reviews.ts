import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { collect, dateRange, integer } from "./query-options.js";

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
  .option("--reservation <id>", "Filter by reservation ID")
  .option("--channel <id>", "Filter by channel ID")
  .option("--custom-channel <name>", "Filter by custom channel name")
  .option("--include-custom-channels", "Include custom channel reviews")
  .option("--from <date-time>", "Updated on or after this ISO 8601 timestamp")
  .option("--to <date-time>", "Updated on or before this ISO 8601 timestamp")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    dateRange(opts.from, opts.to);
    const params: Record<string, string | number | boolean> = {
      limit: integer(opts.limit, "--limit", 1),
      skip: integer(opts.skip, "--skip"),
    };
    if (opts.listing) params.listingId = opts.listing;
    if (opts.reservation) params.reservationId = opts.reservation;
    if (opts.channel) params.channelId = opts.channel;
    if (opts.customChannel) params.customChannelName = opts.customChannel;
    if (opts.includeCustomChannels) params.includeCustomChannels = true;
    if (opts.from) params.startDate = opts.from;
    if (opts.to) params.endDate = opts.to;
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
  .requiredOption("--listing <id>", "Listing ID (repeat for multiple)", collect, [])
  .option("--include-custom-channels", "Include custom channel reviews")
  .action(async (opts) => {
    if (!opts.listing.length) throw new Error("At least one --listing is required.");
    // Brackets preserve array semantics when only one listing is requested.
    const params = { "listingIds[]": opts.listing, ...(opts.includeCustomChannels ? { includeCustomChannels: true } : {}) };
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
      body: { reviewReply: opts.body },
    });
    print(data);
  });
