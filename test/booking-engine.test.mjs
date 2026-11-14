import assert from "node:assert/strict";
import test from "node:test";
import { run } from "./harness/isolated-runner.mjs";

// Every request, token and clock here is fake (test/harness/scenarios.mjs).
const BEAPI_TOKEN = "fake-isolated-beapi-token";

function booking(trace) {
  return trace.requests.filter((request) => new URL(request.url).hostname === "booking.guesty.com");
}

async function execute(t, options) {
  const result = await run(t, options);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(BEAPI_TOKEN), "the beapi token is never printed");
  return result;
}

// ─── Transport ───────────────────────────────────────────────────────────────
// These called bookingEngineFetch and guestyFetch in one Node process; they are
// now Rust unit tests in src/client.rs (`offline_tests`, cargo test --features test-hooks):
// - "Booking Engine requests use booking.guesty.com and only the cached beapi token"
//     → booking_engine_requests_use_booking_guesty_com_and_only_the_cached_beapi_token
// - "Booking Engine writes send JSON bodies" → booking_engine_writes_send_json_bodies
// - "Booking Engine transport rejects <case> before any token or network access"
//     → booking_engine_transport_rejects_bad_requests_before_any_token_or_network_access
// - "a Booking Engine 401 re-reads the beapi cache once and retries with a different token"
//     → a_booking_engine_401_rereads_the_beapi_cache_once_and_retries_with_a_different_token
// - "a Booking Engine 401 fails without requesting a token when the cache has nothing new"
//     → a_booking_engine_401_fails_without_requesting_a_token_when_the_cache_has_nothing_new
// - "Booking Engine reads retry server errors, and every method waits out a 429"
//     → booking_engine_reads_retry_server_errors_and_every_method_waits_out_a_429
// - "a Booking Engine write with an unknown outcome is not repeated"
//     → a_booking_engine_write_with_an_unknown_outcome_is_not_repeated
// - "Booking Engine error bodies are shown with the token redacted, and redirects are not followed"
//     → booking_engine_error_bodies_are_redacted_and_redirects_are_not_followed
// - "Booking Engine requests observe five per second, separately from the Open API limit"
//     → booking_engine_requests_observe_five_per_second_separately_from_the_open_api_limit
//       (its stderr notice is not checked there; see the port report)

// ─── Commands ────────────────────────────────────────────────────────────────

function contract(name, args, { path, params = {}, body, method = body === undefined ? "GET" : "POST" }) {
  test(`be ${name}`, async (t) => {
    const result = await execute(t, { args: ["booking-engine", ...args] });
    assert.equal(result.status, 0, result.stderr);
    const requests = booking(result.trace);
    assert.equal(requests.length, 1, "exactly one Booking Engine request");
    const [request] = requests;
    const url = new URL(request.url);
    assert.equal(url.origin, "https://booking.guesty.com");
    assert.equal(url.pathname, path);
    assert.equal(request.method, method);
    assert.equal(request.headers.authorization, `Bearer ${BEAPI_TOKEN}`);
    const expected = Object.entries(params).flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map((item) => [key, String(item)]));
    assert.deepEqual([...url.searchParams].sort(), expected.sort());
    assert.deepEqual(request.body === undefined ? undefined : JSON.parse(request.body), body);
    assert.equal(result.trace.requests.filter((item) => new URL(item.url).hostname === "open-api.guesty.com").length, 0, "no Open API request");
    assert.deepEqual(JSON.parse(result.stdout), { ok: true });
  });
}

function invalid(name, args, message) {
  test(`be ${name}`, async (t) => {
    const result = await execute(t, { args: ["be", ...args] });
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
    assert.deepEqual(result.trace.requests, [], "invalid input fails before the token cache or network");
  });
}

const guest = { firstName: "Ada", lastName: "Lovelace", email: "ada@example.invalid" };

contract("listings uses the documented defaults", ["listings"], { path: "/api/listings", params: { limit: 20 } });
contract("listings maps every filter to its documented query name", [
  "listings", "--check-in", "2026-11-01", "--check-out", "2026-11-04", "--min-occupancy", "4", "--bedrooms", "2", "--bathrooms", "1",
  "--property-type", "CABIN", "--listing-type", "SINGLE", "--room-type", "ENTIRE_HOME_APT", "--min-price", "100", "--max-price", "350.5", "--currency", "USD",
  "--include-amenities", "HOT_TUB, WIRELESS_INTERNET", "--exclude-amenities", "SMOKING_ALLOWED", "--min-lng", "-122.8", "--max-lng", "-121.5",
  "--min-lat", "45.2", "--max-lat", "45.6", "--city", "Government Camp", "--country", "United States", "--state", "Oregon", "--neighborhood", "Mt Hood",
  "--tag", "family", "--tag", "ski", "--king-bed", "1", "--crib", "1", "--pets-allowed", "true", "--smoking-allowed", "false",
  "--fields", "title,address", "--limit", "50", "--cursor", "next-page",
], { path: "/api/listings", params: {
  checkIn: "2026-11-01", checkOut: "2026-11-04", minOccupancy: 4, numberOfBedrooms: 2, numberOfBathrooms: 1, propertyType: "CABIN", listingType: "SINGLE",
  roomType: "ENTIRE_HOME_APT", minPrice: 100, maxPrice: 350.5, currency: "USD", includeAmenities: "HOT_TUB,WIRELESS_INTERNET", excludeAmenities: "SMOKING_ALLOWED",
  minLng: -122.8, maxLng: -121.5, minLat: 45.2, maxLat: 45.6, city: "Government Camp", country: "United States", state: "Oregon", neighborhood: "Mt Hood",
  tags: ["family", "ski"], kingBed: 1, crib: 1, petsAllowed: true, smokingAllowed: false, fields: "title address", limit: 50, cursor: "next-page",
} });
invalid("listings needs both availability dates", ["listings", "--check-in", "2026-11-01"], /--check-in and --check-out together/);
invalid("listings rejects a reversed stay", ["listings", "--check-in", "2026-11-04", "--check-out", "2026-11-01"], /on or before/);
invalid("listings needs a currency for price filters", ["listings", "--min-price", "100"], /need --currency/);
invalid("listings rejects an inverted price range", ["listings", "--min-price", "300", "--max-price", "100", "--currency", "USD"], /must not exceed/);
invalid("listings rejects an impossible latitude", ["listings", "--min-lat", "91"], /--min-lat must be a number at least -90 and at most 90/);
invalid("listings enforces the documented page size", ["listings", "--limit", "101"], /integer between 1 and 100/);
invalid("listings rejects an undocumented property type", ["listings", "--property-type", "SPACESHIP"], /Allowed choices/);
contract("listing forwards field selection", ["listing", "listing-1", "--fields", "title,pictures"], { path: "/api/listings/listing-1", params: { fields: "title pictures" } });
contract("cities sends search and paging", ["cities", "--search", "port", "--limit", "10", "--skip", "20"], { path: "/api/listings/cities", params: { searchText: "port", limit: 10, skip: 20 } });
contract("calendar sends the required range", ["calendar", "listing-1", "--from", "2026-11-01", "--to", "2026-11-30"], { path: "/api/listings/listing-1/calendar", params: { from: "2026-11-01", to: "2026-11-30" } });
invalid("calendar requires a range", ["calendar", "listing-1", "--from", "2026-11-01"], /required option.*--to/);
invalid("calendar rejects invalid dates", ["calendar", "listing-1", "--from", "2026-02-30", "--to", "2026-03-02"], /valid date/);
contract("payment-provider reads the listing's provider", ["payment-provider", "listing-1"], { path: "/api/listings/listing-1/payment-provider" });

contract("create-quote builds the documented body from flags", [
  "create-quote", "--listing", "listing-1", "--check-in", "2026-11-01", "--check-out", "2026-11-04", "--guests", "3", "--adults", "2", "--children", "1", "--coupon", "WINTER", "--coupon", "VIP",
], { path: "/api/reservations/quotes", body: {
  listingId: "listing-1", checkInDateLocalized: "2026-11-01", checkOutDateLocalized: "2026-11-04", guestsCount: 3,
  numberOfGuests: { numberOfAdults: 2, numberOfChildren: 1 }, coupons: "WINTER,VIP",
} });
contract("create-quote accepts a JSON body", ["create-quote", "--data", '{"listingId":"l","checkInDateLocalized":"2026-11-01","checkOutDateLocalized":"2026-11-02","guestsCount":1}'],
  { path: "/api/reservations/quotes", body: { listingId: "l", checkInDateLocalized: "2026-11-01", checkOutDateLocalized: "2026-11-02", guestsCount: 1 } });
