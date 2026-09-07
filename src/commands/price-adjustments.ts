import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { integer } from "./query-options.js";

export const priceAdjustments = new Command("price-adjustments")
  .alias("pa")
  .description("Manual price adjustments for reservations");

priceAdjustments
  .command("create")
  .description("Create a manual total amount adjustment (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/price-adjustments/manual-total-amount", {
      method: "POST",
      body,
    });
    print(data);
  });

priceAdjustments
  .command("adjustable-line-items <reservationId>")
  .description("Get adjustable base and tax line items for a reservation")
  .option("--stay-index <n>", "Stay index for a mid-stay reservation (zero-based)")
  .action(async (reservationId: string, opts) => {
    const params = opts.stayIndex !== undefined ? { stayIndex: integer(opts.stayIndex, "--stay-index") } : undefined;
    const data = await guestyFetch(`/v1/price-adjustments/adjustable-line-items/${reservationId}`, { params });
    print(data);
  });

priceAdjustments
  .command("list <reservationId>")
  .description("List total amount adjustments for a reservation")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/price-adjustments/total-amount/${reservationId}`);
    print(data);
  });
