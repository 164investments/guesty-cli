import assert from "node:assert/strict";
import test from "node:test";
import { rejectsWithoutRequest, request, run } from "./fixtures/reservation-runner.mjs";

test("legacy reservation list sends JSON filters and space-separated fields", (t) => {
  const result = run(t, ["res", "list", "--status", "confirmed", "--listing", "listing-1", "--source", "manual",
    "--from", "2026-09-01", "--to", "2026-09-30", "--guest", "Fixture Guest", "--fields", "_id, guest.fullName",
    "--limit", "10", "--skip", "7", "--sort", "-_id"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /legacy v1 API.*list-v3/);
  assert.deepEqual(result.requests, [request("GET", "/v1/reservations", { query: {
    limit: "10", skip: "7", sort: "-_id", fields: "_id guest.fullName",
    filters: JSON.stringify([
      { field: "status", operator: "$eq", value: "confirmed" },
      { field: "listingId", operator: "$eq", value: "listing-1" },
      { field: "source", operator: "$eq", value: "manual" },
      { field: "checkInDateLocalized", operator: "$gte", value: "2026-09-01" },
      { field: "checkInDateLocalized", operator: "$lte", value: "2026-09-30" },
      { field: "guest.fullName", operator: "$eq", value: "Fixture Guest" },
    ]),
  } })]);
});

for (const [args, field] of [[[], "confirmationCode"], [["--guest-name"], "guest.fullName"]]) {
  test(`reservation search uses exact ${field} filter instead of ignored q`, (t) => {
    const query = "Fixture, with & punctuation";
    const result = run(t, ["res", "search", query, ...args, "--limit", "3"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.requests, [request("GET", "/v1/reservations", { query: {
      filters: JSON.stringify([{ field, operator: "$eq", value: query }]), limit: "3",
    } })]);
  });
}

test("v3 reservation list translates every supported CLI filter", (t) => {
  const result = run(t, ["res", "list-v3", "--status", "confirmed,reserved", "--exclude-status", "canceled",
    "--listing", "listing-1,listing-2", "--confirmation-code", "GY-1,GY-2", "--source", "airbnb,manual",
    "--from", "2026-09-01", "--to", "2026-09-30", "--check-out-from", "2026-09-02", "--check-out-to", "2026-10-01",
    "--created-from", "2026-01-01T00:00:00Z", "--created-before", "2026-02-01T00:00:00-08:00",
    "--limit", "50", "--skip", "10", "--sort", "-checkIn"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.requests, [request("GET", "/v1/reservations-v3/search", { query: {
    limit: "50", skip: "10", sort: "-checkIn",
    "filter[checkIn][gte]": "2026-09-01", "filter[checkIn][lte]": "2026-09-30",
    "filter[checkOut][gte]": "2026-09-02", "filter[checkOut][lte]": "2026-10-01",
    "filter[createdAt][gte]": "2026-01-01T00:00:00Z", "filter[createdAt][lt]": "2026-02-01T00:00:00-08:00",
    "filter[status]": "confirmed,reserved", "filter[status][ne]": "canceled",
    "filter[listingId]": "listing-1,listing-2", "filter[confirmationCode]": "GY-1,GY-2", "filter[source]": "airbnb,manual",
  } })]);
});

test("v3 search alias paginates from --skip and follows hasMore after a short page", (t) => {
  const result = run(t, ["res", "search-v3", "--limit", "2", "--skip", "5", "--all"], { replies: [
    { body: { results: [{ reservationId: "a" }], pagination: { skip: 5, limit: 2, hasMore: true } } },
    { body: { results: [{ reservationId: "b" }], pagination: { skip: 6, limit: 2, hasMore: false } } },
  ] });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [{ reservationId: "a" }, { reservationId: "b" }]);
  assert.deepEqual(result.requests, [5, 6].map((skip) => request("GET", "/v1/reservations-v3/search", {
    query: { limit: "2", skip: String(skip), sort: "-_id" },
  })));
});

test("legacy all preserves initial offset, page size, and filters", (t) => {
  const result = run(t, ["res", "list", "--limit", "2", "--skip", "3", "--status", "confirmed", "--all"], { replies: [
    { body: { results: [{ _id: "a" }, { _id: "b" }], count: 6 } },
    { body: { results: [{ _id: "c" }], count: 6 } },
  ] });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [{ _id: "a" }, { _id: "b" }, { _id: "c" }]);
  assert.deepEqual(result.requests, [3, 5].map((skip) => request("GET", "/v1/reservations", { query: {
    limit: "2", skip: String(skip), sort: "checkIn",
    filters: JSON.stringify([{ field: "status", operator: "$eq", value: "confirmed" }]),
  } })));
});

for (const [args, error] of [
  [["list", "--limit", "25junk"], /--limit/],
  [["list", "--limit", "101"], /--limit/],
  [["search", "GY-fixture", "--limit", "0"], /--limit/],
  [["search", "  "], /non-empty/],
  [["list", "--skip", "-1"], /--skip/],
  [["list", "--from", "2026-02-30"], /valid date/],
  [["list-v3", "--limit", "2.5"], /--limit/],
  [["list-v3", "--skip", "9007199254740992"], /--skip/],
  [["list-v3", "--from", "2026-10-01", "--to", "2026-09-30"], /on or before/],
  [["list-v3", "--check-out-from", "2026-09-07T12:00:00Z"], /YYYY-MM-DD/],
  [["list-v3", "--created-before", "2026-01-01"], /date-time/],
  [["list-v3", "--created-from", "2026-02-30T00:00:00Z"], /valid date/],
  [["list-v3", "--sort", "guest.fullName"], /Allowed choices/],
]) {
  test(`reservation query rejects invalid input: ${args.join(" ")}`, (t) => {
    rejectsWithoutRequest(run(t, ["res", ...args]), error);
  });
}

test("v3 get supports ten IDs and optional financial response flags", (t) => {
  const ids = Array.from({ length: 10 }, (_, index) => `reservation-${index}`);
  const result = run(t, ["res", "get", ...ids, "--include-payments-template", "--merge-accommodation-fare-price-components", "--no-merge-inclusive-taxes"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.requests, [request("GET", "/v1/reservations-v3", { query: {
    ...Object.fromEntries(ids.map((id, index) => [`reservationIds[${index}]`, id])),
    includePaymentsTemplate: "true", mergeAccommodationFarePriceComponents: "true", mergeInclusiveTaxes: "false",
  } })]);
});

test("v3 get omits unspecified flags", (t) => {
  const result = run(t, ["res", "get", "res-1"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.requests, [request("GET", "/v1/reservations-v3", { query: {
    "reservationIds[0]": "res-1",
  } })]);
});

test("v3 get rejects the API's ignored fields parameter with migration guidance", (t) => {
  const result = run(t, ["res", "get", "res-1", "--fields", "_id"]);
  rejectsWithoutRequest(result, /v3 get API ignores --fields/);
  assert.match(result.stderr, /legacy-get.*--fields/);
});

test("v3 get rejects more than ten IDs before cache access", (t) => {
  rejectsWithoutRequest(run(t, ["res", "get", ...Array.from({ length: 11 }, (_, index) => `reservation-${index}`)]), /at most 10/);
});

const cancellation = {
  reason: "DECLINE_REASON_HOST_CHANGE", subReason: "DECLINE_REASON_HOST_EMERGENCY",
  messageToChannel: "Synthetic channel message", messageToGuest: "Synthetic guest message",
};

const changedWrites = [
  ["decline", "/decline", "POST", { reason: "dates_not_available", messageToGuest: "Synthetic message" }],
  ["request-cancellation", "/request-cancellation", "POST", cancellation],
  ["update-booking-date", "/booking-date", "PUT", { bookingDate: "2026-09-01T08:30:00-07:00" }],
  ["update-travel-information", "/travel-information", "PUT", { transportation: { arrival: { type: "flight", number: "FIXTURE123" } }, reasonForVisit: "leisure", agentBooking: false }],
  ["add-comment", "/comments", "POST", { body: "Synthetic internal comment", mentions: ["user-1"], parentCommentId: "parent-1" }],
  ["update-comment", "/comments/comment-1", "PATCH", { body: "Edited synthetic comment", mentions: [] }],
];
for (const [command, suffix, method, body] of changedWrites) {
  for (const input of ["data", "stdin"]) {
    test(`${command} sends exact ${method} request using ${input}`, (t) => {
      const args = ["res", command, "res-1", ...(command === "update-comment" ? ["comment-1"] : []),
        ...(input === "data" ? ["--data", JSON.stringify(body)] : [])];
      const result = run(t, args, { stdin: input === "stdin" ? JSON.stringify(body) : "" });
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(result.requests, [request(method, `/v1/reservations-v3/res-1${suffix}`, { body })]);
    });
  }
}

test("decline preserves optional-body use for channels that accept it", (t) => {
  const result = run(t, ["res", "decline", "res-1"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.requests, [request("POST", "/v1/reservations-v3/res-1/decline")]);
});

for (const field of Object.keys(cancellation)) {
  test(`request-cancellation rejects missing ${field}`, (t) => {
    const body = { ...cancellation };
    delete body[field];
    rejectsWithoutRequest(run(t, ["res", "request-cancellation", "res-1", "--data", JSON.stringify(body)]), new RegExp(field));
  });
}

for (const [command, body, error] of [
  ["decline", { reason: 5 }, /reason must be a string/],
  ["update-booking-date", {}, /bookingDate is required/],
  ["update-booking-date", { bookingDate: "2026-09-01" }, /date-time/],
  ["update-booking-date", { bookingDate: "2026-02-30T12:00:00Z" }, /valid date/],
  ["update-travel-information", { reasonForVisit: "vacation" }, /reasonForVisit/],
  ["update-travel-information", { agentBooking: "false" }, /boolean/],
  ["update-travel-information", { transportation: [] }, /JSON object/],
  ["add-comment", { body: "" }, /1 and 4095/],
  ["add-comment", { body: "x".repeat(4096) }, /1 and 4095/],
  ["add-comment", { body: "x", mentions: [1] }, /mentions/],
  ["add-comment", { body: "x", parentCommentId: 12 }, /parentCommentId/],
  ["update-comment", { body: 3 }, /1 and 4095/],
  ["update-comment", { body: "x", mentions: "user" }, /mentions/],
]) {
  test(`${command} rejects invalid body: ${error.source}`, (t) => {
    rejectsWithoutRequest(run(t, ["res", command, "res-1", ...(command === "update-comment" ? ["comment-1"] : []),
      "--data", JSON.stringify(body)]), error);
  });
}

for (const [command, suffix, body] of [
  ["update-source", "source", { source: "manual", pointOfSale: "Fixture", applyRecalculation: false }],
  ["update-dates", "dates", { checkInDateLocalized: "2026-09-07", checkOutDateLocalized: "2026-09-09", plannedArrival: "15:30", plannedDeparture: "10:00", applyRecalculation: false }],
  ["relocate", "relocate", { listingId: "listing-1" }],
  ["update-guests", "guests", { guestsCount: 2, numberOfGuests: { numberOfAdults: 2 } }],
]) {
  test(`${command} supports financial response query without altering body`, (t) => {
    const result = run(t, ["res", command, "res-1", "--data", JSON.stringify(body), "--no-merge-accommodation-fare-price-components"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.requests, [request("PUT", `/v1/reservations-v3/res-1/${suffix}`, {
      body, query: { mergeAccommodationFarePriceComponents: "false" },
    })]);
  });
}

for (const body of [{ plannedArrival: "16:00" }, { checkOutDateLocalized: "2026-09-15" }]) {
  test(`update-dates permits partial changes: ${JSON.stringify(body)}`, (t) => {
    const result = run(t, ["res", "update-dates", "res-1"], { stdin: JSON.stringify(body) });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.requests, [request("PUT", "/v1/reservations-v3/res-1/dates", { body })]);
  });
}

for (const [body, error] of [
  [{ checkIn: "2026-09-07T15:00:00Z" }, /checkInDateLocalized/],
  [{ checkInDateLocalized: "2026-02-30" }, /valid date/],
  [{ checkOutDateLocalized: 8 }, /YYYY-MM-DD string/],
  [{ checkInDateLocalized: "2026-09-07", checkOutDateLocalized: "2026-09-06" }, /on or before/],
  [{ checkInDateLocalized: "2026-09-07", checkOutDateLocalized: "2026-09-07" }, /must be after/],
  [{ plannedArrival: "24:00" }, /HH:mm/],
  [{ plannedDeparture: "12:99" }, /HH:mm/],
]) {
  test(`update-dates rejects invalid fields: ${JSON.stringify(body)}`, (t) => {
    rejectsWithoutRequest(run(t, ["res", "update-dates", "res-1", "--data", JSON.stringify(body)]), error);
  });
}

test("reservation comments list uses top-level pagination", (t) => {
  const result = run(t, ["res", "comments", "res-1", "--limit", "2", "--skip", "4"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.requests, [request("GET", "/v1/reservations-v3/res-1/comments", { query: { limit: "2", skip: "4" } })]);
});

test("delete-comment handles the API's 204 response", (t) => {
  const result = run(t, ["res", "delete-comment", "res-1", "comment-1"], { replies: [{ status: 204 }] });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "null\n");
  assert.deepEqual(result.requests, [request("DELETE", "/v1/reservations-v3/res-1/comments/comment-1")]);
});

test("comment author rejection is surfaced without a second mutation", (t) => {
  const result = run(t, ["res", "update-comment", "res-1", "comment-1", "--data", '{"body":"Synthetic edit"}'],
    { replies: [{ status: 403, body: { message: "Only the comment author may edit" } }] });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /403/);
  assert.equal(result.requests.length, 1);
});

test("reservation report sends required timezone and validated pagination", (t) => {
  const result = run(t, ["res", "report", "view-1", "--timezone", "America/Los_Angeles", "--limit", "10", "--skip", "0"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.requests, [request("GET", "/v1/reservations-reports/view-1", { query: {
    timezone: "America/Los_Angeles", limit: "10", skip: "0",
  } })]);
});

test("reservation logs expose documented cursor, sort and page size", (t) => {
  const result = run(t, ["res", "logs", "res-1", "--cursor", "log-1", "--limit", "7", "--sort", "asc"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.requests, [request("GET", "/v1/reservation-logs/res-1", { query: { cursor: "log-1", limit: "7", sort: "asc" } })]);
});

for (const [args, error] of [
  [["report", "view-1"], /required option.*timezone/],
  [["report", "view-1", "--timezone", "Moon/Base"], /valid IANA timezone/],
  [["report", "view-1", "--timezone", "UTC", "--limit", "1.2"], /--limit/],
  [["comments", "res-1", "--limit", "0"], /--limit/],
  [["comments", "res-1", "--skip", "-1"], /--skip/],
  [["logs", "res-1", "--limit", "21"], /--limit/],
  [["logs", "res-1", "--sort", "up"], /Allowed choices/],
  [["update-booking-date", "res-1", "--data", "[]"], /JSON object/],
  [["add-comment", "res-1", "--data", "{"], /JSON object/],
]) {
  test(`reservation action rejects invalid input: ${args.slice(0, 4).join(" ")}`, (t) => {
    rejectsWithoutRequest(run(t, ["res", ...args]), error);
  });
}

test("legacy get normalizes field selection", (t) => {
  const result = run(t, ["res", "legacy-get", "res-1", "--fields", "_id,guest.fullName"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.requests, [request("GET", "/v1/reservations/res-1", { query: { fields: "_id guest.fullName" } })]);
});
