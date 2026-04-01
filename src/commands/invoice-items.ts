import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const invoiceItems = new Command("invoice-items")
  .alias("ii")
  .description("Manage reservation invoice items");

invoiceItems
  .command("create <reservationId>")
  .description("Create an invoice item for a reservation (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (reservationId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/invoice-items/reservation/${reservationId}`, {
      method: "POST",
      body,
    });
    print(data);
  });
