import { guestyFetch } from "./client.js";

interface Provider {
  _id?: string;
  paymentProviderId?: string;
  providerAccountId?: string;
  accountId?: string;
  status?: string;
}

export function listingIdsFromBody(body: unknown): string[] {
  const ids = (body as { listingIds?: unknown } | null)?.listingIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 ||
      ids.some((id) => typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) ||
      new Set(ids).size !== ids.length) {
    throw new Error("listingIds must contain 1-100 unique Guesty listing IDs.");
  }
  return ids;
}

export function validateProviderId(id: string): void {
  if (!/^[a-f0-9]{24}$/i.test(id)) throw new Error("Invalid Guesty payment provider ID.");
}

export async function verifyListingProviders(
  listingIds: string[], providerId: string, stripeAccount?: string, request = guestyFetch
) {
  validateProviderId(providerId);
  listingIdsFromBody({ listingIds });
  const listings = [];
  for (const listingId of listingIds) {
    const provider = await request<Provider>("/v1/payment-providers/provider-by-listing", {
      params: { listingId },
    });
    const actualId = provider.paymentProviderId ?? provider._id;
    listings.push({
      listingId, providerId: actualId, stripeAccount: provider.providerAccountId,
      status: provider.status,
      verified: actualId === providerId && provider.status === "ACTIVE" &&
        (!stripeAccount || provider.providerAccountId === stripeAccount),
    });
  }
  return { verified: listings.every((listing) => listing.verified), expectedProviderId: providerId,
    expectedStripeAccount: stripeAccount, listings };
}

export async function unassignListingProviders(
  providerId: string, listingIds: string[], expectedDefault?: string, dryRun = false, request = guestyFetch
) {
  validateProviderId(providerId);
  listingIdsFromBody({ listingIds });
  if (expectedDefault) validateProviderId(expectedDefault);
  const [source, target] = await Promise.all([
    request<Provider>(`/v1/payment-providers/${providerId}`),
    request<Provider>("/v1/payment-providers/default"),
  ]);
  const targetId = target.paymentProviderId ?? target._id;
  if (!targetId || target.status !== "ACTIVE" || (expectedDefault && targetId !== expectedDefault)) {
    throw new Error("The active default payment provider does not match the requested destination. Nothing changed.");
  }
  if (providerId === targetId || source.accountId !== target.accountId) {
    throw new Error("Source and default must be different providers in the same Guesty account. Nothing changed.");
  }
  const before = await verifyListingProviders(listingIds, providerId, undefined, request);
  const conflict = before.listings.find((listing) => listing.providerId !== providerId && listing.providerId !== targetId);
  if (conflict) throw new Error(`Listing ${conflict.listingId} belongs to another provider. Nothing changed.`);
  const toRemove = before.listings.filter((listing) => listing.providerId === providerId).map((listing) => listing.listingId);
  if (dryRun) return { dryRun: true, sourceProviderId: providerId, defaultProviderId: targetId,
    defaultStripeAccount: target.providerAccountId, listingIds: toRemove, alreadyDefault: listingIds.length - toRemove.length };
  if (toRemove.length) {
    await request(`/v1/payment-providers/${providerId}/unassign-listings`, {
      method: "POST", body: { listingIds: toRemove },
    });
  }
  const result = await verifyListingProviders(listingIds, targetId, target.providerAccountId, request);
  if (!result.verified) {
    throw new Error("Unassign request completed, but default-provider verification failed. Inspect the assignments before retrying.");
  }
  return { unassigned: toRemove.length, alreadyDefault: listingIds.length - toRemove.length, ...result };
}
