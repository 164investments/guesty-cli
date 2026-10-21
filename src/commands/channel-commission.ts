import { Command, Option } from "commander";
import { guestyFetch } from "../client.js";
import { print, warnDeprecated } from "../output.js";
import { readStdin } from "../stdin.js";
import { date, dateRange, decimal, jsonArray, jsonObject } from "./query-options.js";

export const channelCommission = new Command("channel-commission")
  .alias("cc")
  .description("Manage channel commission settings");

channelCommission
  .command("account")
  .description("[deprecated] Get account channel commission — use 'account-v2' instead")
  .action(async () => {
    warnDeprecated("channel-commission account", "channel-commission account-v2");
    const data = await guestyFetch("/v1/channel-commission/account");
    print(data);
  });

channelCommission
  .command("account-update")
  .description("[deprecated] Update account channel commission (--data or stdin) — use 'account-update-v2' instead")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    warnDeprecated("channel-commission account-update", "channel-commission account-update-v2");
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/channel-commission/account", { method: "PUT", body });
    print(data);
  });

channelCommission
  .command("listings")
  .description("[deprecated] Get listings channel commission — use 'listing-v2' or 'listing-effective-v2' instead")
  .requiredOption("--listing-ids <ids>", "Comma-separated listing IDs")
  .action(async (opts) => {
    warnDeprecated("channel-commission listings", "channel-commission listing-v2 <unitTypeId>");
    const data = await guestyFetch("/v1/channel-commission/listings", {
      params: { listingIds: opts.listingIds.split(",") },
    });
    print(data);
  });

channelCommission
  .command("listings-update")
  .description("[deprecated] Update listings channel commission (--data or stdin) — use 'listing-update-v2' instead")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    warnDeprecated("channel-commission listings-update", "channel-commission listing-update-v2 <unitTypeId>");
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/channel-commission/listings", { method: "PUT", body });
    print(data);
  });

// ─── Channel commissions v2 ──────────────────────────────────────────────────

function validateCommission(entry: unknown, label: string): void {
  const item = entry as Record<string, unknown> | null;
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`${label} must be an object.`);
  for (const key of ["channel", "source"]) {
    if (typeof item[key] !== "string" || !(item[key] as string).trim()) throw new Error(`${label}.${key} is required.`);
  }
  const percent = (value: unknown) => typeof value === "number" && value >= 0 && value <= 100;
  if (item.commission !== undefined) {
    const commission = item.commission as Record<string, unknown> | null;
    if (!percent(commission?.value)) throw new Error(`${label}.commission.value must be a percentage from 0 to 100.`);
    if (!Array.isArray(commission?.of) || !commission.of.length || commission.of.some((charge) => typeof charge !== "string")) {
      throw new Error(`${label}.commission.of must list the charges it applies to, such as ACCOMMODATION_FARE.`);
    }
  }
  if (item.tax !== undefined && !percent(item.tax)) throw new Error(`${label}.tax must be a percentage from 0 to 100.`);
  if (item.isPreDeduct !== undefined && typeof item.isPreDeduct !== "boolean") throw new Error(`${label}.isPreDeduct must be true or false.`);
}

async function readCommissionList(data?: string): Promise<unknown[]> {
  const body = jsonArray(data ?? await readStdin(), "--data or stdin");
  body.forEach((entry, index) => validateCommission(entry, `[${index}]`));
  return body;
}

channelCommission
  .command("account-v2")
  .description("Get account-level channel commissions")
  .action(async () => {
    print(await guestyFetch("/v1/channel-commissions-v2/account"));
  });

channelCommission
  .command("account-update-v2")
  .description("Create or replace account-level channel commissions (--data or stdin: array of {channel, source, commission, tax, isPreDeduct})")
  .option("--data <json>", "JSON array")
  .action(async (opts) => {
    const body = await readCommissionList(opts.data);
    print(await guestyFetch("/v1/channel-commissions-v2/account", { method: "PUT", body }));
  });

channelCommission
  .command("create-v2")
  .description("Create one channel commission; include unitTypeId for a listing-level entry (--data or stdin)")
  .option("--data <json>", "JSON body with channel, source, and optional unitTypeId, commission, tax, isPreDeduct")
  .action(async (opts) => {
    const body = jsonObject(opts.data ?? await readStdin(), "--data or stdin");
    validateCommission(body, "body");
    print(await guestyFetch("/v1/channel-commissions-v2", { method: "POST", body }));
  });

