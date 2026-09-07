import { Command, Option } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { journalParams } from "./accounting-options.js";
import { collect } from "./query-options.js";
import { ownerStatementParams } from "./owner-statement-options.js";

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
  .description("List recognized journal entries")
  .option("--days <n>", "Past N days (default date filter)", "30")
  .option("--date-filter <json>", "Transaction date filter JSON with operator and value")
  .option("--from <date>", "Transaction date range start (requires --to)")
  .option("--to <date>", "Transaction date range end (requires --from)")
  .option("--listing <id>", "Filter by listing ID (repeat for multiple)", collect, [])
  .option("--owner <id>", "Filter by owner ID (repeat for multiple)", collect, [])
  .option("--vendor <id>", "Filter by vendor ID (repeat for multiple)", collect, [])
  .option("--guest <id>", "Filter by guest ID (repeat for multiple)", collect, [])
  .option("--ledger <type>", "Filter by ledger (repeat for multiple)", collect, [])
  .option("--trigger <type>", "Filter by trigger, including DISBURSEMENT or BULK_UPLOADS (repeatable)", collect, [])
  .option("--charge-code <code>", "Filter by charge code (repeatable)", collect, [])
  .option("--confirmation-code <code>", "Filter by reservation confirmation code (repeatable)", collect, [])
  .option("--name <text>", "Filter by journal entry name")
  .option("--description <text>", "Filter by journal entry description")
  .addOption(new Option("--sort-by-date <order>", "Date sort order").choices(["ASC", "DESC"]))
  .option("--limit <n>", "Max results (1-100)", "100")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    print(await guestyFetch("/v1/accounting-api/journal-entries", { params: journalParams(opts) }));
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
  .description("Get financial settings for a listing")
  .action(async (listingId: string) => {
    print(await guestyFetch(`/v1/financials/listing/${listingId}`));
  });

financials
  .command("owner-statement <listingId>")
  .description("List actual owner statements covering a listing")
  .option("--owner <id>", "Filter by owner ID")
  .option("--listing <id>", "Filter by listing ID (repeat for multiple)", collect, [])
  .option("--business-model <id>", "Filter by business model ID (repeat for multiple)", collect, [])
  .addOption(new Option("--period-mode <mode>", "Period filter mode").choices(["month", "year", "monthRange", "yearRange", "fiscalYear", "fiscalYearRange"]))
  .option("--year <n>", "Period filter year")
  .option("--month <n>", "Period filter month")
  .option("--from-year <n>", "Period filter fromYear")
  .option("--from-month <n>", "Period filter fromMonth")
  .option("--to-year <n>", "Period filter toYear")
  .option("--to-month <n>", "Period filter toMonth")
  .option("--fiscal-year <n>", "Period filter fiscalYear")
  .option("--from-fiscal-year <n>", "Period filter fromFiscalYear")
  .option("--to-fiscal-year <n>", "Period filter toFiscalYear")
  .option("--updated-since <date-time>", "Incremental sync timestamp (ISO 8601 with timezone)")
  .option("--generated-from <date-time>", "Generation timestamp range start")
  .option("--generated-to <date-time>", "Generation timestamp range end")
  .addOption(new Option("--statement-type <type>", "Statement type").choices(["MONTHLY", "ANNUAL", "ANNUAL_SUMMARY", "ANNUAL_SUMMARY_BY_MONTH"]))
  .option("--status <status>", "Lifecycle status (repeat for multiple)", collect, [])
  .option("--shared-via <channel>", "Sharing channel (repeat for multiple)", collect, [])
  .option("--limit <n>", "Max results (1-100)", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (listingId: string, opts) => {
    print(await guestyFetch("/v1/owner-statement-api/owner-statements", { params: ownerStatementParams(opts, listingId) }));
  });

financials
  .command("folio-overview")
  .description("Read selected financial totals for up to 200 reservations")
    .requiredOption("--reservations <ids>", "Comma-separated reservation IDs (max 200)")
    .requiredOption("--fields <fields>", "Comma-separated API field names; nested fields require leaf paths")
    .action(async (opts) => {
      const ids = String(opts.reservations).split(",").map((value) => value.trim());
      if (!ids.length || ids.length > 200 || ids.some((id) => id.length !== 24)) {
        throw new Error("--reservations must contain 1-200 comma-separated reservation IDs of 24 characters each.");
      }
      const fields = String(opts.fields).split(",").map((value) => value.trim());
      if (fields.some((value) => !value)) throw new Error("--fields must contain at least one field and no empty entries.");
      print(await guestyFetch("/v1/guest-folio/overview", { params: { reservationIds: ids.join(","), fields: fields.join(",") } }));
    });

financials
  .command("folio-invoice-items")
  .description("Read selected invoice item data for up to 200 reservations")
    .requiredOption("--reservations <ids>", "Comma-separated reservation IDs (max 200)")
    .requiredOption("--fields <fields>", "Comma-separated API field names; nested fields require leaf paths")
    .action(async (opts) => {
      const ids = String(opts.reservations).split(",").map((value) => value.trim());
      if (!ids.length || ids.length > 200 || ids.some((id) => id.length !== 24)) {
        throw new Error("--reservations must contain 1-200 comma-separated reservation IDs of 24 characters each.");
      }
      const fields = String(opts.fields).split(",").map((value) => value.trim());
      if (fields.some((value) => !value)) throw new Error("--fields must contain at least one field and no empty entries.");
      print(await guestyFetch("/v1/guest-folio/invoice-items", { params: { reservationIds: ids.join(","), fields: fields.join(",") } }));
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
