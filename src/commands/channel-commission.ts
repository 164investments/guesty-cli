import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const channelCommission = new Command("channel-commission")
  .alias("cc")
  .description("Manage channel commission settings");

channelCommission
  .command("account")
  .description("Get account channel commission")
  .action(async () => {
    const data = await guestyFetch("/v1/channel-commission/account");
    print(data);
  });

channelCommission
  .command("account-update")
  .description("Update account channel commission (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/channel-commission/account", { method: "PUT", body });
    print(data);
  });

channelCommission
  .command("listings")
  .description("Get listings channel commission")
  .action(async () => {
    const data = await guestyFetch("/v1/channel-commission/listings");
    print(data);
  });

channelCommission
  .command("listings-update")
  .description("Update listings channel commission (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/channel-commission/listings", { method: "PUT", body });
    print(data);
  });
