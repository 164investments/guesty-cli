import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const ratePlans = new Command("rate-plans")
  .alias("rp")
  .description("Manage rate plans");

ratePlans
  .command("create")
  .description("Create a rate plan (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/rm-rate-plans-ext/rate-plans", { method: "POST", body });
    print(data);
  });

ratePlans
  .command("update <ratePlanId>")
  .description("Update a rate plan (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (ratePlanId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/rm-rate-plans-ext/rate-plans/${ratePlanId}`, { method: "PUT", body });
    print(data);
  });

ratePlans
  .command("patch <ratePlanId>")
  .description("Patch a rate plan (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (ratePlanId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/rm-rate-plans-ext/rate-plans/${ratePlanId}`, { method: "PATCH", body });
    print(data);
  });

ratePlans
  .command("delete <ratePlanId>")
  .description("Remove a rate plan")
  .action(async (ratePlanId: string) => {
    const data = await guestyFetch(`/v1/rm-rate-plans-ext/rate-plans/${ratePlanId}`, { method: "DELETE" });
    print(data);
  });

ratePlans
  .command("by-listing <listingId>")
  .description("Get rate plans for a property")
  .action(async (listingId: string) => {
    const data = await guestyFetch(`/v1/rm-rate-plans-ext/rate-plans/listing/${listingId}`);
    print(data);
  });

ratePlans
  .command("get-calendar <listingId> <ratePlanId>")
  .description("Get rate plan calendar for a property")
  .action(async (listingId: string, ratePlanId: string) => {
    const data = await guestyFetch(`/v1/rm-rate-plans-ext/ari-calendar/listing/${listingId}/ratePlan/${ratePlanId}`);
    print(data);
  });

ratePlans
  .command("upsert-calendar <listingId> <ratePlanId>")
  .description("Upsert rate plan calendar (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (listingId: string, ratePlanId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/rm-rate-plans-ext/ari-calendar/listing/${listingId}/ratePlan/${ratePlanId}`, {
      method: "PUT",
      body,
    });
    print(data);
  });

ratePlans
  .command("assign-listings <ratePlanId>")
  .description("Assign properties to a rate plan (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (ratePlanId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/rm-rate-plans-ext/rate-plans/${ratePlanId}/init-assign-listings`, {
      method: "PUT",
      body,
    });
    print(data);
  });

ratePlans
  .command("unassign-listings <ratePlanId>")
  .description("Unassign properties from a rate plan (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (ratePlanId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/rm-rate-plans-ext/rate-plans/${ratePlanId}/init-unassign-listings`, {
      method: "PUT",
      body,
    });
    print(data);
  });
