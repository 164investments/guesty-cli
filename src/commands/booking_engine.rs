//! Port of src/commands/booking-engine.ts.

use crate::bail;
use crate::cli::{Command, Opt};
use crate::client::{BookingFetch, Params, booking_engine_fetch};
use crate::commands::query_options::{
    collect, date, date_range, date_range_named, decimal, empty_list, fields, integer, integer_in, js_trim,
    json_object, list,
};
use crate::error::Result;
use crate::json::{self, Json, Map};
use crate::output::print;
use crate::stdin;

// Guesty's Booking Engine API, the API behind direct-booking websites. It uses
// the cached beapi token, its own server and its own rate limits.
// https://booking-api-docs.guesty.com/reference

const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;

#[rustfmt::skip]
const PROPERTY_TYPES: [&str; 27] = [
    "APARTMENT", "HOUSE", "LOFT", "BOAT", "CAMPER_RV", "CONDOMINIUM", "CHALET", "BED_Breakfast", "VILLA", "TENT",
    "OTHER", "CABIN", "TOWNHOUSE", "BUNGALOW", "HUT", "DORM", "PARKING_SPACE", "PLANE", "TREEHOUSE", "YURT", "TIPI",
    "IGLOO", "EARTH_HOUSE", "ISLAND", "CAVE", "CASTLE", "STUDIO",
];
#[rustfmt::skip]
const CURRENCIES: [&str; 30] = [
    "USD", "EUR", "AUD", "CAD", "JPY", "ILS", "GBP", "HKD", "NOK", "CZK", "BRL", "CHF", "THB", "ZAR", "MYR", "KRW",
    "IDR", "PHP", "INR", "NZD", "TWD", "PLN", "SGD", "TRY", "SEK", "VND", "ARS", "CNY", "DKK", "MXN",
];
const RESERVED_UNTIL_HOURS: [f64; 6] = [-1.0, 12.0, 24.0, 36.0, 48.0, 72.0];

type Body = Map<String, Json>;

fn read_object(data: Option<&str>) -> Result<Body> {
    let text = match data {
        Some(d) => d.to_string(),
        None => stdin::read()?,
    };
    json_object(&text, "--data or stdin")
}

fn require_string(body: &Body, key: &str) -> Result<()> {
    if !matches!(body.get(key), Some(Json::String(s)) if !js_trim(s).is_empty()) {
        bail!("The request body needs {key} as a nonempty string.");
    }
    Ok(())
}

// Reservation bodies share the documented guest shape and hold durations.
fn validate_reservation(body: &Body, required: &[&str]) -> Result<()> {
    for key in required {
        require_string(body, key)?;
    }
    let Some(guest) = body.get("guest").and_then(Json::as_object) else {
        bail!("The request body needs a guest object with firstName, lastName, and email.");
    };
    for key in ["firstName", "lastName", "email"] {
        require_string(guest, key)?;
    }
    if let Some(reserved) = body.get("reservedUntil") {
        if !reserved.as_f64().is_some_and(|h| RESERVED_UNTIL_HOURS.contains(&h)) {
            let hours: Vec<String> = RESERVED_UNTIL_HOURS.iter().map(|h| json::number_to_string(*h, false)).collect();
            bail!("reservedUntil must be one of {}.", hours.join(", "));
        }
    }
    Ok(())
}

/// JavaScript's `\s`.
fn js_space(c: char) -> bool {
    matches!(c, '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2000}'..='\u{200a}')
        || matches!(c, '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}')
}

/// `/^https?:\/\/\S+$/`.
fn http_url_template(value: &str) -> bool {
    let rest = value.strip_prefix("https://").or_else(|| value.strip_prefix("http://"));
    rest.is_some_and(|r| !r.is_empty() && !r.chars().any(js_space))
}

fn fetch(path: &str, options: BookingFetch) -> Result<()> {
    print(&booking_engine_fetch(path, options)?);
    Ok(())
}

fn get_with(path: &str, params: Params) -> Result<()> {
    fetch(path, BookingFetch { params: Some(params), ..BookingFetch::default() })
}