channelCommission
  .command("update-v2 <channelCommissionId>")
  .description("Replace one channel commission; omitted commission or tax is removed (--data or stdin)")
  .option("--data <json>", "JSON body with channel, source, and optional unitTypeId, commission, tax, isPreDeduct")
  .action(async (channelCommissionId: string, opts) => {
    const body = jsonObject(opts.data ?? await readStdin(), "--data or stdin");
    validateCommission(body, "body");
    print(await guestyFetch(`/v1/channel-commissions-v2/${channelCommissionId}`, { method: "PATCH", body }));
  });

channelCommission
  .command("delete-v2 <channelCommissionId>")
  .description("Delete one channel commission")
  .action(async (channelCommissionId: string) => {
    print(await guestyFetch(`/v1/channel-commissions-v2/${channelCommissionId}`, { method: "DELETE" }));
  });

channelCommission
  .command("listing-v2 <unitTypeId>")
  .description("Get a listing's own channel commissions (a sub-unit resolves to its parent)")
  .action(async (unitTypeId: string) => {
    print(await guestyFetch(`/v1/channel-commissions-v2/unit-type/${unitTypeId}`));
  });

channelCommission
  .command("listing-update-v2 <unitTypeId>")
  .description("Create or replace a listing's channel commissions (--data or stdin: array of {channel, source, commission, tax, isPreDeduct})")
  .option("--data <json>", "JSON array")
  .action(async (unitTypeId: string, opts) => {
    const body = await readCommissionList(opts.data);
    print(await guestyFetch(`/v1/channel-commissions-v2/unit-type/${unitTypeId}`, { method: "PUT", body }));
  });

channelCommission
  .command("listing-effective-v2 <unitTypeId>")
  .description("Get the channel commissions that actually apply to a listing's reservations")
  .action(async (unitTypeId: string) => {
    print(await guestyFetch(`/v1/channel-commissions-v2/unit-type/${unitTypeId}/actual`));
  });

channelCommission
  .command("listing-level-v2 <unitTypeId>")
  .description("Get whether a listing uses account-level or listing-level commissions")
  .action(async (unitTypeId: string) => {
    print(await guestyFetch(`/v1/channel-commissions-v2/unit-type/${unitTypeId}/level-configurations`));
  });

channelCommission
  .command("listing-level-update-v2 <unitTypeId>")
  .description("Set whether a listing uses account-level or listing-level commissions")
  .addOption(new Option("--level <level>", "ACCOUNT inherits account commissions; UNIT_TYPE uses the listing's own").choices(["ACCOUNT", "UNIT_TYPE"]).makeOptionMandatory())
  .action(async (unitTypeId: string, opts) => {
    print(await guestyFetch(`/v1/channel-commissions-v2/unit-type/${unitTypeId}/level-configurations`, {
      method: "PUT", body: { levelEntityType: opts.level },
    }));
  });

channelCommission
  .command("reservation-update-v2 <reservationId>")
  .description("[Beta] Set a reservation's channel commission amount and when accounting recognizes it")
  .requiredOption("--amount <amount>", "Commission amount in the reservation currency (0 or more)")
  .option("--date <date>", "Single recognition date (YYYY-MM-DD, listing time zone)")
  .option("--from <date>", "Recognition range start (YYYY-MM-DD; requires --to)")
  .option("--to <date>", "Recognition range end (YYYY-MM-DD; requires --from)")
  .action(async (reservationId: string, opts) => {
    const range = opts.from !== undefined || opts.to !== undefined;
    if ((opts.date !== undefined) === range) throw new Error("Use --date, or --from with --to, for the recognition dates.");
    if (range && (opts.from === undefined || opts.to === undefined)) throw new Error("Use both --from and --to for a recognition range.");
    const realizationDates = opts.date !== undefined
      ? { date: date(opts.date, "--date") }
      : { from: date(opts.from, "--from"), to: date(opts.to, "--to") };
    if (range) dateRange(opts.from, opts.to);
    print(await guestyFetch(`/v1/channel-commissions-v2/reservations/${reservationId}`, {
      method: "PUT", body: { realizationDates, amount: decimal(opts.amount, "--amount", 0) },
    }));
  });
