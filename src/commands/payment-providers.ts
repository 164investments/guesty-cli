import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { listingIdsFromBody, validateProviderId, verifyListingProviders, unassignListingProviders } from "../payment-provider-operations.js";

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
  .requiredOption("--listing <id>", "Listing ID")
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
    validateProviderId(id);
    const listingIds = listingIdsFromBody(opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin()));
    const data = await guestyFetch(`/v1/payment-providers/${id}/assign-listings`, { method: "POST", body: { listingIds } });
    print(data);
  });

paymentProviders
  .command("unassign-listings <id>")
  .description("Return listings to the default payment provider and verify the result (--data or stdin)")
  .option("--data <json>", "JSON body containing listingIds")
  .option("--expect-default <id>", "Require this default provider before changing assignments")
  .option("--dry-run", "Read and show the proposed move without changing assignments")
  .action(async (id: string, opts) => {
    const listingIds = listingIdsFromBody(opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin()));
    print(await unassignListingProviders(id, listingIds, opts.expectDefault, Boolean(opts.dryRun)));
  });

paymentProviders
  .command("verify-listings <providerId>")
  .description("Check effective listing providers, including default fallback; exit 1 on mismatch (--data or stdin)")
  .option("--data <json>", "JSON body containing listingIds")
  .option("--stripe-account <id>", "Also require this connected Stripe account")
  .action(async (providerId: string, opts) => {
    const listingIds = listingIdsFromBody(opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin()));
    const result = await verifyListingProviders(listingIds, providerId, opts.stripeAccount);
    print(result);
    if (!result.verified) process.exitCode = 1;
  });
