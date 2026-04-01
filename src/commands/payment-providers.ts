import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const paymentProviders = new Command("payment-providers")
  .alias("pp")
  .description("Manage payment providers");

paymentProviders
  .command("summary")
  .description("Get payment providers summary")
  .action(async () => {
    const data = await guestyFetch("/v1/payment-providers/summary");
    print(data);
  });

paymentProviders
  .command("default")
  .description("Get default payment provider")
  .action(async () => {
    const data = await guestyFetch("/v1/payment-providers/default");
    print(data);
  });

paymentProviders
  .command("stats")
  .description("Get payment provider stats")
  .action(async () => {
    const data = await guestyFetch("/v1/payment-providers/stats");
    print(data);
  });

paymentProviders
  .command("get <providerId>")
  .description("Get a payment provider by ID")
  .action(async (providerId: string) => {
    const data = await guestyFetch(`/v1/payment-providers/${providerId}`);
    print(data);
  });

paymentProviders
  .command("by-listing")
  .description("Get payment provider by listing")
  .option("--listing <id>", "Listing ID")
  .action(async (opts) => {
    const params: Record<string, string> = {};
    if (opts.listing) params.listingId = opts.listing;
    const data = await guestyFetch("/v1/payment-providers/provider-by-listing", { params });
    print(data);
  });

paymentProviders
  .command("assign-listings <id>")
  .description("Assign listings to a payment provider (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/payment-providers/${id}/assign-listings`, { method: "POST", body });
    print(data);
  });
