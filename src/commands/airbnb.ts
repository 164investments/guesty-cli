import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const airbnb = new Command("airbnb")
  .description("Airbnb listing expectations and resolutions");

airbnb
  .command("upsert-expectations <id>")
  .description("Upsert Airbnb listing expectations (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/airbnb-resource-service/listing-expectations/${id}`, {
      method: "PUT",
      body,
    });
    print(data);
  });

airbnb
  .command("get-expectations <id>")
  .description("Get Airbnb listing expectations")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/airbnb-resource-service/listing-expectations/${id}`);
    print(data);
  });

airbnb
  .command("resolutions <guestyReservationId>")
  .description("List Airbnb resolutions for a reservation")
  .action(async (guestyReservationId: string) => {
    const data = await guestyFetch(
      `/v1/airbnb-resolutions-center/reservations/${guestyReservationId}/resolutions`,
    );
    print(data);
  });
