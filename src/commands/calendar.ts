import { Command, Option } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { date, dateRange } from "./query-options.js";

const BLOCK_REASONS = [
  "Owner block", "Offboarded", "Migrated unit block", "Maintenance", "Onboarding",
  "Emergency out of order", "Do not sell", "Deactivated", "Other",
];

interface CalendarOptions {
  from: string;
  to: string;
  includeAllotment?: boolean;
  ignoreInactiveChildAllotment?: boolean;
  ignoreUnlistedChildAllotment?: boolean;
}

function calendarParams(opts: CalendarOptions): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {
    startDate: date(opts.from, "--from"),
    endDate: date(opts.to, "--to"),
  };
  dateRange(opts.from, opts.to);
  if (opts.includeAllotment) params.includeAllotment = true;
  if (opts.ignoreInactiveChildAllotment) params.ignoreInactiveChildAllotment = true;
  if (opts.ignoreUnlistedChildAllotment) params.ignoreUnlistedChildAllotment = true;
  return params;
}

function validateCalendarUpdate(body: unknown): void {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Calendar update must be a JSON object with startDate and endDate.");
  }
  const record = body as Record<string, unknown>;
  if (typeof record.startDate !== "string" || typeof record.endDate !== "string") {
    throw new Error("Calendar update requires startDate and endDate (YYYY-MM-DD); dateFrom/dateTo are not supported.");
  }
  date(record.startDate, "startDate");
  date(record.endDate, "endDate");
  dateRange(record.startDate, record.endDate, "startDate", "endDate");
}

export const calendar = new Command("calendar")
  .alias("cal")
  .description("Calendar and availability");

calendar
  .command("get <listingId>")
  .description("Get calendar for a listing")
  .requiredOption("--from <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--to <date>", "End date (YYYY-MM-DD, inclusive)")
  .option("--include-allotment", "Include multi-unit allotment")
  .option("--ignore-inactive-child-allotment", "Exclude inactive sub-units from allotment")
  .option("--ignore-unlisted-child-allotment", "Exclude unlisted sub-units from allotment")
  .action(async (listingId: string, opts) => {
    const data = await guestyFetch(
      `/v1/availability-pricing/api/calendar/listings/${encodeURIComponent(listingId)}`,
      { params: calendarParams(opts) }
    );
    print(data);
  });

calendar
  .command("minified <listingId>")
  .description("Get the optimized calendar for a listing")
  .addOption(new Option("--view <view>", "Calendar detail level").choices(["compact", "full"]))
  .requiredOption("--from <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--to <date>", "End date (YYYY-MM-DD, inclusive)")
  .option("--include-allotment", "Include multi-unit allotment")
  .option("--ignore-inactive-child-allotment", "Exclude inactive sub-units from allotment")
  .option("--ignore-unlisted-child-allotment", "Exclude unlisted sub-units from allotment")
  .action(async (listingId: string, opts) => {
    const params = calendarParams(opts);
    if (opts.view) params.view = opts.view;
    const data = await guestyFetch(`/v1/availability-pricing/api/calendar/listings/minified/${encodeURIComponent(listingId)}`, { params });
    print(data);
  });

calendar
  .command("list")
  .description("Get calendars for multiple listings")
  .requiredOption("--listing <id>", "Listing ID (repeat for multiple listings)", (value: string, previous: string[]) => [...previous, value], [])
  .requiredOption("--from <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--to <date>", "End date (YYYY-MM-DD, inclusive)")
  .option("--include-allotment", "Include multi-unit allotment")
  .option("--ignore-inactive-child-allotment", "Exclude inactive sub-units from allotment")
  .option("--ignore-unlisted-child-allotment", "Exclude unlisted sub-units from allotment")
  .action(async (opts) => {
    if (opts.listing.length === 0 || opts.listing.some((id: string) => !id.trim())) {
      throw new Error("Provide at least one --listing ID.");
    }
    const params = { ...calendarParams(opts), listingIds: opts.listing.join(",") };
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
    validateCalendarUpdate(body);
    const data = await guestyFetch(
      `/v1/availability-pricing/api/calendar/listings/${encodeURIComponent(listingId)}`,
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
    if (!Array.isArray(body) || body.length === 0) {
      throw new Error("Calendar update-many requires a non-empty JSON array.");
    }
    for (const item of body) {
      validateCalendarUpdate(item);
      if (typeof item.listingId !== "string" || !item.listingId.trim()) {
        throw new Error("Each calendar update requires a listingId.");
      }
    }
    const data = await guestyFetch("/v1/availability-pricing/api/calendar/listings", {
      method: "PUT",
      body,
    });
    print(data);
  });

calendar
  .command("block <listingId>")
  .description("Block dates on a listing (inclusive; for one night use the same --from and --to)")
  .requiredOption("--from <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--to <date>", "End date (YYYY-MM-DD, inclusive)")
  .addOption(new Option("--reason <reason>", "Block reason (case-sensitive)").choices(BLOCK_REASONS).default("Other"))
  .option("--note <text>", "Block note")
  .action(async (listingId: string, opts) => {
    const { startDate, endDate } = calendarParams(opts);
    const data = await guestyFetch(
      `/v1/availability-pricing/api/calendar/listings/${encodeURIComponent(listingId)}`,
      {
        method: "PUT",
        body: {
          startDate,
          endDate,
          status: "unavailable",
          blockReason: opts.reason,
          note: opts.note,
        },
      }
    );
    print(data);
  });
