import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { collect, jsonObject } from "./query-options.js";

// [Beta] Listing basic fees. The cleaning fee is currently the only basic fee.

const MULTIPLIERS = ["PER_STAY", "PER_GUEST", "PER_NIGHT", "PER_GUEST_PER_NIGHT"];

function validateCleaningFee(fee: unknown, label: string): void {
  const value = (fee as Record<string, unknown> | null)?.value as Record<string, unknown> | undefined;
  if (!value || typeof value !== "object") throw new Error(`${label}.value is required.`);
  if (!["FIXED", "PERCENTAGE"].includes(value.valueType as string)) throw new Error(`${label}.value.valueType must be FIXED or PERCENTAGE.`);
  if (!MULTIPLIERS.includes(value.multiplier as string)) throw new Error(`${label}.value.multiplier must be one of ${MULTIPLIERS.join(", ")}.`);
  if (value.valueType === "PERCENTAGE" && value.multiplier !== "PER_STAY") {
    throw new Error(`${label}.value.multiplier must be PER_STAY for a PERCENTAGE fee.`);
  }
  if (typeof value.formula !== "number" || !Number.isFinite(value.formula)) throw new Error(`${label}.value.formula must be a number.`);
}

export const basicFees = new Command("basic-fees")
  .alias("bf")
  .description("[Beta] Listing basic fees (cleaning fee) and per-channel overrides");

basicFees
  .command("list")
  .description("Get basic fees for up to 50 listings; listings without basic fees are omitted")
  .requiredOption("--listing <id>", "Listing ID; repeat for up to 50 listings", collect, [])
  .action(async (opts) => {
    if (opts.listing.length > 50) throw new Error("--listing accepts at most 50 listings per request; split larger sets into batches.");
    print(await guestyFetch("/v1/basic-fees/listings", { params: { listingIds: opts.listing } }));
  });

basicFees
  .command("get <listingId>")
  .description("Get a listing's basic fees and channel overrides")
  .action(async (listingId: string) => {
    print(await guestyFetch(`/v1/basic-fees/listings/${listingId}`));
  });

basicFees
  .command("channel <listingId> <channel>")
  .description("Get the cleaning fee a channel receives for a listing, such as airbnb2 or bookingCom")
  .action(async (listingId: string, channel: string) => {
    print(await guestyFetch(`/v1/basic-fees/listings/${listingId}/channels/${channel}`));
  });

basicFees
  .command("set <listingId>")
  .description("Replace a listing's basic fees (--data or stdin with channelConfigurations, and optional cleaningFee)")
  .option("--data <json>", "JSON body; channelConfigurations is required, [] clears every override")
  .option("--update-sub-units", "Overwrite the listing's child units with the same payload")
  .action(async (listingId: string, opts) => {
    const body = jsonObject(opts.data ?? await readStdin(), "--data or stdin");
    if (!Array.isArray(body.channelConfigurations)) {
      throw new Error("The request body needs channelConfigurations as an array; send [] for no channel overrides.");
    }
    if (body.cleaningFee !== undefined) validateCleaningFee(body.cleaningFee, "cleaningFee");
    body.channelConfigurations.forEach((entry: unknown, index: number) => {
      const config = entry as Record<string, unknown> | null;
      if (!config || typeof config !== "object" || typeof config.channel !== "string" || !config.channel) {
        throw new Error(`channelConfigurations[${index}].channel is required.`);
      }
      if (config.cleaningFee !== undefined) validateCleaningFee(config.cleaningFee, `channelConfigurations[${index}].cleaningFee`);
    });
    const params: Record<string, boolean> = {};
    if (opts.updateSubUnits) params.shouldUpdateSubUnits = true;
    print(await guestyFetch(`/v1/basic-fees/listings/${listingId}`, { method: "PUT", body, params }));
  });

basicFees
  .command("delete <listingId>")
  .description("Delete all of a listing's basic fees and channel overrides")
  .action(async (listingId: string) => {
    print(await guestyFetch(`/v1/basic-fees/listings/${listingId}`, { method: "DELETE" }));
  });
