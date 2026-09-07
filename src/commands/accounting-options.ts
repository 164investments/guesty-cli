import { dateRange, integer, jsonObject, type QueryParams } from "./query-options.js";

interface JournalOptions {
  days: string;
  dateFilter?: string;
  from?: string;
  to?: string;
  limit: string;
  skip: string;
  listing: string[];
  owner: string[];
  vendor: string[];
  guest: string[];
  ledger: string[];
  trigger: string[];
  chargeCode: string[];
  confirmationCode: string[];
  name?: string;
  description?: string;
  sortByDate?: string;
  recognized?: string;
}


export function journalParams(opts: JournalOptions): QueryParams {
  const params: QueryParams = {
    limit: integer(opts.limit, "--limit", 1, 100),
    skip: integer(opts.skip, "--skip"),
  };
  if (opts.from !== undefined || opts.to !== undefined) {
    if (!opts.from || !opts.to) throw new Error("Use both --from and --to for a transaction date range.");
    if (opts.dateFilter !== undefined) throw new Error("Use a date range or --date-filter, not both.");
    dateRange(opts.from, opts.to);
    params.transactionDate = JSON.stringify({ operator: "@between", value: [opts.from, opts.to] });
  } else if (typeof opts.dateFilter === "string") {
    const filter = jsonObject(opts.dateFilter, "--date-filter");
    if (typeof filter.operator !== "string" || !Object.hasOwn(filter, "value")) {
      throw new Error("--date-filter must contain operator and value.");
    }
    params.transactionDate = JSON.stringify(filter);
  } else {
    params.transactionDate = JSON.stringify({ operator: "@in_past_days", value: integer(opts.days, "--days", 1) });
  }
  const arrayKeys = {
    listing: "listings", owner: "owners", vendor: "vendors", guest: "guests", ledger: "ledger",
    trigger: "triggers", chargeCode: "chargeCode", confirmationCode: "reservationConfirmationCodes",
  } as const;
  for (const [key, param] of Object.entries(arrayKeys)) {
    const value = opts[key as keyof typeof arrayKeys];
    if (value.length) params[param] = value;
  }
  if (opts.name) params.name = opts.name;
  if (opts.description) params.description = opts.description;
  if (opts.sortByDate) params.sortByDate = opts.sortByDate;
  if (opts.recognized !== undefined) params.recognized = opts.recognized;
  return params;
}
