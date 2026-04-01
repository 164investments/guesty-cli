import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";

export const blockLogs = new Command("block-logs")
  .description("Calendar block logs");

blockLogs
  .command("list")
  .description("List block logs")
  .option("--listing <id>", "Filter by listing ID")
  .option("--user <name>", "Filter by user name")
  .option("--start-date <date>", "Filter by block start date")
  .option("--end-date <date>", "Filter by block end date")
  .option("--block-type <type>", "Filter by block type (manual, preparation_time)")
  .option("--event-type <type>", "Filter by event type (created, updated, removed)")
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.listing) params.listingId = opts.listing;
    if (opts.user) params.userName = opts.user;
    if (opts.startDate) params.startDate = opts.startDate;
    if (opts.endDate) params.endDate = opts.endDate;
    if (opts.blockType) params.blockType = opts.blockType;
    if (opts.eventType) params.eventType = opts.eventType;
    const data = await guestyFetch("/v1/api/block-logs", { params });
    print(data);
  });
