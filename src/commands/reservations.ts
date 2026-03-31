import { Command } from "commander";
import { guestyFetch, paginateAll } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const reservations = new Command("reservations")
  .alias("res")
  .description("Manage reservations");

reservations
  .command("list")
  .description("List reservations with optional filters")
  .option("--from <date>", "Check-in from date (YYYY-MM-DD)")
  .option("--to <date>", "Check-in to date (YYYY-MM-DD)")
  .option("--status <status>", "Filter by status (confirmed, canceled, inquiry, etc.)")
  .option("--listing <id>", "Filter by listing ID")
  .option("--guest <name>", "Filter by guest name")
  .option("--source <source>", "Filter by source (Airbnb, Booking.com, etc.)")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .option("--sort <field>", "Sort field", "checkIn")
  .option("--fields <fields>", "Comma-separated fields to return")
  .option("--all", "Fetch all pages (up to 10k)")
  .action(async (opts) => {
    const params: Record<string, string | number> = {
      limit: parseInt(opts.limit),
      skip: parseInt(opts.skip),
      sort: opts.sort,
    };
    if (opts.fields) params.fields = opts.fields;
    if (opts.status) params.status = opts.status;
    if (opts.listing) params.listingId = opts.listing;
    if (opts.source) params.source = opts.source;

    const filters: string[] = [];
    if (opts.from) filters.push(`checkIn>=${opts.from}`);
    if (opts.to) filters.push(`checkIn<=${opts.to}`);
    if (opts.guest) filters.push(`guestName=${opts.guest}`);
    if (filters.length > 0) params.filters = filters.join(",");

    if (opts.all) {
      const results = await paginateAll("/v1/reservations", params, "results");
      print(results);
    } else {
      const data = await guestyFetch("/v1/reservations", { params });
      print(data);
    }
  });

reservations
  .command("get <id>")
  .description("Get a single reservation by ID")
  .option("--fields <fields>", "Comma-separated fields to return")
  .action(async (id: string, opts) => {
    const params: Record<string, string> = {};
    if (opts.fields) params.fields = opts.fields;
    const data = await guestyFetch(`/v1/reservations/${id}`, { params });
    print(data);
  });

reservations
  .command("search <query>")
  .description("Search reservations by guest name or confirmation code")
  .option("--limit <n>", "Max results", "25")
  .action(async (query: string, opts) => {
    const data = await guestyFetch("/v1/reservations", {
      params: {
        q: query,
        limit: parseInt(opts.limit),
      },
    });
    print(data);
  });

reservations
  .command("update <id>")
  .description("Update a reservation (pass JSON body via stdin or --data)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations/${id}`, {
      method: "PUT",
      body,
    });
    print(data);
  });

reservations
  .command("create")
  .description("Create a reservation (pass JSON body via stdin or --data)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/reservations", {
      method: "POST",
      body,
    });
    print(data);
  });

reservations
  .command("balance <id>")
  .description("Get the folio/balance for a reservation")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/accounting-api/reservations/${id}/balance`);
    print(data);
  });

reservations
  .command("add-payment <id>")
  .description("Add a payment to a reservation (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations/${id}/payments`, {
      method: "POST",
      body,
    });
    print(data);
  });
