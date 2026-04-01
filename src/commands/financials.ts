import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const financials = new Command("financials")
  .alias("fin")
  .description("Financial data and accounting");

financials
  .command("balance <reservationId>")
  .description("Get folio balance for a reservation")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/accounting-api/reservations/${id}/balance`);
    print(data);
  });

financials
  .command("journal-entries")
  .description("List journal entries")
  .option("--from <date>", "From date (YYYY-MM-DD)")
  .option("--to <date>", "To date (YYYY-MM-DD)")
  .option("--listing <id>", "Filter by listing ID")
  .option("--limit <n>", "Max results", "100")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const params: Record<string, string | number> = {
      limit: parseInt(opts.limit),
      skip: parseInt(opts.skip),
    };
    if (opts.from) params.from = opts.from;
    if (opts.to) params.to = opts.to;
    if (opts.listing) params.listingId = opts.listing;
    const data = await guestyFetch("/v1/accounting-api/journal-entries", { params });
    print(data);
  });

financials
  .command("categories")
  .description("List accounting categories")
  .action(async () => {
    const data = await guestyFetch("/v1/accounting-api/categories");
    print(data);
  });

financials
  .command("listing <listingId>")
  .description("Get financial data for a listing")
  .option("--from <date>", "From date (YYYY-MM-DD)")
  .option("--to <date>", "To date (YYYY-MM-DD)")
  .action(async (listingId: string, opts) => {
    const params: Record<string, string> = {};
    if (opts.from) params.from = opts.from;
    if (opts.to) params.to = opts.to;
    const data = await guestyFetch(`/v1/financials/listing/${listingId}`, { params });
    print(data);
  });

financials
  .command("owner-statement <listingId>")
  .description("Get financial data for a listing")
  .option("--from <date>", "From date (YYYY-MM-DD)")
  .option("--to <date>", "To date (YYYY-MM-DD)")
  .action(async (listingId: string, opts) => {
    const params: Record<string, string> = {};
    if (opts.from) params.from = opts.from;
    if (opts.to) params.to = opts.to;
    const data = await guestyFetch(`/v1/financials/listing/${listingId}`, { params });
    print(data);
  });

financials
  .command("update-listing <listingId>")
  .description("Update financial data for a listing (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (listingId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/financials/listing/${listingId}`, {
      method: "PUT",
      body,
    });
    print(data);
  });
