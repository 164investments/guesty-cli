import assert from "node:assert/strict";
import test from "node:test";
import { rejectsWithoutRequest, request, run } from "./fixtures/reservation-runner.mjs";

const base = "/v1/availability-pricing/api/calendar/listings";
const range = ["--from", "2026-09-07", "--to", "2026-09-09"];
const query = { startDate: "2026-09-07", endDate: "2026-09-09" };

for (const [args, path] of [[ ["get", "listing-1"], `${base}/listing-1` ],
  [["minified", "listing-1"], `${base}/minified/listing-1`]]) {
  test(`calendar ${args[0]} includes required range and allotment flags`, (t) => {
    const result = run(t, ["cal", ...args, ...range, "--include-allotment", "--ignore-inactive-child-allotment", "--ignore-unlisted-child-allotment"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.requests, [request("GET", path, { query: {
      ...query, includeAllotment: "true", ignoreInactiveChildAllotment: "true", ignoreUnlistedChildAllotment: "true",
    } })]);
  });
}

for (const view of ["compact", "full"]) {
  test(`calendar minified supports ${view} view`, (t) => {
    const result = run(t, ["cal", "minified", "listing-1", ...range, "--view", view]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.requests, [request("GET", `${base}/minified/listing-1`, { query: { ...query, view } })]);
  });
}

test("calendar list sends CSV listingIds instead of repeated listingId", (t) => {
  const result = run(t, ["cal", "list", "--listing", "listing-1", "--listing", "listing-2", ...range, "--include-allotment"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.requests, [request("GET", base, { query: { ...query, listingIds: "listing-1,listing-2", includeAllotment: "true" } })]);
});

test("calendar block defaults to Other and uses inclusive startDate/endDate", (t) => {
  const result = run(t, ["cal", "block", "listing-1", "--from", "2026-09-07", "--to", "2026-09-07"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.requests, [request("PUT", `${base}/listing-1`, { body: {
    startDate: "2026-09-07", endDate: "2026-09-07", status: "unavailable", blockReason: "Other",
  } })]);
});

for (const reason of ["Owner block", "Offboarded", "Migrated unit block", "Maintenance", "Onboarding",
  "Emergency out of order", "Do not sell", "Deactivated", "Other"]) {
  test(`calendar block accepts documented reason ${reason}`, (t) => {
    const result = run(t, ["cal", "block", "listing-1", ...range, "--reason", reason, "--note", "Synthetic fixture note"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.requests, [request("PUT", `${base}/listing-1`, { body: {
      ...query, status: "unavailable", blockReason: reason, note: "Synthetic fixture note",
    } })]);
  });
}

for (const input of ["data", "stdin"]) {
  test(`calendar update preserves supported fields using ${input}`, (t) => {
    const body = { ...query, price: 123.45, minNights: 2, cta: true, ctd: false, status: "unavailable", blockReason: "Maintenance", note: "Fixture" };
    const result = run(t, ["cal", "update", "listing-1", ...(input === "data" ? ["--data", JSON.stringify(body)] : [])],
      { stdin: input === "stdin" ? JSON.stringify(body) : "" });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.requests, [request("PUT", `${base}/listing-1`, { body })]);
  });
}

test("calendar update-many sends the documented array body", (t) => {
  const body = [
    { listingId: "listing-1", ...query, price: 120 },
    { listingId: "listing-2", startDate: "2028-02-29", endDate: "2028-02-29", minNights: 3 },
  ];
  const result = run(t, ["cal", "update-many"], { stdin: JSON.stringify(body) });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.requests, [request("PUT", base, { body })]);
});

for (const [args, error] of [
  [["get", "listing-1"], /required option/],
  [["minified", "listing-1"], /required option/],
  [["list", ...range], /listing/],
  [["list", "--listing", "listing-1"], /required option/],
  [["minified", "listing-1", ...range, "--view", "verbose"], /Allowed choices/],
  [["block", "listing-1", ...range, "--reason", "maintenance"], /Allowed choices/],
]) {
  test(`calendar rejects incomplete or invalid options: ${args.slice(0, 3).join(" ")}`, (t) => {
    rejectsWithoutRequest(run(t, ["cal", ...args]), error);
  });
}

for (const args of [["get", "listing-1"], ["minified", "listing-1"], ["list", "--listing", "listing-1"], ["block", "listing-1"]]) {
  for (const [from, to, error] of [
    ["2026-02-30", "2026-03-01", /valid date/],
    ["2026-9-07", "2026-09-09", /YYYY-MM-DD/],
    ["2026-09-07T00:00:00Z", "2026-09-09", /YYYY-MM-DD/],
    ["2026-09-10", "2026-09-09", /on or before/],
  ]) {
    test(`calendar ${args[0]} rejects invalid date range ${from} / ${to}`, (t) => {
      rejectsWithoutRequest(run(t, ["cal", ...args, "--from", from, "--to", to]), error);
    });
  }
}

for (const [args, body, error] of [
  [["update", "listing-1"], { dateFrom: "2026-09-07", dateTo: "2026-09-09" }, /startDate and endDate/],
  [["update", "listing-1"], { startDate: "2026-02-30", endDate: "2026-03-01" }, /valid date/],
  [["update", "listing-1"], { startDate: "2026-09-10", endDate: "2026-09-09" }, /on or before/],
  [["update", "listing-1"], [], /JSON object/],
  [["update-many"], { ...query, listingId: "listing-1" }, /JSON array/],
  [["update-many"], [], /non-empty/],
  [["update-many"], [{ ...query }], /listingId/],
  [["update-many"], [{ ...query, listingId: "listing-1" }, { listingId: "listing-2", startDate: "bad", endDate: "bad" }], /valid date/],
]) {
  test(`calendar ${args[0]} rejects invalid payload: ${error.source}`, (t) => {
    rejectsWithoutRequest(run(t, ["cal", ...args, "--data", JSON.stringify(body)]), error);
  });
}
