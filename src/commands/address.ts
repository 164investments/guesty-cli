import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const address = new Command("address")
  .description("Address geocoding and updates");

address
  .command("geocode")
  .description("Geocode an address (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/address/geocode", { method: "POST", body });
    print(data);
  });

address
  .command("update <id>")
  .description("Update an address (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/address/${id}/update`, { method: "PUT", body });
    print(data);
  });

address
  .command("update-complex <id>")
  .description("Update a complex address (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/address/${id}/update/complex`, { method: "PUT", body });
    print(data);
  });
