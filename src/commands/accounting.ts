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
  .option("--days <n>", "Past N days", "30")
  .option("--date-filter <json>", 'Custom date filter JSON (e.g. \'{"operator":"@between","value":["2026-01-01","2026-03-31"]}\')')
  .option("--limit <n>", "Max results", "100")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const dateFilter = opts.dateFilter
      ? opts.dateFilter
      : JSON.stringify({ operator: "@in_past_days", value: parseInt(opts.days) });
    const data = await guestyFetch("/v1/accounting-api/journal-entries", {
      params: { transactionDate: dateFilter, limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });

accounting
  .command("journal-entries-all")
  .description("Get all journal entries (including unrecognized)")
  .option("--days <n>", "Past N days", "30")
  .option("--date-filter <json>", 'Custom date filter JSON (e.g. \'{"operator":"@between","value":["2026-01-01","2026-03-31"]}\')')
  .option("--limit <n>", "Max results", "100")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const dateFilter = opts.dateFilter
      ? opts.dateFilter
      : JSON.stringify({ operator: "@in_past_days", value: parseInt(opts.days) });
    const data = await guestyFetch("/v1/accounting-api/journal-entries/all", {
      params: { transactionDate: dateFilter, limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
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
  .command("set-working-capital <ownerId>")
  .description("Update owner working capital (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (ownerId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/accounting-api/owners/${ownerId}/working-capital`, {
      method: "PUT",
      body,
    });
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
  .command("assign-business-model <businessModelId>")
  .description("Assign listings to a business model (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (businessModelId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/business-models-api/assignment/${businessModelId}`, {
      method: "PUT",
      body,
    });
    print(data);
  });

accounting
  .command("create-owner-charge")
  .description("Create an owner charge (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/business-models-api/transactions/owner-charges", {
      method: "POST",
      body,
    });
    print(data);
  });

accounting
  .command("create-owner-charge-by-listing")
  .description("Create owner charges by listing (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/business-models-api/transactions/owner-charges-by-listing", {
      method: "POST",
      body,
    });
    print(data);
  });

accounting
  .command("create-business-expense")
  .description("Create a business-model expense (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/business-models-api/transactions/expenses", {
      method: "POST",
      body,
    });
    print(data);
  });

accounting
  .command("create-business-expense-by-listing")
  .description("Create a business-model expense by listing (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/business-models-api/transactions/expenses-by-listing", {
      method: "POST",
      body,
    });
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
  .command("cancel-expense <id>")
  .description("Cancel an expense")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/expenses-api/expenses/${id}/cancel`, {
      method: "POST",
    });
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
  .command("vendor <id>")
  .description("Get a vendor by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/vendors/${id}`);
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

accounting
  .command("payouts-reconciliation")
  .description("Get payouts reconciliation data from Guesty Pay")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/payment-transactions/reports/payouts-reconciliation", {
      params: { limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });

accounting
  .command("add-expense-attachment <id>")
  .description("Add an attachment to an expense (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/expenses-api/expenses/${id}/attachments`, { method: "POST", body });
    print(data);
  });

accounting
  .command("delete-expense-attachment <id> <attachmentId>")
  .description("Delete an attachment from an expense")
  .action(async (id: string, attachmentId: string) => {
    const data = await guestyFetch(`/v1/expenses-api/expenses/${id}/attachments/${attachmentId}`, { method: "DELETE" });
    print(data);
  });
