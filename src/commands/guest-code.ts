import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";

export const guestCode = new Command("guest-code")
  .description("Guest access codes");

guestCode
  .command("get")
  .description("Get guest codes")
  .requiredOption("--reservation <id>", "Reservation ID")
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.reservation) params.reservationId = opts.reservation;
    const data = await guestyFetch("/v1/guest-code", { params });
    print(data);
  });
