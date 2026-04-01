import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";

export const rateStrategies = new Command("rate-strategies")
  .alias("rs")
  .description("Manage rate strategies");

rateStrategies
  .command("list")
  .description("List all rate strategies")
  .action(async () => {
    const data = await guestyFetch("/v1/rm-rate-strategies-open-api/rate-strategies");
    print(data);
  });

rateStrategies
  .command("get <unitTypeId>")
  .description("Get rate strategy for a property")
  .action(async (unitTypeId: string) => {
    const data = await guestyFetch(`/v1/rm-rate-strategies-open-api/rate-strategies/unitType/${unitTypeId}`);
    print(data);
  });
