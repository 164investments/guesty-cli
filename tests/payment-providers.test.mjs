import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { listingIdsFromBody, unassignListingProviders, verifyListingProviders } from "../dist/payment-provider-operations.js";

const source = "111111111111111111111111";
const target = "222222222222222222222222";
const other = "333333333333333333333333";
const ids = ["aaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbb"];

function scenario(assigned = [source, source], options = {}) {
  const calls = [];
  const providers = new Map(ids.map((id, i) => [id, assigned[i]]));
  const request = async (path, init = {}) => {
    calls.push({ path, ...init });
    if (path === "/v1/payment-providers/default") return { _id: target, accountId: "account", status: "ACTIVE", providerAccountId: "acct_target" };
    if (path === `/v1/payment-providers/${source}`) return { _id: source, accountId: "account", status: "ACTIVE" };
    if (path.endsWith("provider-by-listing")) {
      const providerId = providers.get(init.params.listingId);
      return { paymentProviderId: providerId, status: "ACTIVE", providerAccountId: providerId === target ? "acct_target" : "acct_source" };
    }
    if (path === `/v1/payment-providers/${source}/unassign-listings`) {
      assert.equal(init.method, "POST");
      if (options.failWrite) throw new Error("upstream error");
      if (!options.staleReadback) for (const id of init.body.listingIds) providers.set(id, target);
      return {};
    }
    throw new Error(`Unexpected request: ${path}`);
  };
  return { calls, request, writes: () => calls.filter((call) => call.method === "POST") };
}

test("invalid, empty, oversized and duplicate batches are rejected before requests", async () => {
  for (const body of [null, {}, { listingIds: [] }, { listingIds: ["bad"] }, { listingIds: [ids[0], ids[0]] }, { listingIds: Array(101).fill(ids[0]) }]) {
    assert.throws(() => listingIdsFromBody(body), /1-100 unique/);
  }
  const s = scenario();
  await assert.rejects(unassignListingProviders("../default", ids, target, false, s.request), /Invalid/);
  assert.equal(s.calls.length, 0);
});

test("a changed default or a listing owned by another provider prevents any mutation", async () => {
  for (const [assigned, expected] of [[[source, source], other], [[source, other], target]]) {
    const s = scenario(assigned);
    await assert.rejects(unassignListingProviders(source, ids, expected, false, s.request), /Nothing changed/);
    assert.equal(s.writes().length, 0);
  }
});

test("dry run shows only the necessary moves, including already-default listings", async () => {
  const s = scenario([source, target]);
  const result = await unassignListingProviders(source, ids, target, true, s.request);
  assert.deepEqual(result.listingIds, [ids[0]]);
  assert.equal(result.alreadyDefault, 1);
  assert.equal(s.writes().length, 0);
});

test("unassign sends the observed endpoint and verifies default fallback without altering other listings", async () => {
  const s = scenario([source, target]);
  const result = await unassignListingProviders(source, ids, target, false, s.request);
  assert.equal(result.verified, true);
  assert.equal(result.unassigned, 1);
  assert.deepEqual(s.writes(), [{ path: `/v1/payment-providers/${source}/unassign-listings`, method: "POST", body: { listingIds: [ids[0]] } }]);
  const repeated = await unassignListingProviders(source, ids, target, false, s.request);
  assert.equal(repeated.unassigned, 0);
  assert.equal(repeated.alreadyDefault, 2);
  assert.equal(s.writes().length, 1);
});

test("failed writes and mismatched readback never report success or repeat the mutation", async () => {
  for (const options of [{ failWrite: true }, { staleReadback: true }]) {
    const s = scenario(undefined, options);
    await assert.rejects(unassignListingProviders(source, ids, target, false, s.request));
    assert.equal(s.writes().length, 1);
  }
});

test("verification detects a wrong connected Stripe account even when the provider ID matches", async () => {
  const s = scenario([target, target]);
  assert.equal((await verifyListingProviders(ids, target, "acct_wrong", s.request)).verified, false);
  assert.equal((await verifyListingProviders(ids, target, "acct_target", s.request)).verified, true);
  assert.equal(s.writes().length, 0);
});

test("the CLI contract exposes reassignment and verification endpoints and options", () => {
  const spec = JSON.parse(readFileSync(new URL("../guesty-cli-spec.json", import.meta.url), "utf8"));
  const operations = spec.commands.find((command) => command.name === "payment-providers").operations;
  const unassign = operations.find((operation) => operation.name === "unassign-listings");
  assert.ok(unassign.requests.some((request) => request.method === "POST" && request.path.endsWith("/unassign-listings")));
  assert.ok(unassign.requests.some((request) => request.path === "/v1/payment-providers/default"));
  assert.ok(unassign.options.some((option) => option.flags === "--dry-run"));
  const verify = operations.find((operation) => operation.name === "verify-listings");
  assert.ok(verify.requests.some((request) => request.path.endsWith("/provider-by-listing")));
  assert.equal(operations.find((operation) => operation.name === "by-listing").options[0].required, true);
});
