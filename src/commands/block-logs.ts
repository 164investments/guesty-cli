import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";

export const blockLogs = new Command("block-logs")
  .description("Calendar block logs");

blockLogs
  .command("list")
  .description("List block logs")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/api/block-logs", {
      params: { limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });
