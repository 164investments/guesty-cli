import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const additionalFees = new Command("additional-fees")
  .alias("fees")
  .description("Manage additional fees");

// --- Account-level fees ---

additionalFees
  .command("list-account")
  .description("List account-level fees")
  .action(async () => {
    const data = await guestyFetch("/v1/additional-fees/account");
    print(data);
  });

additionalFees
  .command("create-account")
  .description("Create an account-level fee (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/additional-fees/account", { method: "POST", body });
    print(data);
  });

// --- Listing-level fees ---

additionalFees
  .command("list-listing <listingId>")
  .description("List fees for a listing")
  .action(async (listingId: string) => {
    const data = await guestyFetch(`/v1/additional-fees/listing/${listingId}`);
    print(data);
  });

additionalFees
  .command("create-listing <listingId>")
  .description("Create a listing-level fee (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (listingId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/additional-fees/listing/${listingId}`, { method: "POST", body });
    print(data);
  });

// --- Fee operations ---

additionalFees
  .command("update <id>")
  .description("Update a fee (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/additional-fees/${id}`, { method: "PATCH", body });
    print(data);
  });

additionalFees
  .command("delete <id>")
  .description("Delete a fee")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/additional-fees/${id}`, { method: "DELETE" });
    print(data);
  });

// --- Quote & inquiry ---

additionalFees
  .command("calculate <quoteId>")
  .description("Calculate fee amount for a quote (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (quoteId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/additional-fees/quotes/${quoteId}/amount`, { method: "POST", body });
    print(data);
  });

additionalFees
  .command("add-upsell <inquiryId>")
  .description("Add upsell fee to an inquiry (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (inquiryId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/additional-fees/inquiries/${inquiryId}/upsells`, { method: "POST", body });
    print(data);
  });
