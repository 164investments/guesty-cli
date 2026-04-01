import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const calendar = new Command("calendar")
  .alias("cal")
  .description("Calendar and availability");

calendar
  .command("get <listingId>")
  .description("Get calendar for a listing")
  .requiredOption("--from <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--to <date>", "End date (YYYY-MM-DD)")
  .action(async (listingId: string, opts) => {
    const data = await guestyFetch(
      `/v1/availability-pricing/api/calendar/listings/${listingId}`,
      { params: { from: opts.from, to: opts.to } }
    );
    print(data);
  });

calendar
  .command("minified <listingId>")
  .description("Get the optimized calendar for a listing")
  .action(async (listingId: string) => {
    const data = await guestyFetch(`/v1/availability-pricing/api/calendar/listings/minified/${listingId}`);
    print(data);
  });

calendar
  .command("list")
  .description("Get calendars for multiple listings")
  .option("--listing <id>", "Listing ID", (value: string, previous: string[]) => [...previous, value], [])
  .option("--from <date>", "Start date (YYYY-MM-DD)")
  .option("--to <date>", "End date (YYYY-MM-DD)")
  .action(async (opts) => {
    const params: Record<string, string | string[]> = {};
    if (opts.listing.length > 0) params.listingId = opts.listing;
    if (opts.from) params.from = opts.from;
    if (opts.to) params.to = opts.to;
    const data = await guestyFetch("/v1/availability-pricing/api/calendar/listings", { params });
    print(data);
  });

calendar
  .command("update <listingId>")
  .description("Update calendar (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (listingId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(
      `/v1/availability-pricing/api/calendar/listings/${listingId}`,
      { method: "PUT", body }
    );
    print(data);
  });

calendar
  .command("update-many")
  .description("Update calendar for multiple listings (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/availability-pricing/api/calendar/listings", {
      method: "PUT",
      body,
    });
    print(data);
  });

calendar
  .command("block <listingId>")
  .description("Block dates on a listing")
  .requiredOption("--from <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--to <date>", "End date (YYYY-MM-DD)")
  .option("--note <text>", "Block note")
  .action(async (listingId: string, opts) => {
    const data = await guestyFetch(
      `/v1/availability-pricing/api/calendar/listings/${listingId}`,
      {
        method: "PUT",
        body: {
          dateFrom: opts.from,
          dateTo: opts.to,
          status: "unavailable",
          note: opts.note,
        },
      }
    );
    print(data);
  });
