import { Command } from "commander";
import { guestyFetch, paginateAll } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const listings = new Command("listings")
  .alias("ls")
  .description("Manage listings");

listings
  .command("list")
  .description("List all listings")
  .option("--fields <fields>", "Comma-separated fields to return")
  .option("--limit <n>", "Max results", "100")
  .option("--skip <n>", "Offset", "0")
  .option("--all", "Fetch all pages")
  .option("--active", "Only active listings")
  .action(async (opts) => {
    const params: Record<string, string | number | boolean> = {
      limit: parseInt(opts.limit),
      skip: parseInt(opts.skip),
    };
    if (opts.fields) params.fields = opts.fields;
    if (opts.active) params.active = true;

    if (opts.all) {
      const results = await paginateAll("/v1/listings", params, "results");
      print(results);
    } else {
      const data = await guestyFetch("/v1/listings", { params });
      print(data);
    }
  });

listings
  .command("get <id>")
  .description("Get a single listing by ID")
  .option("--fields <fields>", "Comma-separated fields to return")
  .action(async (id: string, opts) => {
    const params: Record<string, string> = {};
    if (opts.fields) params.fields = opts.fields;
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
  .command("custom-fields <id>")
  .description("Get custom fields for a listing")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/listings/${id}/custom-fields`);
    print(data);
  });

listings
  .command("financials <id>")
  .description("Get financial settings for a listing")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/financials/${id}`);
    print(data);
  });