invalid("create-quote requires a guest count", ["create-quote", "--listing", "l", "--check-in", "2026-11-01", "--check-out", "2026-11-02"], /guestsCount as a positive integer/);
invalid("create-quote requires check-out after check-in", ["create-quote", "--listing", "l", "--check-in", "2026-11-02", "--check-out", "2026-11-02", "--guests", "1"], /must be after/);
invalid("create-quote needs adults for a guest breakdown", ["create-quote", "--listing", "l", "--check-in", "2026-11-01", "--check-out", "2026-11-02", "--guests", "1", "--children", "1"], /needs --adults/);
invalid("create-quote rejects flags mixed with --data", ["create-quote", "--listing", "l", "--data", "{}"], /flags or --data, not both/);
invalid("create-quote requires a listing in a JSON body", ["create-quote", "--data", '{"checkInDateLocalized":"2026-11-01"}'], /listingId/);
contract("quote reads a quote", ["quote", "quote-1"], { path: "/api/reservations/quotes/quote-1" });
contract("set-quote-coupons replaces the coupon list", ["set-quote-coupons", "quote-1", "--coupon", "A", "--coupon", "B"], { path: "/api/reservations/quotes/quote-1/coupons", body: { coupons: ["A", "B"] } });
contract("set-quote-coupons --clear sends an empty list", ["set-quote-coupons", "quote-1", "--clear"], { path: "/api/reservations/quotes/quote-1/coupons", body: { coupons: [] } });
invalid("set-quote-coupons needs coupons or --clear", ["set-quote-coupons", "quote-1"], /--coupon \(repeatable\) or --clear/);

const instant = { ratePlanId: "rate-1", ccToken: "pm_test", guest };
contract("create-instant-reservation posts the quote booking", ["create-instant-reservation", "quote-1", "--data", JSON.stringify(instant)], { path: "/api/reservations/quotes/quote-1/instant", body: instant });
invalid("create-instant-reservation requires a card token", ["create-instant-reservation", "quote-1", "--data", JSON.stringify({ ratePlanId: "rate-1", guest })], /ccToken/);
invalid("create-instant-reservation requires the guest's email", ["create-instant-reservation", "quote-1", "--data", JSON.stringify({ ...instant, guest: { firstName: "Ada", lastName: "L" } })], /email/);
const inquiry = { ratePlanId: "rate-1", reservedUntil: 24, guest };
contract("create-inquiry-reservation posts a request to book", ["create-inquiry-reservation", "quote-1", "--data", JSON.stringify(inquiry)], { path: "/api/reservations/quotes/quote-1/inquiry", body: inquiry });
invalid("create-inquiry-reservation rejects an undocumented hold", ["create-inquiry-reservation", "quote-1", "--data", JSON.stringify({ ...inquiry, reservedUntil: 6 })], /reservedUntil must be one of -1, 12, 24, 36, 48, 72/);
const charge = { ratePlanId: "rate-1", confirmationToken: "ctoken_test", guest };
contract("create-instant-charge-reservation accepts a Stripe confirmation token", ["create-instant-charge-reservation", "quote-1", "--data", JSON.stringify(charge)], { path: "/api/reservations/quotes/quote-1/instant-charge", body: charge });
const guestyPay = { ratePlanId: "rate-1", initialPaymentMethodId: "pm-1", guest };
contract("create-instant-charge-reservation accepts a GuestyPay payment method", ["create-instant-charge-reservation", "quote-1", "--data", JSON.stringify(guestyPay)], { path: "/api/reservations/quotes/quote-1/instant-charge", body: guestyPay });
invalid("create-instant-charge-reservation needs exactly one payment token", ["create-instant-charge-reservation", "quote-1", "--data", JSON.stringify({ ...charge, initialPaymentMethodId: "pm-1" })], /exactly one of confirmationToken/);
contract("reservation reads a quote reservation", ["reservation", "res-1"], { path: "/api/reservations/res-1/details" });
contract("verify-payment sends the payment ID", ["verify-payment", "res-1", "--payment", "payment-1"], { path: "/api/reservations/res-1/verify-payment", body: { paymentId: "payment-1" } });
contract("verify-payment forwards a 3DS result", ["verify-payment", "res-1", "--data", '{"paymentId":"p","threeDSResult":{"provider":"x","clientSideChallengeResultToken":"t"}}'],
  { path: "/api/reservations/res-1/verify-payment", body: { paymentId: "p", threeDSResult: { provider: "x", clientSideChallengeResultToken: "t" } } });