fn post(path: &str, method: &'static str, body: Json) -> Result<()> {
    fetch(path, BookingFetch { method, body: Some(body), ..BookingFetch::default() })
}

fn listings_command() -> Command {
    let mut cmd = Command::new("listings")
        .description("List the booking engine's listings; --check-in and --check-out make it an availability search")
        .option("--check-in <date>", "Available from this check-in date (YYYY-MM-DD; requires --check-out)")
        .option("--check-out <date>", "Available until this check-out date (YYYY-MM-DD; requires --check-in)")
        .option("--min-occupancy <n>", "Minimum guest capacity")
        .option("--bedrooms <n>", "Minimum number of bedrooms")
        .option("--bathrooms <n>", "Minimum number of bathrooms")
        .add_option(Opt::new("--property-type <type>", "Property type").choices(&PROPERTY_TYPES))
        .add_option(Opt::new("--listing-type <type>", "Listing type").choices(&["SINGLE", "MTL", "MTL_CHILD"]))
        .add_option(Opt::new("--room-type <type>", "Room type").choices(&[
            "PRIVATE_ROOM",
            "ENTIRE_HOME_APT",
            "SHARED_ROOM",
        ]))
        .option("--min-price <amount>", "Minimum nightly price (requires --currency)")
        .option("--max-price <amount>", "Maximum nightly price (requires --currency)")
        .add_option(Opt::new("--currency <code>", "Currency of --min-price and --max-price").choices(&CURRENCIES))
        .option(
            "--include-amenities <list>",
            "Comma-separated amenities every listing must have, such as WIRELESS_INTERNET,HOT_TUB",
        )
        .option("--exclude-amenities <list>", "Comma-separated amenities no listing may have")
        .option("--min-lng <degrees>", "Minimum longitude (-180 to 180)")
        .option("--max-lng <degrees>", "Maximum longitude (-180 to 180)")
        .option("--min-lat <degrees>", "Minimum latitude (-90 to 90)")
        .option("--max-lat <degrees>", "Maximum latitude (-90 to 90)")
        .option("--city <city>", "City from the listing address")
        .option("--country <country>", "Country from the listing address")
        .option("--state <state>", "State from the listing address")
        .option("--neighborhood <name>", "Neighborhood from the listing address")
        .option_parsed("--tag <tag>", "Listing tag; repeat to require several tags", collect, empty_list());
    for (flag, what) in BEDS {
        cmd = cmd.option(&format!("--{flag} <n>"), &format!("Minimum number of {what}"));
    }
    for (flag, what) in RULES {
        cmd = cmd.add_option(Opt::new(&format!("--{flag} <boolean>"), what).choices(&["true", "false"]));
    }
    cmd.option("--fields <fields>", "Listing fields to return (space- or comma-separated)")
        .option_default("--limit <n>", "Page size (1-100)", "20")
        .option("--cursor <cursor>", "Cursor from the previous page's response")
        .action(|c| {
            let o = &c.opts;
            let (check_in, check_out) = (o.str("checkIn"), o.str("checkOut"));
            if check_in.is_some() != check_out.is_some() {
                bail!("Use --check-in and --check-out together for an availability search.");
            }
            if let (Some(check_in), Some(check_out)) = (check_in, check_out) {
                date(check_in, "--check-in")?;
                date(check_out, "--check-out")?;
                date_range_named(Some(check_in), Some(check_out), "--check-in", "--check-out")?;
            }
            if (o.has("minPrice") || o.has("maxPrice")) && !o.flag("currency") {
                bail!("--min-price and --max-price need --currency.");
            }
            let mut params = Params::new();
            params.set("limit", integer_in(o.str("limit").unwrap_or_default(), "--limit", 1.0, 100.0)?);
            if let Some(v) = check_in.filter(|s| !s.is_empty()) {
                params.set("checkIn", v);
            }
            if let Some(v) = check_out.filter(|s| !s.is_empty()) {
                params.set("checkOut", v);
            }
            if let Some(v) = o.str("minOccupancy") {
                params.set("minOccupancy", integer_in(v, "--min-occupancy", 1.0, MAX_SAFE_INTEGER)?);
            }
            if let Some(v) = o.str("bedrooms") {
                params.set("numberOfBedrooms", integer(v, "--bedrooms")?);
            }
            if let Some(v) = o.str("bathrooms") {
                params.set("numberOfBathrooms", integer(v, "--bathrooms")?);
            }
            for key in ["propertyType", "listingType", "roomType"] {
                if let Some(v) = o.str(key).filter(|s| !s.is_empty()) {
                    params.set(key, v);
                }
            }
            let min_price = o.str("minPrice").map(|v| decimal(v, "--min-price", 0.0, f64::INFINITY)).transpose()?;
            let max_price = o.str("maxPrice").map(|v| decimal(v, "--max-price", 1.0, f64::INFINITY)).transpose()?;
            if let (Some(min), Some(max)) = (min_price, max_price) {
                if min > max {
                    bail!("--min-price must not exceed --max-price.");
                }
            }
            if let Some(v) = min_price {
                params.set("minPrice", v);
            }
            if let Some(v) = max_price {
                params.set("maxPrice", v);
            }
            if let Some(v) = o.str("currency").filter(|s| !s.is_empty()) {
                params.set("currency", v);
            }
            if let Some(v) = o.str("includeAmenities").filter(|s| !s.is_empty()) {
                params.set("includeAmenities", list(v, "--include-amenities")?.join(","));
            }
            if let Some(v) = o.str("excludeAmenities").filter(|s| !s.is_empty()) {
                params.set("excludeAmenities", list(v, "--exclude-amenities")?.join(","));
            }
            for (key, flag, limit) in [
                ("minLng", "--min-lng", 180.0),
                ("maxLng", "--max-lng", 180.0),
                ("minLat", "--min-lat", 90.0),
                ("maxLat", "--max-lat", 90.0),
            ] {
                if let Some(v) = o.str(key) {
                    params.set(key, decimal(v, flag, -limit, limit)?);
                }
            }
            for key in ["city", "country", "state", "neighborhood"] {
                if let Some(v) = o.str(key).filter(|s| !s.is_empty()) {
                    params.set(key, v);
                }
            }
            if !o.list("tag").is_empty() {
                params.set("tags", o.list("tag"));
            }
            for (flag, _) in BEDS {
                let key = camel(flag);
                if let Some(v) = o.str(&key) {
                    params.set(&key, integer_in(v, &format!("--{flag}"), 1.0, MAX_SAFE_INTEGER)?);
                }
            }
            for (flag, _) in RULES {
                let key = camel(flag);
                if let Some(v) = o.str(&key) {
                    params.set(&key, v == "true");
                }
            }
            if let Some(v) = o.str("fields").filter(|s| !s.is_empty()) {
                params.set("fields", fields(v)?);
            }
            if let Some(v) = o.str("cursor").filter(|s| !s.is_empty()) {
                params.set("cursor", v);
            }
            get_with("/api/listings", params)
        })
}

/// Bed counts: flag and the noun its description uses.
const BEDS: [(&str, &str); 11] = [
    ("king-bed", "king beds"),
    ("queen-bed", "queen beds"),
    ("double-bed", "double beds"),
    ("single-bed", "single beds"),
    ("sofa-bed", "sofa beds"),
    ("air-mattress", "air mattresses"),
    ("bunk-bed", "bunk beds"),
    ("floor-mattress", "floor mattresses"),
    ("water-bed", "water beds"),
    ("toddler-bed", "toddler beds"),
    ("crib", "cribs"),
];

/// House rules: flag and description.
const RULES: [(&str, &str); 5] = [
    ("pets-allowed", "House rule: pets allowed"),
    ("smoking-allowed", "House rule: smoking allowed"),
    ("suitable-for-events", "House rule: suitable for events"),
    ("suitable-for-children", "House rule: suitable for children"),
    ("suitable-for-infants", "House rule: suitable for infants"),
];

/// `king-bed` → `kingBed`, as commander names the attribute.
fn camel(flag: &str) -> String {
    let mut out = String::new();
    let mut upper = false;
    for ch in flag.chars() {
        if ch == '-' {
            upper = true;
        } else if upper {
            out.extend(ch.to_uppercase());
            upper = false;
        } else {
            out.push(ch);
        }
    }
    out
}

fn create_quote_command() -> Command {
    Command::new("create-quote")
        .description("Create a reservation quote that holds price and rate plans (flags, --data, or stdin)")
        .option("--listing <id>", "Listing ID")
        .option("--check-in <date>", "Check-in date in the listing's time zone (YYYY-MM-DD)")
        .option("--check-out <date>", "Check-out date in the listing's time zone (YYYY-MM-DD)")
        .option("--guests <n>", "Total number of guests")
        .option("--adults <n>", "Number of adults (at least 1) for the guest breakdown")
        .option("--children <n>", "Number of children for the guest breakdown")
        .option("--infants <n>", "Number of infants for the guest breakdown")
        .option("--pets <n>", "Number of pets for the guest breakdown")
        .option_parsed("--coupon <code>", "Coupon code; repeat for several", collect, empty_list())
        .option("--data <json>", "JSON body instead of flags")
        .action(|c| {
            let o = &c.opts;
            let flagged = ["listing", "checkIn", "checkOut", "guests", "adults", "children", "infants", "pets"]
                .iter()
                .any(|k| o.has(k))
                || !o.list("coupon").is_empty();
            if flagged && o.has("data") {
                bail!("Use flags or --data, not both.");
            }
            let body = if flagged {
                // JSON.stringify drops undefined values; the checks below need all three anyway.
                let mut body = Body::new();
                for (key, opt) in [
                    ("listingId", "listing"),
                    ("checkInDateLocalized", "checkIn"),
                    ("checkOutDateLocalized", "checkOut"),
                ] {
                    if let Some(v) = o.str(opt) {
                        body.insert(key.into(), Json::String(v.to_string()));
                    }
                }
                if let Some(v) = o.str("guests") {
                    body.insert("guestsCount".into(), json::number(integer_in(v, "--guests", 1.0, MAX_SAFE_INTEGER)?));
                }
                let breakdown = [
                    ("numberOfAdults", "adults", 1.0),
                    ("numberOfChildren", "children", 0.0),
                    ("numberOfInfants", "infants", 0.0),
                    ("numberOfPets", "pets", 0.0),
                ];
                if breakdown.iter().any(|(_, opt, _)| o.has(opt)) {
                    if !o.has("adults") {
                        bail!("A guest breakdown needs --adults.");
                    }
                    let mut guests = Body::new();
                    for (key, opt, minimum) in breakdown {
                        if let Some(v) = o.str(opt) {
                            let n = integer_in(v, &format!("--{opt}"), minimum, MAX_SAFE_INTEGER)?;
                            guests.insert(key.into(), json::number(n));
                        }
                    }
                    body.insert("numberOfGuests".into(), Json::Object(guests));
                }
                if !o.list("coupon").is_empty() {
                    body.insert("coupons".into(), Json::String(o.list("coupon").join(",")));
                }
                body
            } else {
                read_object(o.str("data"))?
            };
            for key in ["listingId", "checkInDateLocalized", "checkOutDateLocalized"] {
                require_string(&body, key)?;
            }
            let text = |key: &str| body.get(key).and_then(Json::as_str).unwrap_or_default();
            let check_in = date(text("checkInDateLocalized"), "checkInDateLocalized")?;
            let check_out = date(text("checkOutDateLocalized"), "checkOutDateLocalized")?;
            // String comparison, as in JavaScript (UTF-16 order matches for these ASCII dates).
            if check_in >= check_out {
                bail!("checkOutDateLocalized must be after checkInDateLocalized.");
            }
            let guests = body.get("guestsCount").and_then(Json::as_f64);
            if !guests.is_some_and(|g| g.fract() == 0.0 && g.abs() <= MAX_SAFE_INTEGER && g >= 1.0) {
                bail!("The request body needs guestsCount as a positive integer (--guests).");
            }
            post("/api/reservations/quotes", "POST", Json::Object(body))
        })
}

fn reservation_command(
    spec: &str,
    description: &str,
    suffix: &'static str,
    required: &'static [&'static str],
) -> Command {
    Command::new(spec).description(description).option("--data <json>", "JSON body").action(move |c| {
        let body = read_object(c.opts.str("data"))?;
        validate_reservation(&body, required)?;
        post(&format!("/api/reservations/quotes/{}/{suffix}", c.arg(0)), "POST", Json::Object(body))
    })
}

pub fn command() -> Command {
    Command::new("booking-engine")
        .alias("be")
        .description("Booking Engine API for direct-booking sites: listings, quotes, reservations, upsells, reviews (cached beapi token)")
        // ─── Listings ────────────────────────────────────────────────────────
        .command(listings_command())
        .command(
            Command::new("listing <listingId>")
                .description("Get one booking-engine listing")
                .option("--fields <fields>", "Listing fields to return (space- or comma-separated)")
                .action(|c| {
                    let mut params = Params::new();
                    if let Some(v) = c.opts.str("fields").filter(|s| !s.is_empty()) {
                        params.set("fields", fields(v)?);
                    }
                    get_with(&format!("/api/listings/{}", c.arg(0)), params)
                }),
        )
        .command(
            Command::new("cities")
                .description("List the cities, states, and countries of the booking engine's listings")
                .option("--search <text>", "Case-insensitive text in the city name")
                .option_default("--limit <n>", "Max results (1-100)", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let o = &c.opts;
                    let mut params = Params::new();
                    params.set("limit", integer_in(o.str("limit").unwrap_or_default(), "--limit", 1.0, 100.0)?);
                    params.set("skip", integer(o.str("skip").unwrap_or_default(), "--skip")?);
                    if let Some(v) = o.str("search").filter(|s| !s.is_empty()) {
                        params.set("searchText", v);
                    }
                    get_with("/api/listings/cities", params)
                }),
        )
        .command(
            Command::new("calendar <listingId>")
                .description("Get a listing's availability calendar for a date range")
                .required_option("--from <date>", "First date (YYYY-MM-DD)")
                .required_option("--to <date>", "Last date (YYYY-MM-DD)")
                .action(|c| {
                    let (from, to) = (c.opts.str("from").unwrap_or_default(), c.opts.str("to").unwrap_or_default());
                    let from_date = date(from, "--from")?;
                    let to_date = date(to, "--to")?;
                    date_range(Some(&from_date), Some(&to_date))?;
                    let mut params = Params::new();
                    params.set("from", from).set("to", to);
                    get_with(&format!("/api/listings/{}/calendar", c.arg(0)), params)
                }),
        )
        .command(
            Command::new("payment-provider <listingId>")
                .description("Get the payment provider a listing uses for booking-engine payments")
                .action(|c| fetch(&format!("/api/listings/{}/payment-provider", c.arg(0)), BookingFetch::default())),
        )
        // ─── Reservation quotes ──────────────────────────────────────────────
        .command(create_quote_command())
        .command(
            Command::new("quote <quoteId>")
                .description("Get a reservation quote")
                .action(|c| fetch(&format!("/api/reservations/quotes/{}", c.arg(0)), BookingFetch::default())),
        )
        .command(
            Command::new("set-quote-coupons <quoteId>")
                .description("Replace a quote's coupons; --clear removes them all")
                .option_parsed("--coupon <code>", "Coupon code; repeat for several", collect, empty_list())
                .option("--clear", "Remove every coupon from the quote")
                .action(|c| {
                    let coupons = c.opts.list("coupon");
                    if c.opts.flag("clear") == !coupons.is_empty() {
                        bail!("Use --coupon (repeatable) or --clear.");
                    }
                    let body = json::json!({ "coupons": coupons });
                    post(&format!("/api/reservations/quotes/{}/coupons", c.arg(0)), "POST", body)
                }),
        )
        .command(reservation_command(
            "create-instant-reservation <quoteId>",
            "Book a quote instantly with a tokenized card (--data or stdin: ratePlanId, ccToken, guest)",
            "instant",
            &["ratePlanId", "ccToken"],
        ))
        .command(reservation_command(
            "create-inquiry-reservation <quoteId>",
            "Request to book a quote for the host to confirm (--data or stdin: ratePlanId, guest)",
            "inquiry",
            &["ratePlanId"],
        ))
        .command(
            Command::new("create-instant-charge-reservation <quoteId>")
                .description("Charge first, then book a quote (--data or stdin: ratePlanId, guest, and confirmationToken or initialPaymentMethodId)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = read_object(c.opts.str("data"))?;
                    validate_reservation(&body, &["ratePlanId"])?;
                    // The schema marks confirmationToken required, but both field descriptions
                    // say exactly one of the two is required: Stripe or GuestyPay.
                    let tokens: Vec<&str> =
                        ["confirmationToken", "initialPaymentMethodId"].into_iter().filter(|k| body.contains_key(*k)).collect();
                    if tokens.len() != 1 {
                        bail!("The request body needs exactly one of confirmationToken (Stripe) or initialPaymentMethodId (GuestyPay).");
                    }
                    require_string(&body, tokens[0])?;
                    if body.get("reuse").is_some_and(|r| !r.is_boolean()) {
                        bail!("reuse must be true or false.");
                    }
                    post(&format!("/api/reservations/quotes/{}/instant-charge", c.arg(0)), "POST", Json::Object(body))
                }),
        )
        .command(
            Command::new("reservation <reservationId>")
                .description("Get a reservation created from a quote")
                .action(|c| fetch(&format!("/api/reservations/{}/details", c.arg(0)), BookingFetch::default())),
        )
        .command(
            Command::new("verify-payment <reservationId>")
                .description("Verify a PENDING_AUTH GuestyPay charge after create-instant-charge-reservation (--payment or --data)")
                .option("--payment <id>", "Payment ID from the PENDING_AUTH payment")
                .option("--data <json>", "JSON body with paymentId and optional threeDSResult")
                .action(|c| {
                    if c.opts.has("payment") && c.opts.has("data") {
                        bail!("Use --payment or --data, not both.");
                    }
                    let body = match c.opts.str("payment") {
                        Some(payment) => {
                            let mut body = Body::new();
                            body.insert("paymentId".into(), Json::String(payment.to_string()));
                            body
                        }
                        None => read_object(c.opts.str("data"))?,
                    };
                    require_string(&body, "paymentId")?;
                    if body.get("threeDSResult").is_some_and(|r| !r.is_object()) {
                        bail!("threeDSResult must be an object.");
                    }
                    post(&format!("/api/reservations/{}/verify-payment", c.arg(0)), "POST", Json::Object(body))
                }),
        )
        // ─── Payouts, reviews, upsells, metasearch ───────────────────────────
        .command(
            Command::new("payouts-schedule")
                .description("Get the payment schedule a guest would pay for a stay")
                .required_option("--listing <id>", "Listing ID")
                .required_option("--check-in <date>", "Check-in date (YYYY-MM-DD)")
                .required_option("--check-out <date>", "Check-out date (YYYY-MM-DD)")
                .required_option("--total <amount>", "Total stay amount")
                .add_option(Opt::new("--booking-type <type>", "Booking type").choices(&["INQUIRY", "INSTANT"]).mandatory())
                .action(|c| {
                    let o = &c.opts;
                    let (check_in, check_out) = (o.str("checkIn").unwrap_or_default(), o.str("checkOut").unwrap_or_default());
                    let check_in_date = date(check_in, "--check-in")?;
                    let check_out_date = date(check_out, "--check-out")?;
                    date_range_named(Some(&check_in_date), Some(&check_out_date), "--check-in", "--check-out")?;
                    let mut params = Params::new();
                    params.set("listingId", o.str("listing").unwrap_or_default());
                    params.set("checkIn", check_in).set("checkOut", check_out);
                    params.set("total", decimal(o.str("total").unwrap_or_default(), "--total", 0.0, f64::INFINITY)?);
                    params.set("bookingType", o.str("bookingType").unwrap_or_default());
                    get_with("/api/reservations/payouts/list", params)
                }),
        )
        .command(
            Command::new("reviews")
                .description("List reviews of the booking engine's listings")
                .option("--listing <id>", "Guesty listing ID")
                .option("--reservation <id>", "Guesty reservation ID")
                .add_option(Opt::new("--channel <channel>", "Review channel").choices(&["airbnb2", "bookingCom"]))
                .option("--external-reservation <id>", "Channel reservation ID")
                .option("--external-review <id>", "Channel review ID; Guesty then ignores the other filters")
                .option("--from <date-time>", "Start date-time")
                .option("--to <date-time>", "End date-time")
                .option_default("--limit <n>", "Max results (1-100)", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let o = &c.opts;
                    date_range(o.str("from"), o.str("to"))?;
                    let mut params = Params::new();
                    params.set("limit", integer_in(o.str("limit").unwrap_or_default(), "--limit", 1.0, 100.0)?);
                    params.set("skip", integer(o.str("skip").unwrap_or_default(), "--skip")?);
                    for (opt, key) in [
                        ("listing", "listingId"),
                        ("reservation", "reservationId"),
                        ("channel", "channelId"),
                        ("externalReservation", "externalReservationId"),
                        ("externalReview", "externalReviewId"),
                        ("from", "startDate"),
                        ("to", "endDate"),
                    ] {
                        if let Some(v) = o.str(opt).filter(|s| !s.is_empty()) {
                            params.set(key, v);
                        }
                    }
                    get_with("/api/reviews", params)
                }),
        )
        .command(
            Command::new("upsell-fees <inquiryId> <listingId>")
                .description("[Pilot] List upsells for a quote; use the selected rate plan's inquiryId, not the quote ID")
                .action(|c| {
                    let path = format!("/api/reservations/upsell/{}/{}/fee", c.arg(0), c.arg(1));
                    fetch(&path, BookingFetch::default())
                }),
        )
        .command(
            Command::new("set-quote-upsells <quoteId>")
                .description("[Pilot] Replace a quote's upsells with the given fees and rate plans; --clear removes them")
                .option_parsed("--fee <id>", "Additional fee ID; repeat for several", collect, empty_list())
                .option_parsed("--rate-plan <id>", "Rate plan ID; repeat for several", collect, empty_list())
                .option("--clear", "Remove every upsell from the quote")
                .action(|c| {
                    let (fee, rate_plan, clear) = (c.opts.list("fee"), c.opts.list("ratePlan"), c.opts.flag("clear"));
                    if clear && (!fee.is_empty() || !rate_plan.is_empty()) {
                        bail!("Use --clear without --fee or --rate-plan.");
                    }
                    if !clear && fee.is_empty() {
                        bail!("Use --fee (repeatable) with --rate-plan, or --clear.");
                    }
                    let body = json::json!({ "additionalFeeIds": fee, "ratePlanIds": rate_plan });
                    post(&format!("/api/reservations/upsell/{}", c.arg(0)), "POST", body)
                }),
        )
        .command(
            Command::new("metasearch-config <pointOfSale>")
                .description("Get the metasearch configuration for a point of sale (google)")
                .action(|c| {
                    let point_of_sale = c.arg(0);
                    if point_of_sale != "google" {
                        bail!("The only documented point of sale is google.");
                    }
                    fetch(&format!("/api/metasearch/pointofsale/{point_of_sale}/config"), BookingFetch::default())
                }),
        )
        .command(
            Command::new("set-metasearch-config <pointOfSale>")
                .description("Create or replace the metasearch property-page URL template for a point of sale (google)")
                .required_option(
                    "--url <template>",
                    "Property page URL template, such as https://example.com/properties/(PARTNER-HOTEL-ID)?checkIn=...",
                )
                .action(|c| {
                    let point_of_sale = c.arg(0);
                    if point_of_sale != "google" {
                        bail!("The only documented point of sale is google.");
                    }
                    let url = c.opts.str("url").unwrap_or_default();
                    if !http_url_template(url) {
                        bail!("--url must be an http or https URL template.");
                    }
                    let body = json::json!({ "url": url });
                    post(&format!("/api/metasearch/pointofsale/{point_of_sale}/config"), "PUT", body)
                }),
        )
}
