import { Command, Option } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { collect, dateRange, integer, type QueryParams } from "./query-options.js";
import { journalParams } from "./accounting-options.js";

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

accounting
  .command("journal-entries-all")
  .description("Get all journal entries (including unrecognized)")
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
  .addOption(new Option("--recognized <boolean>", "Filter by recognition status").choices(["true", "false"]))
  .action(async (opts) => {
    print(await guestyFetch("/v1/accounting-api/journal-entries/all", { params: journalParams(opts) }));
  });

accounting
  .command("categories")
  .description("Get accounting categories")
  .option("--q <name>", "Filter by category name")
  .option("--limit <n>", "Max results (1-100)", "20")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const params: QueryParams = { limit: integer(opts.limit, "--limit", 1, 100), skip: integer(opts.skip, "--skip") };
    if (opts.q) params.q = opts.q;
    const data = await guestyFetch("/v1/accounting-api/categories", { params });
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
  .option("--include-assigned-listings", "Include listing assignments and activation dates")
  .option("--limit <n>", "Max results (omitted returns all)")
  .option("--skip <n>", "Offset")
  .action(async (opts) => {
    const params: QueryParams = {};
    if (opts.includeAssignedListings) params.includeAssignedListings = true;
    if (opts.limit !== undefined) params.limit = integer(opts.limit, "--limit", 1);
    if (opts.skip !== undefined) params.skip = integer(opts.skip, "--skip");
    const data = await guestyFetch("/v1/business-models-api/light-business-models", { params });
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
  .option("--status <statuses>", "Comma-separated expense statuses")
  .option("--category <id>", "Filter by category ID")
  .option("--vendor <id>", "Filter by vendor ID")
  .option("--owner <id>", "Filter by owner ID")
  .option("--listing <id>", "Filter by listing ID")
  .option("--reservation <id>", "Filter by reservation ID")
  .option("--expense-rule <id>", "Filter by expense rule ID")
  .option("--from <date>", "Expense date range start (YYYY-MM-DD)")
  .option("--to <date>", "Expense date range end (YYYY-MM-DD)")
  .addOption(new Option("--sort-by <field>", "Sort field").choices(["expenseDate", "createdAt", "amount"]))
  .addOption(new Option("--sort-order <order>", "Sort order").choices(["ASC", "DESC"]))
  .option("--limit <n>", "Max results (1-100)", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    dateRange(opts.from, opts.to);
    const params: QueryParams = { limit: integer(opts.limit, "--limit", 1, 100), skip: integer(opts.skip, "--skip") };
    const mappings = { status: "status", category: "categoryId", vendor: "vendorId", owner: "ownerId", listing: "listingId",
      reservation: "reservationId", expenseRule: "expenseRuleId", from: "expenseDateFrom", to: "expenseDateTo", sortBy: "sortBy", sortOrder: "sortOrder" };
    for (const [option, param] of Object.entries(mappings)) if (opts[option]) params[param] = opts[option];
    const data = await guestyFetch("/v1/expenses-api/expenses", { params });
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
  .option("--limit <n>", "Max results (25-100)", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/vendors", {
      params: { limit: integer(opts.limit, "--limit", 25, 100), skip: integer(opts.skip, "--skip") },
    });
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
  .description("Get payment transactions from GuestyPay")
  .option("--from <date>", "Start date filter (YYYY-MM-DD)")
  .option("--to <date>", "End date filter (YYYY-MM-DD)")
  .option("--sub-account <id>", "Sub-account ID in accountId.subAccountId format")
  .option("--confirmation-code <code>", "Reservation confirmation code; cannot combine with other filters")
  .option("--limit <n>", "Max results (1-100), sent as API take", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    dateRange(opts.from, opts.to);
    if (opts.confirmationCode && (opts.from || opts.to || opts.subAccount || opts.payout)) {
      throw new Error("--confirmation-code cannot be combined with date, sub-account, or payout filters.");
    }
    if (!opts.confirmationCode && (!opts.from || !opts.to)) {
      throw new Error("Use both --from and --to, or provide --confirmation-code to look up one reservation.");
    }
    const params: QueryParams = { take: integer(opts.limit, "--limit", 1, 100), skip: integer(opts.skip, "--skip") };
    const mappings = { from: "startDate", to: "endDate", subAccount: "subAccountId", confirmationCode: "reservationConfirmationCode", payout: "payoutId" };
    for (const [option, param] of Object.entries(mappings)) if (opts[option]) params[param] = opts[option];
    print(await guestyFetch("/v1/payment-transactions/reports", { params }));
  });

accounting
  .command("payouts-reconciliation")
  .description("Get payout reconciliation data from GuestyPay")
  .option("--from <date>", "Start date filter (YYYY-MM-DD)")
  .option("--to <date>", "End date filter (YYYY-MM-DD)")
  .option("--sub-account <id>", "Sub-account ID in accountId.subAccountId format")
  .option("--confirmation-code <code>", "Reservation confirmation code; cannot combine with other filters")
  .option("--limit <n>", "Max results (1-100), sent as API take", "25")
  .option("--skip <n>", "Offset", "0")
  .option("--payout <id>", "Filter by payout ID")
  .action(async (opts) => {
    dateRange(opts.from, opts.to);
    if (opts.confirmationCode && (opts.from || opts.to || opts.subAccount || opts.payout)) {
      throw new Error("--confirmation-code cannot be combined with date, sub-account, or payout filters.");
    }
    if (!opts.confirmationCode && (!opts.from || !opts.to)) {
      throw new Error("Use both --from and --to, or provide --confirmation-code to look up one reservation.");
    }
    const params: QueryParams = { take: integer(opts.limit, "--limit", 1, 100), skip: integer(opts.skip, "--skip") };
    const mappings = { from: "startDate", to: "endDate", subAccount: "subAccountId", confirmationCode: "reservationConfirmationCode", payout: "payoutId" };
    for (const [option, param] of Object.entries(mappings)) if (opts[option]) params[param] = opts[option];
    print(await guestyFetch("/v1/payment-transactions/reports/payouts-reconciliation", { params }));
  });

accounting
  .command("disbursements")
  .description("List disbursements (amounts are available through journal entries)")
  .option("--from <date>", "Payout date range start (YYYY-MM-DD)")
  .option("--to <date>", "Payout date range end (YYYY-MM-DD)")
  .option("--created-from <date-time>", "Creation timestamp range start")
  .option("--created-to <date-time>", "Creation timestamp range end")
  .option("--status <status>", "Payout status (repeat for multiple)", collect, [])
  .option("--method <method>", "Payout method (repeat for multiple)", collect, [])
  .option("--entity <name>", "Entity name contains filter")
  .option("--reference <number>", "Exact reference number")
  .addOption(new Option("--sort <field>", "Sort field, prefix with - for descending")
    .choices(["payoutDate", "-payoutDate", "createdAt", "-createdAt", "payoutStatus", "-payoutStatus", "checkNumber", "-checkNumber"]))
  .option("--limit <n>", "Max results (1-100)", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    dateRange(opts.from, opts.to);
    dateRange(opts.createdFrom, opts.createdTo, "--created-from", "--created-to");
    const params: QueryParams = { limit: integer(opts.limit, "--limit", 1, 100), skip: integer(opts.skip, "--skip") };
    const mappings = { from: "payoutDateFrom", to: "payoutDateTo", createdFrom: "createdAtFrom", createdTo: "createdAtTo",
      entity: "entityName", reference: "referenceNumber", sort: "sort" };
    for (const [option, param] of Object.entries(mappings)) if (opts[option]) params[param] = opts[option];
    if (opts.status.length) params.payoutStatus = opts.status;
    if (opts.method.length) params.payoutMethod = opts.method;
    print(await guestyFetch("/v1/accounting-api/disbursements", { params }));
  });

accounting
  .command("disbursement <id>")
  .description("Get a disbursement by ID")
  .action(async (id: string) => {
    print(await guestyFetch(`/v1/accounting-api/disbursements/${id}`));
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
