import { writeFileSync } from "node:fs";
import { Command } from "commander";
import { guestyFetch, paginateAll } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { fields, integer } from "./query-options.js";

export const listings = new Command("listings")
  .alias("ls")
  .description("Manage listings");

listings
  .command("list")
  .description("List all listings")
  .option("--fields <fields>", "Fields to return (space- or comma-separated)")
  .option("--q <query>", "Search listing title, internal note, or full address")
  .option("--city <city>", "Filter by city")
  .option("--tags <tag>", "Filter by listing tag")
  .option("--ids <ids>", "Comma-separated listing IDs")
  .option("--view <id>", "Use a saved listing view")
  .option("--sort <field>", "Sort field, prefix with - for descending")
  .option("--limit <n>", "Max results", "100")
  .option("--skip <n>", "Offset", "0")
  .option("--all", "Fetch all pages")
  .option("--active", "Only active listings")
  .option("--inactive", "Only inactive listings")
  .action(async (opts) => {
    if (opts.active && opts.inactive) throw new Error("Use only one of --active and --inactive.");
    const params: Record<string, string | number | boolean> = {
      limit: integer(opts.limit, "--limit", 1, 100),
      skip: integer(opts.skip, "--skip"),
    };
    if (opts.fields) params.fields = fields(opts.fields);
    if (opts.active) params.active = true;
    if (opts.inactive) params.active = false;
    if (opts.q) params.q = opts.q;
    if (opts.city) params.city = opts.city;
    if (opts.tags) params.tags = opts.tags;
    if (opts.ids) params.ids = opts.ids;
    if (opts.view) params.viewId = opts.view;
    if (opts.sort) params.sort = opts.sort;

    if (opts.all) {
      const results = await paginateAll("/v1/listings", params, "results");
      print(results);
    } else {
      const data = await guestyFetch("/v1/listings", { params });
      print(data);
    }
  });

listings
  .command("create")
  .description("Create a listing (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/listings", {
      method: "POST",
      body,
    });
    print(data);
  });

listings
  .command("get <id>")
  .description("Get a single listing by ID")
  .option("--fields <fields>", "Fields to return (space- or comma-separated)")
  .action(async (id: string, opts) => {
    const params: Record<string, string> = {};
    if (opts.fields) params.fields = fields(opts.fields);
    const data = await guestyFetch(`/v1/listings/${id}`, { params });
    print(data);
  });

listings
  .command("update <id>")
  .description("Update a listing (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/listings/${id}`, {
      method: "PUT",
      body,
    });
    print(data);
  });

listings
  .command("delete <id>")
  .description("Delete a listing")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/listings/${id}`, {
      method: "DELETE",
    });
    print(data);
  });

listings
  .command("set-availability <id>")
  .description("Update listing availability settings (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/listings/${id}/availability-settings`, {
      method: "PUT",
      body,
    });
    print(data);
  });

listings
  .command("cities")
  .description("List all listing cities")
  .action(async () => {
    const data = await guestyFetch("/v1/listings/cities");
    print(data);
  });

listings
  .command("tags")
  .description("List all listing tags")
  .action(async () => {
    const data = await guestyFetch("/v1/listings/tags");
    print(data);
  });

listings
  .command("payment-provider <id>")
  .description("Get a listing payment provider ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/listings/${id}`, { params: { fields: "paymentProviderId" } });
    print(data);
  });

listings
  .command("custom-fields <id>")
  .description("Get custom fields for a listing")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/listings/${id}/custom-fields`);
    print(data);
  });

listings
  .command("set-custom-fields <id>")
  .description("Update listing custom fields (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/listings/${id}/custom-fields`, {
      method: "PUT",
      body,
    });
    print(data);
  });

listings
  .command("custom-field <id> <fieldId>")
  .description("Get a single listing custom field")
  .action(async (id: string, fieldId: string) => {
    const data = await guestyFetch(`/v1/listings/${id}/custom-fields/${fieldId}`);
    print(data);
  });

listings
  .command("delete-custom-field <id> <fieldId>")
  .description("Delete a listing custom field")
  .action(async (id: string, fieldId: string) => {
    const data = await guestyFetch(`/v1/listings/${id}/custom-fields/${fieldId}`, {
      method: "DELETE",
    });
    print(data);
  });

listings
  .command("financials <id>")
  .description("Get financial settings for a listing")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/financials/listing/${id}`);
    print(data);
  });

listings
  .command("set-financials <id>")
  .description("Update financial settings for a listing (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/financials/listing/${id}`, {
      method: "PUT",
      body,
    });
    print(data);
  });

listings
  .command("get-payment-provider <id>")
  .description("Get the payment provider ID for a listing")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/listings/${id}`, { params: { fields: "paymentProviderId" } });
    print(data);
  });

listings
  .command("export-csv")
  .description("Export listings as CSV (--data or stdin)")
  .option("--data <json>", "JSON body")
  .option("--output <path>", "Write CSV output to a file")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch<string>("/v1/listings.csv", {
      method: "POST",
      body,
      responseType: "text",
    });
    if (opts.output) {
      writeFileSync(opts.output, data);
      process.stderr.write(`Saved CSV to ${opts.output}\n`);
      return;
    }
    print(data);
  });

listings
  .command("export-email")
  .description("Export listings via email (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/listings.email", { method: "POST", body });
    print(data);
  });

listings
  .command("get-brand <propertyId>")
  .description("Get brand by property ID")
  .action(async (propertyId: string) => {
    const data = await guestyFetch(`/v1/account-brands/properties/${propertyId}`);
    print(data);
  });
