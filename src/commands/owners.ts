import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const owners = new Command("owners")
  .description("Manage owners and ownerships");

owners
  .command("bulk-create")
  .description("Create multiple owners with assigned listings (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/owners/bulk", { method: "POST", body });
    print(data);
  });

owners
  .command("list")
  .description("List all owners")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/owners", {
      params: { limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });

owners
  .command("get <ownerId>")
  .description("Get a single owner")
  .action(async (ownerId: string) => {
    const data = await guestyFetch(`/v1/owners/${ownerId}`);
    print(data);
  });

owners
  .command("create")
  .description("Create an owner (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/owners", { method: "POST", body });
    print(data);
  });

owners
  .command("update <ownerId>")
  .description("Update an owner (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (ownerId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/owners/${ownerId}`, { method: "PUT", body });
    print(data);
  });

owners
  .command("delete <ownerId>")
  .description("Delete an owner")
  .action(async (ownerId: string) => {
    const data = await guestyFetch(`/v1/owners/${ownerId}`, { method: "DELETE" });
    print(data);
  });

owners
  .command("ownerships <listingId>")
  .description("Get ownerships for a listing")
  .action(async (listingId: string) => {
    const data = await guestyFetch(`/v1/owners/listings/${listingId}/ownerships`);
    print(data);
  });

owners
  .command("set-ownerships <listingId>")
  .description("Set ownerships for a listing (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (listingId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/owners/listings/${listingId}/ownerships`, { method: "PUT", body });
    print(data);
  });

owners
  .command("owner-ownerships <ownerId>")
  .description("Get listing ownerships for an owner")
  .action(async (ownerId: string) => {
    const data = await guestyFetch(`/v1/owners/${ownerId}/ownerships`);
    print(data);
  });

owners
  .command("reservations")
  .description("List owner reservations")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/owners-reservations", {
      params: { limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });

owners
  .command("reservation <id>")
  .description("Get an owner reservation by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/owners-reservations/${id}`);
    print(data);
  });

owners
  .command("update-reservation <id>")
  .description("Update an owner reservation (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/owners-reservations/${id}`, {
      method: "PUT",
      body,
    });
    print(data);
  });
