import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";

export const guestApp = new Command("guest-app")
  .description("Guest app runtime data");

guestApp
  .command("summary <reservationId> <moduleType>")
  .description("Get guest app module summary for a reservation")
  .action(async (reservationId: string, moduleType: string) => {
    const data = await guestyFetch(
      `/v1/guest-app-api/guest-app-runtime/${reservationId}/module/${moduleType}/summary`,
    );
    print(data);
  });
