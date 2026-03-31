import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const accounting = new Command("accounting")
  .alias("acct")
  .description("Accounting, expenses, and financial data");

accounting
  .command("balance <reservationId>")
  .description("Get folio balance for a reservation")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/accounting-api/reservations/${id}/balance`);
    print(data);
  });

accounting
  .command("journal-entries")
  .description("Get recognized journal entries")
  .option("--limit <n>", "Max results", "100")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/accounting-api/journal-entries", {
      params: { limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });

accounting
  .command("journal-entries-all")
  .description("Get all journal entries (including unrecognized)")
  .option("--limit <n>", "Max results", "100")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/accounting-api/journal-entries/all", {
      params: { limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });

accounting
  .command("categories")
  .description("Get accounting categories")
  .action(async () => {
    const data = await guestyFetch("/v1/accounting-api/categories");
    print(data);
  });

accounting
  .command("working-capital <ownerId>")
  .description("Get owner working capital")
  .action(async (ownerId: string) => {
    const data = await guestyFetch(`/v1/accounting-api/owners/${ownerId}/working-capital`);
    print(data);
  });

accounting
  .command("business-models")
  .description("Get business models")
  .action(async () => {
    const data = await guestyFetch("/v1/business-models-api/light-business-models");
    print(data);
  });

accounting
  .command("expenses")
  .description("List expenses")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/expenses-api/expenses", {
      params: { limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });

accounting
  .command("expense <id>")
  .description("Get expense by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/expenses-api/expenses/${id}`);
    print(data);
  });

accounting
  .command("create-expense")
  .description("Create an expense (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/expenses-api/expenses", { method: "POST", body });
    print(data);
  });

accounting
  .command("vendors")
  .description("List vendors")
  .action(async () => {
    const data = await guestyFetch("/v1/vendors");
    print(data);
  });

accounting
  .command("payment-transactions")
  .description("Get payment transactions from Guesty Pay")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/payment-transactions/reports", {
      params: { limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });
