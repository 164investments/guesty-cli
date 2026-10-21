import { Command, Option } from "commander";
import { bookingEngineFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { collect, date, dateRange, decimal, fields, integer, jsonObject, list, type QueryParams } from "./query-options.js";

// Guesty's Booking Engine API, the API behind direct-booking websites. It uses
// the cached beapi token, its own server and its own rate limits.
// https://booking-api-docs.guesty.com/reference

const PROPERTY_TYPES = ["APARTMENT", "HOUSE", "LOFT", "BOAT", "CAMPER_RV", "CONDOMINIUM", "CHALET", "BED_Breakfast", "VILLA",
  "TENT", "OTHER", "CABIN", "TOWNHOUSE", "BUNGALOW", "HUT", "DORM", "PARKING_SPACE", "PLANE", "TREEHOUSE", "YURT", "TIPI",
  "IGLOO", "EARTH_HOUSE", "ISLAND", "CAVE", "CASTLE", "STUDIO"];
const CURRENCIES = ["USD", "EUR", "AUD", "CAD", "JPY", "ILS", "GBP", "HKD", "NOK", "CZK", "BRL", "CHF", "THB", "ZAR", "MYR",
  "KRW", "IDR", "PHP", "INR", "NZD", "TWD", "PLN", "SGD", "TRY", "SEK", "VND", "ARS", "CNY", "DKK", "MXN"];
const RESERVED_UNTIL_HOURS = [-1, 12, 24, 36, 48, 72];

async function readObject(data?: string): Promise<Record<string, unknown>> {
  return jsonObject(data ?? await readStdin(), "--data or stdin");
}

function requireString(body: Record<string, unknown>, key: string): void {
  if (typeof body[key] !== "string" || !(body[key] as string).trim()) {
    throw new Error(`The request body needs ${key} as a nonempty string.`);
  }
}

// Reservation bodies share the documented guest shape and hold durations.
function validateReservation(body: Record<string, unknown>, required: string[]): void {
  for (const key of required) requireString(body, key);
  const guest = body.guest;
  if (!guest || typeof guest !== "object" || Array.isArray(guest)) {
    throw new Error("The request body needs a guest object with firstName, lastName, and email.");
  }
  for (const key of ["firstName", "lastName", "email"]) requireString(guest as Record<string, unknown>, key);
  if (body.reservedUntil !== undefined && !RESERVED_UNTIL_HOURS.includes(body.reservedUntil as number)) {
    throw new Error(`reservedUntil must be one of ${RESERVED_UNTIL_HOURS.join(", ")}.`);
  }
}

export const bookingEngine = new Command("booking-engine")
  .alias("be")
  .description("Booking Engine API for direct-booking sites: listings, quotes, reservations, upsells, reviews (cached beapi token)");

// ─── Listings ────────────────────────────────────────────────────────────────

bookingEngine
  .command("listings")
  .description("List the booking engine's listings; --check-in and --check-out make it an availability search")
  .option("--check-in <date>", "Available from this check-in date (YYYY-MM-DD; requires --check-out)")
  .option("--check-out <date>", "Available until this check-out date (YYYY-MM-DD; requires --check-in)")
  .option("--min-occupancy <n>", "Minimum guest capacity")
  .option("--bedrooms <n>", "Minimum number of bedrooms")
  .option("--bathrooms <n>", "Minimum number of bathrooms")
  .addOption(new Option("--property-type <type>", "Property type").choices(PROPERTY_TYPES))
  .addOption(new Option("--listing-type <type>", "Listing type").choices(["SINGLE", "MTL", "MTL_CHILD"]))
  .addOption(new Option("--room-type <type>", "Room type").choices(["PRIVATE_ROOM", "ENTIRE_HOME_APT", "SHARED_ROOM"]))
  .option("--min-price <amount>", "Minimum nightly price (requires --currency)")
  .option("--max-price <amount>", "Maximum nightly price (requires --currency)")
  .addOption(new Option("--currency <code>", "Currency of --min-price and --max-price").choices(CURRENCIES))
  .option("--include-amenities <list>", "Comma-separated amenities every listing must have, such as WIRELESS_INTERNET,HOT_TUB")
  .option("--exclude-amenities <list>", "Comma-separated amenities no listing may have")
  .option("--min-lng <degrees>", "Minimum longitude (-180 to 180)")
  .option("--max-lng <degrees>", "Maximum longitude (-180 to 180)")
  .option("--min-lat <degrees>", "Minimum latitude (-90 to 90)")
  .option("--max-lat <degrees>", "Maximum latitude (-90 to 90)")
  .option("--city <city>", "City from the listing address")
  .option("--country <country>", "Country from the listing address")
  .option("--state <state>", "State from the listing address")
  .option("--neighborhood <name>", "Neighborhood from the listing address")
  .option("--tag <tag>", "Listing tag; repeat to require several tags", collect, [])
  .option("--king-bed <n>", "Minimum number of king beds")
  .option("--queen-bed <n>", "Minimum number of queen beds")
  .option("--double-bed <n>", "Minimum number of double beds")
  .option("--single-bed <n>", "Minimum number of single beds")
  .option("--sofa-bed <n>", "Minimum number of sofa beds")
  .option("--air-mattress <n>", "Minimum number of air mattresses")
  .option("--bunk-bed <n>", "Minimum number of bunk beds")
  .option("--floor-mattress <n>", "Minimum number of floor mattresses")
  .option("--water-bed <n>", "Minimum number of water beds")
  .option("--toddler-bed <n>", "Minimum number of toddler beds")
  .option("--crib <n>", "Minimum number of cribs")
  .addOption(new Option("--pets-allowed <boolean>", "House rule: pets allowed").choices(["true", "false"]))
  .addOption(new Option("--smoking-allowed <boolean>", "House rule: smoking allowed").choices(["true", "false"]))
  .addOption(new Option("--suitable-for-events <boolean>", "House rule: suitable for events").choices(["true", "false"]))
  .addOption(new Option("--suitable-for-children <boolean>", "House rule: suitable for children").choices(["true", "false"]))
  .addOption(new Option("--suitable-for-infants <boolean>", "House rule: suitable for infants").choices(["true", "false"]))
  .option("--fields <fields>", "Listing fields to return (space- or comma-separated)")
  .option("--limit <n>", "Page size (1-100)", "20")
  .option("--cursor <cursor>", "Cursor from the previous page's response")
  .action(async (opts) => {
    if ((opts.checkIn === undefined) !== (opts.checkOut === undefined)) {
      throw new Error("Use --check-in and --check-out together for an availability search.");
    }
    if (opts.checkIn !== undefined) {
      date(opts.checkIn, "--check-in");
      date(opts.checkOut, "--check-out");
      dateRange(opts.checkIn, opts.checkOut, "--check-in", "--check-out");
    }
    if ((opts.minPrice !== undefined || opts.maxPrice !== undefined) && !opts.currency) {
      throw new Error("--min-price and --max-price need --currency.");
    }
    const params: QueryParams = { limit: integer(opts.limit, "--limit", 1, 100) };
    if (opts.checkIn) params.checkIn = opts.checkIn;
    if (opts.checkOut) params.checkOut = opts.checkOut;
    if (opts.minOccupancy !== undefined) params.minOccupancy = integer(opts.minOccupancy, "--min-occupancy", 1);
    if (opts.bedrooms !== undefined) params.numberOfBedrooms = integer(opts.bedrooms, "--bedrooms");
    if (opts.bathrooms !== undefined) params.numberOfBathrooms = integer(opts.bathrooms, "--bathrooms");
    if (opts.propertyType) params.propertyType = opts.propertyType;
    if (opts.listingType) params.listingType = opts.listingType;
    if (opts.roomType) params.roomType = opts.roomType;
    const minPrice = opts.minPrice === undefined ? undefined : decimal(opts.minPrice, "--min-price", 0);
    const maxPrice = opts.maxPrice === undefined ? undefined : decimal(opts.maxPrice, "--max-price", 1);
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) throw new Error("--min-price must not exceed --max-price.");
    if (minPrice !== undefined) params.minPrice = minPrice;
    if (maxPrice !== undefined) params.maxPrice = maxPrice;
    if (opts.currency) params.currency = opts.currency;
    if (opts.includeAmenities) params.includeAmenities = list(opts.includeAmenities, "--include-amenities").join(",");
    if (opts.excludeAmenities) params.excludeAmenities = list(opts.excludeAmenities, "--exclude-amenities").join(",");
    if (opts.minLng !== undefined) params.minLng = decimal(opts.minLng, "--min-lng", -180, 180);
    if (opts.maxLng !== undefined) params.maxLng = decimal(opts.maxLng, "--max-lng", -180, 180);
    if (opts.minLat !== undefined) params.minLat = decimal(opts.minLat, "--min-lat", -90, 90);
    if (opts.maxLat !== undefined) params.maxLat = decimal(opts.maxLat, "--max-lat", -90, 90);
    if (opts.city) params.city = opts.city;
    if (opts.country) params.country = opts.country;
    if (opts.state) params.state = opts.state;
    if (opts.neighborhood) params.neighborhood = opts.neighborhood;
    if (opts.tag.length) params.tags = opts.tag;
    const beds = { kingBed: "king-bed", queenBed: "queen-bed", doubleBed: "double-bed", singleBed: "single-bed", sofaBed: "sofa-bed",
      airMattress: "air-mattress", bunkBed: "bunk-bed", floorMattress: "floor-mattress", waterBed: "water-bed", toddlerBed: "toddler-bed", crib: "crib" };
    for (const [param, flag] of Object.entries(beds)) {
      if (opts[param] !== undefined) params[param] = integer(opts[param], `--${flag}`, 1);
    }
    for (const rule of ["petsAllowed", "smokingAllowed", "suitableForEvents", "suitableForChildren", "suitableForInfants"]) {
      if (opts[rule] !== undefined) params[rule] = opts[rule] === "true";
    }
    if (opts.fields) params.fields = fields(opts.fields);
    if (opts.cursor) params.cursor = opts.cursor;
    print(await bookingEngineFetch("/api/listings", { params }));
  });

bookingEngine
  .command("listing <listingId>")
  .description("Get one booking-engine listing")
  .option("--fields <fields>", "Listing fields to return (space- or comma-separated)")
  .action(async (listingId: string, opts) => {
    const params: QueryParams = {};
    if (opts.fields) params.fields = fields(opts.fields);
    print(await bookingEngineFetch(`/api/listings/${listingId}`, { params }));
  });

bookingEngine
  .command("cities")
  .description("List the cities, states, and countries of the booking engine's listings")
  .option("--search <text>", "Case-insensitive text in the city name")
  .option("--limit <n>", "Max results (1-100)", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const params: QueryParams = { limit: integer(opts.limit, "--limit", 1, 100), skip: integer(opts.skip, "--skip") };
    if (opts.search) params.searchText = opts.search;
    print(await bookingEngineFetch("/api/listings/cities", { params }));
  });

bookingEngine
  .command("calendar <listingId>")
  .description("Get a listing's availability calendar for a date range")
  .requiredOption("--from <date>", "First date (YYYY-MM-DD)")
  .requiredOption("--to <date>", "Last date (YYYY-MM-DD)")
  .action(async (listingId: string, opts) => {
    dateRange(date(opts.from, "--from"), date(opts.to, "--to"));
    print(await bookingEngineFetch(`/api/listings/${listingId}/calendar`, { params: { from: opts.from, to: opts.to } }));
  });

bookingEngine
  .command("payment-provider <listingId>")
  .description("Get the payment provider a listing uses for booking-engine payments")
  .action(async (listingId: string) => {
    print(await bookingEngineFetch(`/api/listings/${listingId}/payment-provider`));
  });

// ─── Reservation quotes ──────────────────────────────────────────────────────

bookingEngine
  .command("create-quote")
  .description("Create a reservation quote that holds price and rate plans (flags, --data, or stdin)")
  .option("--listing <id>", "Listing ID")
  .option("--check-in <date>", "Check-in date in the listing's time zone (YYYY-MM-DD)")
  .option("--check-out <date>", "Check-out date in the listing's time zone (YYYY-MM-DD)")
  .option("--guests <n>", "Total number of guests")
  .option("--adults <n>", "Number of adults (at least 1) for the guest breakdown")
  .option("--children <n>", "Number of children for the guest breakdown")
  .option("--infants <n>", "Number of infants for the guest breakdown")
  .option("--pets <n>", "Number of pets for the guest breakdown")
  .option("--coupon <code>", "Coupon code; repeat for several", collect, [])
  .option("--data <json>", "JSON body instead of flags")
  .action(async (opts) => {
    const flagged = [opts.listing, opts.checkIn, opts.checkOut, opts.guests, opts.adults, opts.children, opts.infants, opts.pets]
      .some((value) => value !== undefined) || opts.coupon.length > 0;
    if (flagged && opts.data !== undefined) throw new Error("Use flags or --data, not both.");
    let body: Record<string, unknown>;
    if (flagged) {
      body = { listingId: opts.listing, checkInDateLocalized: opts.checkIn, checkOutDateLocalized: opts.checkOut };
      if (opts.guests !== undefined) body.guestsCount = integer(opts.guests, "--guests", 1);
      const breakdown = { numberOfAdults: opts.adults, numberOfChildren: opts.children, numberOfInfants: opts.infants, numberOfPets: opts.pets };
      if (Object.values(breakdown).some((value) => value !== undefined)) {
        if (opts.adults === undefined) throw new Error("A guest breakdown needs --adults.");
        body.numberOfGuests = Object.fromEntries(Object.entries(breakdown).filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, integer(value as string, `--${key.slice(8).toLowerCase()}`, key === "numberOfAdults" ? 1 : 0)]));
      }
      if (opts.coupon.length) body.coupons = opts.coupon.join(",");
    } else {
      body = await readObject(opts.data);
    }
    for (const key of ["listingId", "checkInDateLocalized", "checkOutDateLocalized"]) requireString(body, key);
    const checkIn = date(body.checkInDateLocalized as string, "checkInDateLocalized");
    const checkOut = date(body.checkOutDateLocalized as string, "checkOutDateLocalized");
    if (checkIn >= checkOut) throw new Error("checkOutDateLocalized must be after checkInDateLocalized.");
    if (!Number.isSafeInteger(body.guestsCount) || (body.guestsCount as number) < 1) {
      throw new Error("The request body needs guestsCount as a positive integer (--guests).");
    }
    print(await bookingEngineFetch("/api/reservations/quotes", { method: "POST", body }));
  });

bookingEngine
  .command("quote <quoteId>")
  .description("Get a reservation quote")
  .action(async (quoteId: string) => {
    print(await bookingEngineFetch(`/api/reservations/quotes/${quoteId}`));
  });

bookingEngine
  .command("set-quote-coupons <quoteId>")
  .description("Replace a quote's coupons; --clear removes them all")
  .option("--coupon <code>", "Coupon code; repeat for several", collect, [])
  .option("--clear", "Remove every coupon from the quote")
  .action(async (quoteId: string, opts) => {
    if (Boolean(opts.clear) === (opts.coupon.length > 0)) throw new Error("Use --coupon (repeatable) or --clear.");
    print(await bookingEngineFetch(`/api/reservations/quotes/${quoteId}/coupons`, { method: "POST", body: { coupons: opts.coupon } }));
  });

bookingEngine
  .command("create-instant-reservation <quoteId>")
  .description("Book a quote instantly with a tokenized card (--data or stdin: ratePlanId, ccToken, guest)")
  .option("--data <json>", "JSON body")
  .action(async (quoteId: string, opts) => {
    const body = await readObject(opts.data);
    validateReservation(body, ["ratePlanId", "ccToken"]);
    print(await bookingEngineFetch(`/api/reservations/quotes/${quoteId}/instant`, { method: "POST", body }));
  });

bookingEngine
  .command("create-inquiry-reservation <quoteId>")
  .description("Request to book a quote for the host to confirm (--data or stdin: ratePlanId, guest)")
  .option("--data <json>", "JSON body")
  .action(async (quoteId: string, opts) => {
    const body = await readObject(opts.data);
    validateReservation(body, ["ratePlanId"]);
    print(await bookingEngineFetch(`/api/reservations/quotes/${quoteId}/inquiry`, { method: "POST", body }));
  });

bookingEngine
  .command("create-instant-charge-reservation <quoteId>")
  .description("Charge first, then book a quote (--data or stdin: ratePlanId, guest, and confirmationToken or initialPaymentMethodId)")
  .option("--data <json>", "JSON body")
  .action(async (quoteId: string, opts) => {
    const body = await readObject(opts.data);
    validateReservation(body, ["ratePlanId"]);
    // The schema marks confirmationToken required, but both field descriptions
    // say exactly one of the two is required: Stripe or GuestyPay.
    const tokens = ["confirmationToken", "initialPaymentMethodId"].filter((key) => body[key] !== undefined);
    if (tokens.length !== 1) throw new Error("The request body needs exactly one of confirmationToken (Stripe) or initialPaymentMethodId (GuestyPay).");
    requireString(body, tokens[0]);
    if (body.reuse !== undefined && typeof body.reuse !== "boolean") throw new Error("reuse must be true or false.");
    print(await bookingEngineFetch(`/api/reservations/quotes/${quoteId}/instant-charge`, { method: "POST", body }));
  });

bookingEngine
  .command("reservation <reservationId>")
  .description("Get a reservation created from a quote")
  .action(async (reservationId: string) => {
    print(await bookingEngineFetch(`/api/reservations/${reservationId}/details`));
  });

bookingEngine
  .command("verify-payment <reservationId>")
  .description("Verify a PENDING_AUTH GuestyPay charge after create-instant-charge-reservation (--payment or --data)")
  .option("--payment <id>", "Payment ID from the PENDING_AUTH payment")
  .option("--data <json>", "JSON body with paymentId and optional threeDSResult")
  .action(async (reservationId: string, opts) => {
    if (opts.payment !== undefined && opts.data !== undefined) throw new Error("Use --payment or --data, not both.");
    const body: Record<string, unknown> = opts.payment !== undefined ? { paymentId: opts.payment } : await readObject(opts.data);
    requireString(body, "paymentId");
    if (body.threeDSResult !== undefined && (!body.threeDSResult || typeof body.threeDSResult !== "object" || Array.isArray(body.threeDSResult))) {
      throw new Error("threeDSResult must be an object.");
    }
    print(await bookingEngineFetch(`/api/reservations/${reservationId}/verify-payment`, { method: "POST", body }));
  });

// ─── Payouts, reviews, upsells, metasearch ───────────────────────────────────

bookingEngine
  .command("payouts-schedule")
  .description("Get the payment schedule a guest would pay for a stay")
  .requiredOption("--listing <id>", "Listing ID")
  .requiredOption("--check-in <date>", "Check-in date (YYYY-MM-DD)")
  .requiredOption("--check-out <date>", "Check-out date (YYYY-MM-DD)")
  .requiredOption("--total <amount>", "Total stay amount")
  .addOption(new Option("--booking-type <type>", "Booking type").choices(["INQUIRY", "INSTANT"]).makeOptionMandatory())
  .action(async (opts) => {
    dateRange(date(opts.checkIn, "--check-in"), date(opts.checkOut, "--check-out"), "--check-in", "--check-out");
    const params: QueryParams = {
      listingId: opts.listing, checkIn: opts.checkIn, checkOut: opts.checkOut, total: decimal(opts.total, "--total", 0), bookingType: opts.bookingType,
    };
    print(await bookingEngineFetch("/api/reservations/payouts/list", { params }));
  });

bookingEngine
  .command("reviews")
  .description("List reviews of the booking engine's listings")
  .option("--listing <id>", "Guesty listing ID")
  .option("--reservation <id>", "Guesty reservation ID")
  .addOption(new Option("--channel <channel>", "Review channel").choices(["airbnb2", "bookingCom"]))
  .option("--external-reservation <id>", "Channel reservation ID")
  .option("--external-review <id>", "Channel review ID; Guesty then ignores the other filters")
  .option("--from <date-time>", "Start date-time")
  .option("--to <date-time>", "End date-time")
  .option("--limit <n>", "Max results (1-100)", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    dateRange(opts.from, opts.to);
    const params: QueryParams = { limit: integer(opts.limit, "--limit", 1, 100), skip: integer(opts.skip, "--skip") };
    if (opts.listing) params.listingId = opts.listing;
    if (opts.reservation) params.reservationId = opts.reservation;
    if (opts.channel) params.channelId = opts.channel;
    if (opts.externalReservation) params.externalReservationId = opts.externalReservation;
    if (opts.externalReview) params.externalReviewId = opts.externalReview;
    if (opts.from) params.startDate = opts.from;
    if (opts.to) params.endDate = opts.to;
    print(await bookingEngineFetch("/api/reviews", { params }));
  });

bookingEngine
  .command("upsell-fees <inquiryId> <listingId>")
  .description("[Pilot] List upsells for a quote; use the selected rate plan's inquiryId, not the quote ID")
  .action(async (inquiryId: string, listingId: string) => {
    print(await bookingEngineFetch(`/api/reservations/upsell/${inquiryId}/${listingId}/fee`));
  });

bookingEngine
  .command("set-quote-upsells <quoteId>")
  .description("[Pilot] Replace a quote's upsells with the given fees and rate plans; --clear removes them")
  .option("--fee <id>", "Additional fee ID; repeat for several", collect, [])
  .option("--rate-plan <id>", "Rate plan ID; repeat for several", collect, [])
  .option("--clear", "Remove every upsell from the quote")
  .action(async (quoteId: string, opts) => {
    if (opts.clear && (opts.fee.length || opts.ratePlan.length)) throw new Error("Use --clear without --fee or --rate-plan.");
    if (!opts.clear && !opts.fee.length) throw new Error("Use --fee (repeatable) with --rate-plan, or --clear.");
    const body = { additionalFeeIds: opts.fee, ratePlanIds: opts.ratePlan };
    print(await bookingEngineFetch(`/api/reservations/upsell/${quoteId}`, { method: "POST", body }));
  });

bookingEngine
  .command("metasearch-config <pointOfSale>")
  .description("Get the metasearch configuration for a point of sale (google)")
  .action(async (pointOfSale: string) => {
    if (pointOfSale !== "google") throw new Error("The only documented point of sale is google.");
    print(await bookingEngineFetch(`/api/metasearch/pointofsale/${pointOfSale}/config`));
  });

bookingEngine
  .command("set-metasearch-config <pointOfSale>")
  .description("Create or replace the metasearch property-page URL template for a point of sale (google)")
  .requiredOption("--url <template>", "Property page URL template, such as https://example.com/properties/(PARTNER-HOTEL-ID)?checkIn=...")
  .action(async (pointOfSale: string, opts) => {
    if (pointOfSale !== "google") throw new Error("The only documented point of sale is google.");
    if (!/^https?:\/\/\S+$/.test(opts.url)) throw new Error("--url must be an http or https URL template.");
    print(await bookingEngineFetch(`/api/metasearch/pointofsale/${pointOfSale}/config`, { method: "PUT", body: { url: opts.url } }));
  });
