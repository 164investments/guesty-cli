import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const calendar = new Command("calendar")
  .alias("cal")
  .description("Calendar and availability");

calendar
  .command("get <listingId>")
  .description("Get calendar for a listing")
  .requiredOption("--from <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--to <date>", "End date (YYYY-MM-DD)")
  .action(async (listingId: string, opts) => {
    const data = await guestyFetch(
      `/v1/availability-pricing/api/calendar/listings/${listingId}`,
      { params: { from: opts.from, to: opts.to } }
    );
    print(data);
  });

calendar
  .command("update <listingId>")
  .description("Update calendar (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (listingId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(
      `/v1/availability-pricing/api/calendar/listings/${listingId}`,
      { method: "PUT", body }
    );
    print(data);
  });

calendar
  .command("block <listingId>")
  .description("Block dates on a listing")
  .requiredOption("--from <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--to <date>", "End date (YYYY-MM-DD)")
  .option("--note <text>", "Block note")
  .action(async (listingId: string, opts) => {
    const data = await guestyFetch(
      `/v1/availability-pricing/api/calendar/listings/${listingId}`,
      {
        method: "PUT",
        body: {
          dateFrom: opts.from,
          dateTo: opts.to,
          status: "unavailable",
          note: opts.note,
        },
      }
    );
    print(data);
  });

calendar
  .command("check <listingId>")
  .description("Check availability for dates")
  .requiredOption("--checkin <date>", "Check-in date (YYYY-MM-DD)")
  .requiredOption("--checkout <date>", "Check-out date (YYYY-MM-DD)")
  .action(async (listingId: string, opts) => {
    const data = await guestyFetch("/v1/reservations/check-availability", {
      params: {
        listingId,
        checkIn: opts.checkin,
        checkOut: opts.checkout,
      },
    });
    print(data);
  });
