import { dateRange, dateTime, integer, type QueryParams } from "./query-options.js";

const periodFields: Record<string, string[]> = {
  month: ["year", "month"],
  year: ["year"],
  monthRange: ["fromYear", "fromMonth", "toYear", "toMonth"],
  yearRange: ["fromYear", "toYear"],
  fiscalYear: ["fiscalYear"],
  fiscalYearRange: ["fromFiscalYear", "toFiscalYear"],
};

function flag(name: string): string {
  return "--" + name.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
}


interface StatementOptions {
  [key: string]: string | string[] | undefined;
  listing: string[];
  businessModel: string[];
  status: string[];
  sharedVia: string[];
  limit: string;
  skip: string;
  periodMode?: string;
  owner?: string;
  statementType?: string;
  updatedSince?: string;
  generatedFrom?: string;
  generatedTo?: string;
}

export function ownerStatementParams(opts: StatementOptions, listingId?: string): QueryParams {
  const params: QueryParams = { limit: integer(opts.limit, "--limit", 1, 100), skip: integer(opts.skip, "--skip") };
  const supplied = [...new Set(Object.values(periodFields).flat())].filter((name) => opts[name] !== undefined);
  if (supplied.length && !opts.periodMode) throw new Error("--period-mode is required when period fields are provided.");
  if (opts.periodMode) {
    const required = periodFields[opts.periodMode];
    if (!required) throw new Error("Unknown --period-mode.");
    params.periodMode = opts.periodMode;
    for (const name of required) {
      const value = opts[name];
      if (typeof value !== "string") throw new Error(`${flag(name)} is required for --period-mode ${opts.periodMode}.`);
      params[name] = integer(value, flag(name), 1, /month/i.test(name) ? 12 : 9999);
    }
    if (opts.periodMode === "monthRange") {
      if (Number(params.fromYear) * 12 + Number(params.fromMonth) > Number(params.toYear) * 12 + Number(params.toMonth)) {
        throw new Error("The statement period start must be on or before its end.");
      }
    } else if ((opts.periodMode === "yearRange" && Number(params.fromYear) > Number(params.toYear)) ||
               (opts.periodMode === "fiscalYearRange" && Number(params.fromFiscalYear) > Number(params.toFiscalYear))) {
      throw new Error("The statement period start must be on or before its end.");
    }
  }
  if (opts.owner) params.ownerId = opts.owner;
  const listings = [...opts.listing, ...(listingId ? [listingId] : [])];
  if (listings.length) params.listingId = listings;
  if (opts.businessModel.length) params.businessModelId = opts.businessModel;
  if (opts.status.length) params.status = opts.status;
  if (opts.sharedVia.length) params.sharedVia = opts.sharedVia;
  if (opts.statementType) params.statementType = opts.statementType;
  if (opts.updatedSince) params.updatedSince = dateTime(opts.updatedSince, "--updated-since");
  dateRange(opts.generatedFrom, opts.generatedTo, "--generated-from", "--generated-to");
  if (opts.generatedFrom) params.generatedAtFrom = dateTime(opts.generatedFrom, "--generated-from");
  if (opts.generatedTo) params.generatedAtTo = dateTime(opts.generatedTo, "--generated-to");
  return params;
}
