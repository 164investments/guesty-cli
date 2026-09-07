import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reservationId = "507f1f77bcf86cd799439011";
const secondId = "507f1f77bcf86cd799439012";

function run(t, args) {
  const temporary = mkdtempSync(join(tmpdir(), "guesty-api-contract-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const tracePath = join(temporary, "trace.json");
  const result = spawnSync(process.execPath, ["--import", join(root, "test/fixtures/api-command-runtime.mjs"), join(root, "dist/cli.js"), ...args], {
    cwd: root, encoding: "utf8", timeout: 10_000,
    env: { ...process.env, GUESTY_API_TEST_TRACE: tracePath },
  });
  assert.ifError(result.error);
  const trace = JSON.parse(readFileSync(tracePath, "utf8"));
  assert.deepEqual(trace.writes, [], "commands must not mutate local or shared token caches");
  assert.doesNotMatch(result.stdout + result.stderr, /fake-openapi-token/);
  return { ...result, trace };
}

function contract(name, args, path, params = {}, body, method = body === undefined ? "GET" : "POST") {
  test(name, (t) => {
    const result = run(t, args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.trace.requests.length, 1, "exactly one mocked API request");
    const request = result.trace.requests[0];
    const url = new URL(request.url);
    assert.equal(url.origin, "https://open-api.guesty.com");
    assert.equal(url.pathname, path);
    assert.equal(request.method, method);
    const expected = Object.entries(params).flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map((item) => [key, String(item)]));
    assert.deepEqual([...url.searchParams].sort(), expected.sort(), "query names, serialization, and values match the published API contract");
    assert.deepEqual(request.body === undefined ? undefined : JSON.parse(request.body), body);
    assert.deepEqual(JSON.parse(result.stdout), { ok: true });
  });
}

function invalid(name, args, message) {
  test(name, (t) => {
    const result = run(t, args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
    assert.deepEqual(result.trace.requests, [], "invalid inputs must fail before network activity");
    assert.equal(result.trace.tokenReads, 0, "invalid inputs must fail before credentials are read");
  });
}

contract("conversation reservation search uses a filters array", ["conversations", "list", "--reservation", reservationId, "--filters", '[{"field":"status","operator":"$eq","value":"OPEN"}]', "--fields", "guest,reservation", "--sort=-modifiedAt", "--cursor-after", "next", "--limit", "10"], "/v1/communication/conversations", {
  filters: JSON.stringify([{ field: "status", operator: "$eq", value: "OPEN" }, { field: "reservation._id", operator: "$eq", value: reservationId }]),
  fields: "guest reservation modifiedAt", sort: "-modifiedAt", cursorAfter: "next", limit: 10,
});
contract("conversation cursor projection keeps an existing sort field only once", ["conversations", "list", "--fields", "guest,modifiedAt", "--sort=-modifiedAt"], "/v1/communication/conversations", { fields: "guest modifiedAt", sort: "-modifiedAt", limit: 25 });
contract("conversation get forwards field selection", ["conversations", "get", "conversation", "--fields", "guest,status"], "/v1/communication/conversations/conversation", { fields: "guest status" });
contract("conversation posts can follow pagination cursors", ["conversations", "posts", "conversation", "--cursor-before", "previous", "--sort", "createdAt"], "/v1/communication/conversations/conversation/posts", { cursorBefore: "previous", sort: "createdAt" });
contract("conversation post includes required module and optional sender", ["conversations", "post", "conversation", "--module", "note", "--body", "Internal note", "--sent-by", "host"], "/v1/communication/conversations/conversation/posts", {}, { body: "Internal note", module: { type: "note" }, sentBy: "host" });
contract("conversation send preserves body and recipient arrays", ["conversations", "send", "conversation", "--module", "email", "--body", "First paragraph.\n\nSecond paragraph.", "--to", "one@example.invalid", "--to", "two@example.invalid", "--cc", "cc@example.invalid", "--bcc", "bcc@example.invalid"], "/v1/communication/conversations/conversation/send-message", {}, {
  body: "First paragraph.\n\nSecond paragraph.", module: { type: "email", to: ["one@example.invalid", "two@example.invalid"], cc: ["cc@example.invalid"], bcc: ["bcc@example.invalid"] },
});
for (const command of ["list", "posts"]) invalid(`conversation ${command} rejects conflicting cursors`, ["conversations", command, ...(command === "posts" ? ["conversation"] : []), "--cursor-after", "next", "--cursor-before", "previous"], /only one/);
for (const command of ["post", "send"]) invalid(`conversation ${command} requires explicit module`, ["conversations", command, "conversation", "--body", "text"], /required option.*--module/);
invalid("conversation filters must be an array", ["conversations", "list", "--filters", "{}"], /JSON array/);
invalid("conversation limits reject partial numbers", ["conversations", "list", "--limit", "2oops"], /integer/);

contract("review reply uses reviewReply body key", ["reviews", "reply", "review", "--body", "Thank you"], "/v1/reviews/review/reply", {}, { reviewReply: "Thank you" }, "PUT");
contract("review list includes channel, reservation, and incremental filters", ["reviews", "list", "--listing", "listing", "--reservation", reservationId, "--channel", "custom", "--custom-channel", "Our Site", "--include-custom-channels", "--from", "2026-01-01T00:00:00Z", "--to", "2026-02-01T00:00:00Z", "--limit", "10", "--skip", "5"], "/v1/reviews", {
  listingId: "listing", reservationId, channelId: "custom", customChannelName: "Our Site", includeCustomChannels: true, startDate: "2026-01-01T00:00:00Z", endDate: "2026-02-01T00:00:00Z", limit: 10, skip: 5,
});
contract("review averages keep a single listing ID encoded as an array", ["reviews", "listings-average", "--listing", "one"], "/v1/reviews/listings-average", { "listingIds[]": ["one"] });
contract("review averages serialize multiple listing IDs with array brackets", ["reviews", "listings-average", "--listing", "one", "--listing", "two", "--include-custom-channels"], "/v1/reviews/listings-average", { "listingIds[]": ["one", "two"], includeCustomChannels: true });
invalid("review averages require listings", ["reviews", "listings-average"], /--listing.*required|required option.*--listing/);
invalid("review ranges reject nonexistent dates", ["reviews", "list", "--from", "2026-02-30"], /valid date/);

contract("guest reports use supported default columns", ["guests", "list"], "/v1/guests-crud", { columns: "id fullName guestEmail guestPhone", limit: 25, skip: 0 });
contract("guest reports accept filters and normalized columns", ["guests", "list", "--filters", '{"allergies":{"@in":["feather"]}}', "--columns", "id,fullName", "--limit", "12", "--skip", "2"], "/v1/guests-crud", { columns: "id fullName", filters: '{"allergies":{"@in":["feather"]}}', limit: 12, skip: 2 });
contract("guest get always includes required fields", ["guests", "get", "guest"], "/v1/guests-crud/guest", { fields: "id firstName lastName fullName address" });
contract("guest get supports custom fields", ["guests", "get", "guest", "--fields", "id,tags"], "/v1/guests-crud/guest", { fields: "id tags" });
invalid("unsupported guest q search fails rather than returning unfiltered data", ["guests", "list", "--q", "person"], /does not support --q/);
invalid("guest filters must be an object", ["guests", "list", "--filters", "[]"], /JSON object/);

contract("task status and report filters use the task report schema", ["tasks", "list", "--status", "completed", "--filters", '{"scheduledFor":{"@today":true}}'], "/v1/tasks-open-api/tasks", {
  columns: "id status taskTitle listing assignee scheduledFor", limit: 25, skip: 0,
  filters: '{"scheduledFor":{"@today":true},"status":{"@in":["completed"]}}',
});
invalid("task pagination rejects negative offsets", ["tasks", "list", "--skip=-1"], /integer/);
invalid("task pagination enforces the live API minimum", ["tasks", "list", "--limit", "24"], /integer/);
invalid("task listing shorthand cannot silently return unfiltered data", ["tasks", "list", "--listing", "listing"], /Use --filters/);

for (const [args, path, language] of [
  [["list-fields", "listing"], "/v1/marketing/fields/listing", "all"],
  [["list-channel-fields", "listing", "airbnb2", "--language", "en"], "/v1/marketing/fields/listing/channels/airbnb2", "en"],
  [["list-description-set-fields", "listing", "description", "--language", "es"], "/v1/marketing/fields/listing/description-sets/description", "es"],
]) contract(`marketing ${args[0]} supplies required language`, ["marketing", ...args], path, { language });
contract("rate plan calendar sends required fromDate and toDate", ["rate-plans", "get-calendar", "listing", "rate", "--from", "2026-01-01", "--to", "2026-01-05"], "/v1/rm-rate-plans-ext/ari-calendar/listing/listing/ratePlan/rate", { fromDate: "2026-01-01", toDate: "2026-01-05" });
invalid("rate plan calendar requires date range", ["rate-plans", "get-calendar", "listing", "rate"], /required option.*--from/);
invalid("rate plan calendar rejects reversed ranges", ["rate-plans", "get-calendar", "listing", "rate", "--from", "2026-02-01", "--to", "2026-01-01"], /on or before/);
contract("Airbnb resolutions include required created date range", ["airbnb", "resolutions", reservationId, "--from", "2026-01-01T00:00:00Z", "--to", "2026-02-01T00:00:00Z"], `/v1/airbnb-resolutions-center/reservations/${reservationId}/resolutions`, { from: "2026-01-01T00:00:00Z", to: "2026-02-01T00:00:00Z" });
invalid("Airbnb resolutions require date range", ["airbnb", "resolutions", reservationId], /required option.*--from/);
contract("iCalendar deletion forwards an explicit event strategy", ["icalendar", "delete-imported", "calendar", "--strategy", "preserve_channel_events"], "/v1/icalendar-api/imported-calendars/calendar", { strategy: "preserve_channel_events" }, undefined, "DELETE");
invalid("iCalendar deletion requires a strategy", ["icalendar", "delete-imported", "calendar"], /required option.*--strategy/);
invalid("iCalendar deletion rejects unknown strategies", ["icalendar", "delete-imported", "calendar", "--strategy", "guess"], /Allowed choices/);
contract("payment provider by-listing includes required listing ID", ["payment-providers", "by-listing", "--listing", "listing"], "/v1/payment-providers/provider-by-listing", { listingId: "listing" });
invalid("payment provider by-listing requires listing ID", ["payment-providers", "by-listing"], /required option.*--listing/);
contract("property group pagination uses offset rather than skip", ["properties", "list-groups", "--limit", "200", "--skip", "200", "--type", "COMBO"], "/v1/properties-api/groups/group", { limit: 200, offset: 200, type: "COMBO" });
invalid("property groups reject invalid page sizes", ["properties", "list-groups", "--limit", "201"], /integer/);
contract("adjustable line items accept a zero stay index", ["price-adjustments", "adjustable-line-items", reservationId, "--stay-index", "0"], `/v1/price-adjustments/adjustable-line-items/${reservationId}`, { stayIndex: 0 });
contract("adjustable line items omit optional stay index", ["price-adjustments", "adjustable-line-items", reservationId], `/v1/price-adjustments/adjustable-line-items/${reservationId}`);
invalid("adjustable line items reject fractional stay indices", ["price-adjustments", "adjustable-line-items", reservationId, "--stay-index", "0.5"], /integer/);

for (const [group, command, path] of [
  ["accounting", "journal-entries", "/v1/accounting-api/journal-entries"],
  ["accounting", "journal-entries-all", "/v1/accounting-api/journal-entries/all"],
  ["financials", "journal-entries", "/v1/accounting-api/journal-entries"],
]) {
  contract(`${group} ${command} retains the default 30-day filter`, [group, command], path, { transactionDate: '{"operator":"@in_past_days","value":30}', limit: 100, skip: 0 });
  contract(`${group} ${command} sends documented date and listing filters`, [group, command, "--from", "2026-01-01", "--to", "2026-02-01", "--listing", "one", "--listing", "two", "--owner", "owner", "--vendor", "vendor", "--guest", "guest", "--ledger", "O", "--trigger", "BULK_UPLOADS", "--charge-code", "AF", "--confirmation-code", "CONFIRM", "--name", "Test", "--description", "Example", "--sort-by-date", "DESC", "--limit", "20", "--skip", "10"], path, {
    transactionDate: '{"operator":"@between","value":["2026-01-01","2026-02-01"]}', listings: ["one", "two"], owners: ["owner"], vendors: ["vendor"], guests: ["guest"], ledger: ["O"], triggers: ["BULK_UPLOADS"], chargeCode: ["AF"], reservationConfirmationCodes: ["CONFIRM"], name: "Test", description: "Example", sortByDate: "DESC", limit: 20, skip: 10,
  });
}
invalid("journal reads preserve the date filter required by the live API", ["accounting", "journal-entries", "--no-date-filter"], /unknown option/);
contract("all journal entries support recognition filtering", ["accounting", "journal-entries-all", "--date-filter", '{"operator":"@today","value":true}', "--recognized", "false"], "/v1/accounting-api/journal-entries/all", { transactionDate: '{"operator":"@today","value":true}', recognized: "false", limit: 100, skip: 0 });
invalid("journal entries reject an incomplete date range", ["financials", "journal-entries", "--from", "2026-01-01"], /both --from and --to/);
invalid("journal entries reject date filter objects without value", ["accounting", "journal-entries", "--date-filter", '{"operator":"@today"}'], /operator and value/);
invalid("journal entries reject fractional day counts", ["accounting", "journal-entries", "--days", "2.5"], /integer/);
contract("accounting categories support name filter and paging", ["accounting", "categories", "--q", "Office", "--limit", "10", "--skip", "20"], "/v1/accounting-api/categories", { q: "Office", limit: 10, skip: 20 });
contract("business models include optional listing assignments", ["accounting", "business-models", "--include-assigned-listings", "--limit", "5", "--skip", "10"], "/v1/business-models-api/light-business-models", { includeAssignedListings: true, limit: 5, skip: 10 });
contract("business models preserve unpaginated default", ["accounting", "business-models"], "/v1/business-models-api/light-business-models");
contract("expense reads support documented filters and sorting", ["accounting", "expenses", "--status", "scheduled,paid", "--category", "category", "--vendor", "vendor", "--owner", "owner", "--listing", "listing", "--reservation", reservationId, "--expense-rule", "rule", "--from", "2026-01-01", "--to", "2026-02-01", "--sort-by", "expenseDate", "--sort-order", "ASC", "--limit", "15", "--skip", "30"], "/v1/expenses-api/expenses", {
  status: "scheduled,paid", categoryId: "category", vendorId: "vendor", ownerId: "owner", listingId: "listing", reservationId, expenseRuleId: "rule", expenseDateFrom: "2026-01-01", expenseDateTo: "2026-02-01", sortBy: "expenseDate", sortOrder: "ASC", limit: 15, skip: 30,
});
contract("vendor list can request subsequent pages", ["accounting", "vendors", "--limit", "100", "--skip", "100"], "/v1/vendors", { limit: 100, skip: 100 });
invalid("vendors enforce the documented minimum page size", ["accounting", "vendors", "--limit", "1"], /integer/);

for (const command of ["payment-transactions", "payouts-reconciliation"]) {
  const path = "/v1/payment-transactions/reports" + (command === "payouts-reconciliation" ? "/payouts-reconciliation" : "");
  contract(`${command} sends take instead of ignored limit`, ["accounting", command, "--limit", "60", "--skip", "120", "--from", "2026-01-01", "--to", "2026-01-31", "--sub-account", "1234.1"], path, { take: 60, skip: 120, startDate: "2026-01-01", endDate: "2026-01-31", subAccountId: "1234.1" });
  contract(`${command} supports reservation confirmation lookup`, ["accounting", command, "--confirmation-code", "GY-TEST"], path, { take: 25, skip: 0, reservationConfirmationCode: "GY-TEST" });
  invalid(`${command} rejects conflicting confirmation and date filters`, ["accounting", command, "--confirmation-code", "GY-TEST", "--from", "2026-01-01"], /cannot be combined/);
  invalid(`${command} requires a date range or confirmation code`, ["accounting", command], /both --from and --to/);
  invalid(`${command} rejects a start date without an end date`, ["accounting", command, "--from", "2026-01-01"], /both --from and --to/);
  invalid(`${command} rejects an end date without a start date`, ["accounting", command, "--to", "2026-01-31"], /both --from and --to/);
}
contract("payout reconciliation supports a payout ID within a date range", ["accounting", "payouts-reconciliation", "--payout", "1999001136945796604", "--from", "2026-01-01", "--to", "2026-01-31"], "/v1/payment-transactions/reports/payouts-reconciliation", { take: 25, skip: 0, payoutId: "1999001136945796604", startDate: "2026-01-01", endDate: "2026-01-31" });
contract("disbursement list includes report filters and array query parameters", ["accounting", "disbursements", "--from", "2026-01-01", "--to", "2026-01-31", "--created-from", "2026-01-01T00:00:00Z", "--created-to", "2026-01-31T23:59:59Z", "--status", "PROCESSING", "--status", "RECEIVED", "--method", "ACH", "--entity", "Vendor", "--reference", "123", "--sort=-createdAt", "--limit", "10", "--skip", "20"], "/v1/accounting-api/disbursements", {
  payoutDateFrom: "2026-01-01", payoutDateTo: "2026-01-31", createdAtFrom: "2026-01-01T00:00:00Z", createdAtTo: "2026-01-31T23:59:59Z", payoutStatus: ["PROCESSING", "RECEIVED"], payoutMethod: ["ACH"], entityName: "Vendor", referenceNumber: "123", sort: "-createdAt", limit: 10, skip: 20,
});
contract("disbursement lookup uses its dedicated endpoint", ["accounting", "disbursement", "disbursement"], "/v1/accounting-api/disbursements/disbursement");
invalid("disbursement reads reject reversed creation ranges", ["accounting", "disbursements", "--created-from", "2026-03-01T00:00:00Z", "--created-to", "2026-02-01T00:00:00Z"], /on or before/);

contract("listing financial settings no longer imply date filtering", ["financials", "listing", "listing"], "/v1/financials/listing/listing");
invalid("listing financial settings reject unsupported date filters", ["financials", "listing", "listing", "--from", "2026-01-01"], /unknown option/);
contract("owner statements use the real reporting endpoint with month filtering", ["owners", "statements", "--owner", "owner", "--listing", "one", "--listing", "two", "--business-model", "model", "--period-mode", "month", "--year", "2026", "--month", "1", "--updated-since", "2026-01-01T00:00:00Z", "--generated-from", "2026-01-01T00:00:00Z", "--generated-to", "2026-01-31T23:59:59Z", "--statement-type", "MONTHLY", "--status", "APPROVED", "--status", "PENDING", "--shared-via", "EMAIL", "--shared-via", "OWNERS_PORTAL", "--limit", "10", "--skip", "20"], "/v1/owner-statement-api/owner-statements", {
  ownerId: "owner", listingId: ["one", "two"], businessModelId: ["model"], periodMode: "month", year: 2026, month: 1, updatedSince: "2026-01-01T00:00:00Z", generatedAtFrom: "2026-01-01T00:00:00Z", generatedAtTo: "2026-01-31T23:59:59Z", statementType: "MONTHLY", status: ["APPROVED", "PENDING"], sharedVia: ["EMAIL", "OWNERS_PORTAL"], limit: 10, skip: 20,
});
contract("legacy financial owner-statement command retrieves real statements for its listing", ["financials", "owner-statement", "listing", "--period-mode", "year", "--year", "2026"], "/v1/owner-statement-api/owner-statements", { listingId: ["listing"], periodMode: "year", year: 2026, limit: 25, skip: 0 });
for (const [mode, args, params] of [
  ["monthRange", ["--from-year", "2025", "--from-month", "12", "--to-year", "2026", "--to-month", "1"], { fromYear: 2025, fromMonth: 12, toYear: 2026, toMonth: 1 }],
  ["yearRange", ["--from-year", "2025", "--to-year", "2026"], { fromYear: 2025, toYear: 2026 }],
  ["fiscalYear", ["--fiscal-year", "2026"], { fiscalYear: 2026 }],
  ["fiscalYearRange", ["--from-fiscal-year", "2025", "--to-fiscal-year", "2026"], { fromFiscalYear: 2025, toFiscalYear: 2026 }],
]) contract(`owner statement ${mode} serializes its required period fields`, ["owners", "statements", "--period-mode", mode, ...args], "/v1/owner-statement-api/owner-statements", { periodMode: mode, ...params, limit: 25, skip: 0 });
invalid("owner statement period fields require an explicit mode", ["owners", "statements", "--year", "2026"], /--period-mode is required/);
invalid("owner statement month mode requires month", ["owners", "statements", "--period-mode", "month", "--year", "2026"], /--month is required/);
invalid("owner statement month must exist", ["owners", "statements", "--period-mode", "month", "--year", "2026", "--month", "13"], /integer/);
invalid("owner statement ranges cannot run backwards", ["owners", "statements", "--period-mode", "monthRange", "--from-year", "2026", "--from-month", "2", "--to-year", "2026", "--to-month", "1"], /on or before/);
invalid("owner statement updated-since requires a timestamp", ["owners", "statements", "--updated-since", "2026-01-01"], /ISO 8601/);

for (const [command, fields] of [["folio-overview", "hostPayout,perStayTotals.stayIndex"], ["folio-invoice-items", "title,totalPrice,adjustments.amount"]]) {
  const path = command === "folio-overview" ? "/v1/guest-folio/overview" : "/v1/guest-folio/invoice-items";
  contract(`${command} uses comma-separated rather than repeated array parameters`, ["financials", command, "--reservations", `${reservationId}, ${secondId}`, "--fields", fields], path, { reservationIds: `${reservationId},${secondId}`, fields });
  invalid(`${command} requires field selection`, ["financials", command, "--reservations", reservationId], /required option.*--fields/);
  invalid(`${command} rejects more than 200 reservations`, ["financials", command, "--reservations", Array(201).fill(reservationId).join(","), "--fields", "title"], /1-200/);
  invalid(`${command} rejects invalid reservation IDs`, ["financials", command, "--reservations", "short", "--fields", "title"], /24 characters/);
  invalid(`${command} rejects empty field lists`, ["financials", command, "--reservations", reservationId, "--fields", ""], /at least one field/);
}

contract("rate plan list includes required channel and pagination fields", ["integrations", "rate-plans", "--channel", "bookingCom", "--sort", "name", "--limit", "10", "--skip", "20"], "/v1/rm-rate-plans-ext/rate-plans", { channelId: "bookingCom", sort: "name", limit: 10, skip: 20 });
contract("rate plans by-listing includes required channel and defaults", ["rate-plans", "by-listing", "listing", "--channel", "booking_engine"], "/v1/rm-rate-plans-ext/rate-plans/listing/listing", { channelId: "booking_engine", sort: "name", limit: 25, skip: 0 });
invalid("rate plan list requires a channel", ["integrations", "rate-plans"], /required option.*--channel/);
invalid("rate plans by-listing requires a channel", ["rate-plans", "by-listing", "listing"], /required option.*--channel/);
contract("marketing translation includes required language", ["marketing", "upsert-translation", "listing", "--language", "en", "--data", '{"fields":[{"field":"title","value":"Example"}]}'], "/v1/marketing/fields/listing/upsert", { language: "en" }, { fields: [{ field: "title", value: "Example" }] }, "PUT");
invalid("marketing translation requires language before parsing input", ["marketing", "upsert-translation", "listing", "--data", "{}"], /required option.*--language/);
contract("promotion property list supplies includeChildren default", ["promotions", "list-properties", "promotion"], "/v1/rm-promotions/promotions/promotion/listings", { includeChildren: false });
contract("promotion property list can include children", ["promotions", "list-properties", "promotion", "--include-children"], "/v1/rm-promotions/promotions/promotion/listings", { includeChildren: true });
contract("house rules use comma-separated required property IDs", ["properties", "list-house-rules", "--property-ids", "one, two"], "/v1/properties/house-rules/", { propertyIds: "one,two" });
invalid("house rules cannot request an unspecified portfolio", ["properties", "list-house-rules"], /required option.*--property-ids/);
invalid("house rules reject empty property IDs", ["properties", "list-house-rules", "--property-ids", "one,"], /nonempty/);
contract("webhook secret lookup includes the callback URL", ["webhooks", "secret", "--url", "https://example.invalid/hooks?target=guesty"], "/v1/webhooks-v2/secret", { url: "https://example.invalid/hooks?target=guesty" });
invalid("webhook secret lookup requires a callback URL", ["webhooks", "secret"], /required option.*--url/);

test("photo uploads send a multipart file and optional caption without a manual boundary", (t) => {
  const temporary = mkdtempSync(join(tmpdir(), "guesty-photo-contract-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const file = join(temporary, "sample.jpeg");
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  writeFileSync(file, bytes);
  const result = run(t, ["properties", "upload-photo", "listing", "--data-file", file, "--caption", "Example caption"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.trace.requests.length, 1);
  assert.deepEqual(result.trace.requests[0], {
    url: "https://open-api.guesty.com/v1/properties-api/property-photos/property-photos/listing/upload/blob",
    method: "POST", body: "binary", contentType: null,
    multipart: [{ name: "file", filename: "sample.jpeg", type: "image/jpeg", data: bytes.toString("base64") }, { name: "caption", value: "Example caption" }],
  });
});
invalid("photo upload requires a file", ["properties", "upload-photo", "listing"], /required option.*--data-file/);

contract("listing search normalizes fields and preserves supported filters", ["listings", "list", "--fields", "id,title,address", "--q", "Cozy", "--city", "Test City", "--tags", "Example", "--ids", "one,two", "--view", "view", "--sort=-title", "--inactive", "--limit", "10", "--skip", "20"], "/v1/listings", {
  fields: "id title address", q: "Cozy", city: "Test City", tags: "Example", ids: "one,two", viewId: "view", sort: "-title", active: false, limit: 10, skip: 20,
});
contract("listing get uses space-delimited field selection", ["listings", "get", "listing", "--fields", "id,title,address"], "/v1/listings/listing", { fields: "id title address" });
for (const command of ["payment-provider", "get-payment-provider"]) contract(`listing ${command} uses a separate query object`, ["listings", command, "listing"], "/v1/listings/listing", { fields: "paymentProviderId" });
invalid("listing search rejects contradictory status filters", ["listings", "list", "--active", "--inactive"], /only one/);
invalid("listing search rejects invalid pagination", ["listings", "list", "--limit", "10bad"], /integer/);

test("owner document creation sends its required PDF and metadata as multipart", (t) => {
  const temporary = mkdtempSync(join(tmpdir(), "guesty-document-contract-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const file = join(temporary, "sample.pdf");
  const bytes = Buffer.from("%PDF-1.7\nfixture");
  writeFileSync(file, bytes);
  const result = run(t, ["owners", "create-document", "owner", "--data-file", file, "--name", "Example contract", "--type", "CONTRACT", "--description", "Example description", "--shared", "--start-date", "2026-01-01", "--end-date", "2026-12-31"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.trace.requests, [{
    url: "https://open-api.guesty.com/v1/owners/owner/documents", method: "POST", body: "binary", contentType: null,
    multipart: [
      { name: "file", filename: "sample.pdf", type: "application/pdf", data: bytes.toString("base64") },
      { name: "name", value: "Example contract" }, { name: "type", value: "CONTRACT" }, { name: "isShared", value: "true" },
      { name: "description", value: "Example description" }, { name: "startDate", value: "2026-01-01" }, { name: "endDate", value: "2026-12-31" },
    ],
  }]);
});
invalid("owner document creation requires a file", ["owners", "create-document", "owner", "--name", "Document"], /required option.*--data-file/);
invalid("owner document creation requires a document name", ["owners", "create-document", "owner", "--data-file", "file.pdf"], /required option.*--name/);
test("oversized owner document fails before authentication or network", (t) => {
  const temporary = mkdtempSync(join(tmpdir(), "guesty-document-size-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const file = join(temporary, "oversized.pdf");
  writeFileSync(file, Buffer.alloc(5 * 1024 * 1024 + 1));
  const result = run(t, ["owners", "create-document", "owner", "--data-file", file, "--name", "Document"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /5 MB/);
  assert.deepEqual(result.trace.requests, []);
  assert.equal(result.trace.tokenReads, 0);
});

contract("guest payment methods retain the unscoped default request", ["guests", "payment-methods", "guest"], "/v1/guests/guest/payment-methods");
contract("guest payment methods can specify the reservation for VCC context", ["guests", "payment-methods", "guest", "--reservation", reservationId], "/v1/guests/guest/payment-methods", { reservationId });
test("guest payment methods help explains the reservation context", (t) => {
  const result = run(t, ["guests", "payment-methods", "--help"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--reservation <id>/);
  assert.match(result.stdout, /virtual credit cards/);
  assert.deepEqual(result.trace.requests, []);
});
