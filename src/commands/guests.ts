import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print, warnDeprecated } from "../output.js";
import { readStdin } from "../stdin.js";
import { fields, integer, jsonObject } from "./query-options.js";

export const guests = new Command("guests")
  .description("Manage guests");

guests
  .command("list")
  .description("List/search guests")
  .option("--q <query>", "Unsupported by Guesty; use --filters instead")
  .option("--filters <json>", "JSON object of guest report filters")
  .option("--columns <cols>", "Columns to return (space- or comma-separated)", "id fullName guestEmail guestPhone")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    if (opts.q !== undefined) throw new Error("Guesty's guests API does not support --q. Use --filters with guest report fields instead.");
    const params: Record<string, string | number> = {
      columns: fields(opts.columns),
      limit: integer(opts.limit, "--limit", 1),
      skip: integer(opts.skip, "--skip"),
    };
    if (opts.filters) params.filters = JSON.stringify(jsonObject(opts.filters, "--filters"));
    const data = await guestyFetch("/v1/guests-crud", { params });
    print(data);
  });

guests
  .command("get <id>")
  .description("Get a single guest by ID")
  .option("--fields <fields>", "Fields to return (space- or comma-separated)", "id firstName lastName fullName address")
  .action(async (id: string, opts) => {
    const data = await guestyFetch(`/v1/guests-crud/${id}`, { params: { fields: fields(opts.fields) } });
    print(data);
  });

guests
  .command("create")
  .description("Create a guest (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/guests-crud", {
      method: "POST",
      body,
    });
    print(data);
  });

guests
  .command("update <id>")
  .description("Update a guest (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/guests-crud/${id}`, {
      method: "PUT",
      body,
    });
    print(data);
  });

guests
  .command("add-payment-method <id>")
  .description("[deprecated] Add a payment method to a guest (--data or stdin) — use 'payments create-method' instead")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    warnDeprecated("guests add-payment-method", "payments create-method");
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/guests/${id}/payment-methods`, { method: "POST", body });
    print(data);
  });

guests
  .command("payment-methods <id>")
  .description("[deprecated] List payment methods for a guest — use 'payments methods' instead")
  .option("--reservation <id>", "Reservation context for its payment methods, including virtual credit cards")
  .action(async (id: string, opts) => {
    warnDeprecated("guests payment-methods", "payments methods --guest <id>", "payments methods --reservation <id>");
    const params: Record<string, string> = {};
    if (opts.reservation) params.reservationId = opts.reservation;
    const data = await guestyFetch(`/v1/guests/${id}/payment-methods`, { params });
    print(data);
  });