invalid("verify-payment requires a payment ID", ["verify-payment", "res-1", "--data", "{}"], /paymentId/);

contract("payouts-schedule sends every required parameter", ["payouts-schedule", "--listing", "listing-1", "--check-in", "2026-11-01", "--check-out", "2026-11-04", "--total", "812.4", "--booking-type", "INSTANT"],
  { path: "/api/reservations/payouts/list", params: { listingId: "listing-1", checkIn: "2026-11-01", checkOut: "2026-11-04", total: 812.4, bookingType: "INSTANT" } });
invalid("payouts-schedule requires a booking type", ["payouts-schedule", "--listing", "l", "--check-in", "2026-11-01", "--check-out", "2026-11-04", "--total", "1"], /required option.*--booking-type/);
invalid("payouts-schedule rejects a nonnumeric total", ["payouts-schedule", "--listing", "l", "--check-in", "2026-11-01", "--check-out", "2026-11-04", "--total", "lots", "--booking-type", "INQUIRY"], /--total must be a number/);
contract("reviews maps filters to the documented names", ["reviews", "--listing", "l", "--reservation", "r", "--channel", "airbnb2", "--external-reservation", "HM1", "--external-review", "rev", "--from", "2026-01-01T00:00:00Z", "--to", "2026-02-01T00:00:00Z", "--limit", "10", "--skip", "5"],
  { path: "/api/reviews", params: { listingId: "l", reservationId: "r", channelId: "airbnb2", externalReservationId: "HM1", externalReviewId: "rev", startDate: "2026-01-01T00:00:00Z", endDate: "2026-02-01T00:00:00Z", limit: 10, skip: 5 } });
invalid("reviews rejects an undocumented channel", ["reviews", "--channel", "vrbo"], /Allowed choices/);
contract("upsell-fees uses the rate plan's inquiry ID and the listing", ["upsell-fees", "inquiry-1", "listing-1"], { path: "/api/reservations/upsell/inquiry-1/listing-1/fee" });
contract("set-quote-upsells sends fee and rate plan IDs", ["set-quote-upsells", "quote-1", "--fee", "fee-1", "--rate-plan", "rate-1"], { path: "/api/reservations/upsell/quote-1", body: { additionalFeeIds: ["fee-1"], ratePlanIds: ["rate-1"] } });
contract("set-quote-upsells --clear removes every upsell", ["set-quote-upsells", "quote-1", "--clear"], { path: "/api/reservations/upsell/quote-1", body: { additionalFeeIds: [], ratePlanIds: [] } });
invalid("set-quote-upsells needs fees or --clear", ["set-quote-upsells", "quote-1", "--rate-plan", "rate-1"], /--fee \(repeatable\)/);
contract("metasearch-config reads the Google configuration", ["metasearch-config", "google"], { path: "/api/metasearch/pointofsale/google/config" });
contract("set-metasearch-config writes the URL template", ["set-metasearch-config", "google", "--url", "https://example.invalid/p/(PARTNER-HOTEL-ID)"], { path: "/api/metasearch/pointofsale/google/config", method: "PUT", body: { url: "https://example.invalid/p/(PARTNER-HOTEL-ID)" } });
invalid("metasearch config accepts only the documented point of sale", ["metasearch-config", "bing"], /only documented point of sale is google/);
invalid("set-metasearch-config requires a URL", ["set-metasearch-config", "google", "--url", "not a url"], /http or https URL/);
