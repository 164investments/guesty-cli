//! Port of src/commands/reservations.ts.

use crate::bail;
use crate::cli::{Call, Command, Opt};
use crate::client::{Body, Fetch, Params, ResponseType, get, guesty_fetch, paginate_all};
use crate::commands::query_options::{
    date, date_range, date_range_named, date_time, fields, integer, integer_in, js_trim, json_object,
};
use crate::commands::raw::node_fs_error;
use crate::error::{CliError, Result};
use crate::json::{self, Json, Map, json};
use crate::output::{Data, print, print_value, warn_deprecated, write_err};
use crate::stdin;

const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;

/// `readObject(data)`: `--data` (even when empty) or stdin, as a JSON object.
fn read_object(data: Option<&str>) -> Result<Map<String, Json>> {
    match data {
        Some(d) => json_object(d, "--data or stdin"),
        None => json_object(&stdin::read()?, "--data or stdin"),
    }
}

/// `opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin())`.
fn body(c: &Call) -> Result<Json> {
    stdin::data_or_stdin(c.opts.str("data"))
}

fn financial_params(c: &Call) -> Params {
    let mut params = Params::new();
    if let Some(merge) = c.opts.bool("mergeAccommodationFarePriceComponents") {
        params.set("mergeAccommodationFarePriceComponents", merge);
    }
    params
}

fn validate_comment(body: &Map<String, Json>) -> Result<()> {
    let length_ok = match body.get("body") {
        Some(Json::String(s)) => (1..=4095).contains(&s.chars().count()),
        _ => false,
    };
    if !length_ok {
        bail!("Comment body must be a string between 1 and 4095 characters.");
    }
    if let Some(mentions) = body.get("mentions") {
        let ok = match mentions {
            Json::Array(ids) => ids.iter().all(|id| matches!(id, Json::String(s) if !js_trim(s).is_empty())),
            _ => false,
        };
        if !ok {
            bail!("Comment mentions must be an array of user ID strings.");
        }
    }
    if let Some(parent) = body.get("parentCommentId") {
        if !matches!(parent, Json::String(s) if !js_trim(s).is_empty()) {
            bail!("parentCommentId must be a non-empty comment ID string.");
        }
    }
    Ok(())
}

fn deprecated(name: &str, replacement: &str) {
    write_err(&format!(
        "\x1b[33m[deprecated]\x1b[0m \"guesty res {name}\" uses the legacy v1 API. Use \"guesty res {replacement}\" instead.\n"
    ));
}

/// `encodeURIComponent(value)`.
fn encode(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for b in value.bytes() {
        if b.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&b) {
            out.push(b as char);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// `guestyFetch(path, { method, body })`, printing the result.
fn send(path: &str, method: &str, body: Option<Json>, params: Option<Params>) -> Result<()> {
    let data =
        guesty_fetch(path, Fetch { method: method.into(), body: body.map(json_body), params, ..Fetch::default() })?;
    print(&data);
    Ok(())
}

/// A parsed `--data`/stdin body as `guestyFetch` sends it: a JSON string is a
/// plain-text body, anything else is JSON.
pub(crate) fn json_body(value: Json) -> Body {
    match value {
        Json::String(text) => Body::Text(text),
        other => Body::Json(other),
    }
}

fn filter(field: &str, operator: &str, value: &str) -> Json {
    json!({ "field": field, "operator": operator, "value": value })
}

/// `reportParams(opts)`: the timezone (required) and paging of the reservations report commands.
fn report_params(c: &Call) -> Result<Params> {
    let tz = c.opts.str("timezone").unwrap_or("");
    if !valid_time_zone(tz) {
        bail!("--timezone must be a valid IANA timezone, such as America/Los_Angeles.");
    }
    let mut params = Params::new();
    params.set("timezone", tz);
    if let Some(limit) = c.opts.str("limit") {
        params.set("limit", integer_in(limit, "--limit", 1.0, MAX_SAFE_INTEGER)?);
    }
    if let Some(skip) = c.opts.str("skip") {
        params.set("skip", integer(skip, "--skip")?);
    }
    Ok(params)
}

/// `guestId(value)`: a guest entity ID that isn't blank.
fn guest_id(value: &str) -> Result<String> {
    if js_trim(value).is_empty() {
        bail!("--guest-id must be a non-empty guest ID.");
    }
    Ok(value.to_string())
}

/// `new Intl.DateTimeFormat("en-US", { timeZone })` accepts it: an IANA name
/// or link (ASCII case-insensitive), one of ICU's legacy IDs, or a UTC offset.
fn valid_time_zone(tz: &str) -> bool {
    const ICU_EXTRA: &[&str] = &[
        "ACT",
        "AET",
        "AGT",
        "ART",
        "AST",
        "BET",
        "BST",
        "CAT",
        "CNT",
        "CST",
        "CTT",
        "EAT",
        "ECT",
        "IET",
        "IST",
        "JST",
        "MIT",
        "NET",
        "NST",
        "PLT",
        "PNT",
        "PRT",
        "PST",
        "SST",
        "VST",
        "SystemV/AST4",
        "SystemV/AST4ADT",
        "SystemV/CST6",
        "SystemV/CST6CDT",
        "SystemV/EST5",
        "SystemV/EST5EDT",
        "SystemV/HST10",
        "SystemV/MST7",
        "SystemV/MST7MDT",
        "SystemV/PST8",
        "SystemV/PST8PDT",
        "SystemV/YST9",
        "SystemV/YST9YDT",
        "US/Pacific-New",
        "Canada/East-Saskatchewan",
    ];
    if chrono_tz::TZ_VARIANTS.iter().any(|z| z.name().eq_ignore_ascii_case(tz))
        || ICU_EXTRA.iter().any(|z| z.eq_ignore_ascii_case(tz))
    {
        return true;
    }
    // ±HH, ±HHMM or ±HH:MM, hours 00-23 (U+2212 is accepted as a minus sign).
    let Some(rest) = tz.strip_prefix(['+', '-', '\u{2212}']) else { return false };
    let b = rest.as_bytes();
    let two = |s: &[u8], max: u8| {
        s.len() == 2 && s.iter().all(u8::is_ascii_digit) && (s[0] - b'0') * 10 + (s[1] - b'0') <= max
    };
    match b.len() {
        2 => two(b, 23),
        4 => two(&b[..2], 23) && two(&b[2..], 59),
        5 => two(&b[..2], 23) && b[2] == b':' && two(&b[3..], 59),
        _ => false,
    }
}

fn financial_options(cmd: Command) -> Command {
    cmd.option(
        "--merge-accommodation-fare-price-components",
        "Merge markups, extra-person fees, and discounts into accommodation fare",
    )
    .option("--no-merge-accommodation-fare-price-components", "Return accommodation fare components separately")
}

pub fn command() -> Command {
    Command::new("reservations")
        .alias("res")
        .description("Manage reservations")
        // ─── legacy list / search (v1 response shape) ──────────────────────
        .command(
            Command::new("list")
                .description("[deprecated] List reservations with legacy v1 fields and filters — use 'list-v3' instead")
                .option("--from <date>", "Check-in from date (YYYY-MM-DD)")
                .option("--to <date>", "Check-in to date (YYYY-MM-DD)")
                .option("--status <status>", "Filter by status (confirmed, canceled, inquiry, etc.)")
                .option("--listing <id>", "Filter by listing ID")
                .option("--guest <name>", "Filter by exact guest full name")
                .option("--source <source>", "Filter by source (Airbnb, Booking.com, etc.)")
                .option_default("--limit <n>", "Max results", "25")
                .option_default("--skip <n>", "Offset", "0")
                .option_default("--sort <field>", "Sort field", "checkIn")
                .option("--fields <fields>", "Comma-separated fields to return")
                .option("--all", "Fetch all pages (up to 10k)")
                .action(|c| {
                    let o = &c.opts;
                    date_range(o.str("from"), o.str("to"))?;
                    if let Some(from) = o.str("from").filter(|s| !s.is_empty()) {
                        date(from, "--from")?;
                    }
                    if let Some(to) = o.str("to").filter(|s| !s.is_empty()) {
                        date(to, "--to")?;
                    }
                    let mut params = Params::new();
                    params.set("limit", integer_in(o.str("limit").unwrap_or(""), "--limit", 1.0, 100.0)?);
                    params.set("skip", integer(o.str("skip").unwrap_or(""), "--skip")?);
                    params.set("sort", o.str("sort").unwrap_or(""));
                    if let Some(f) = o.str("fields").filter(|s| !s.is_empty()) {
                        params.set("fields", fields(f)?);
                    }
                    let mut filters = Vec::new();
                    let truthy = |k: &str| o.str(k).filter(|s| !s.is_empty());
                    if let Some(v) = truthy("status") {
                        filters.push(filter("status", "$eq", v));
                    }
                    if let Some(v) = truthy("listing") {
                        filters.push(filter("listingId", "$eq", v));
                    }
                    if let Some(v) = truthy("source") {
                        filters.push(filter("source", "$eq", v));
                    }
                    if let Some(v) = truthy("from") {
                        filters.push(filter("checkInDateLocalized", "$gte", v));
                    }
                    if let Some(v) = truthy("to") {
                        filters.push(filter("checkInDateLocalized", "$lte", v));
                    }
                    if let Some(v) = truthy("guest") {
                        filters.push(filter("guest.fullName", "$eq", v));
                    }
                    if !filters.is_empty() {
                        params.set("filters", json::compact(&Json::Array(filters)));
                    }
                    deprecated("list", "list-v3");

                    if o.flag("all") {
                        let results = paginate_all("/v1/reservations", &params, Some("results"))?;
                        print_value(&Json::Array(results));
                    } else {
                        print(&get("/v1/reservations", params)?);
                    }
                    Ok(())
                }),
        )
        .command(
            Command::new("search <query>")
                .description("[deprecated] Search the legacy API by exact confirmation code (or exact name with --guest-name) — use 'list-v3 --confirmation-code' instead")
                .option("--guest-name", "Treat the query as an exact guest full name")
                .option_default("--limit <n>", "Max results", "25")
                .action(|c| {
                    deprecated("search", "list-v3 --confirmation-code <code>");
                    let query = c.arg(0);
                    if js_trim(query).is_empty() {
                        bail!("Search query must be a non-empty confirmation code or guest name.");
                    }
                    let field = if c.opts.flag("guestName") { "guest.fullName" } else { "confirmationCode" };
                    let mut params = Params::new();
                    params.set("filters", json::compact(&Json::Array(vec![filter(field, "$eq", query)])));
                    params.set("limit", integer_in(c.opts.str("limit").unwrap_or(""), "--limit", 1.0, 100.0)?);
                    print(&get("/v1/reservations", params)?);
                    Ok(())
                }),
        )
        // ─── filtered search (v3) ──────────────────────────────────────────
        .command(
            Command::new("list-v3")
                .alias("search-v3")
                .description("Search reservations using the current v3 API and its response shape")
                .option("--from <date>", "Check-in on/after localized date (YYYY-MM-DD)")
                .option("--to <date>", "Check-in on/before localized date (YYYY-MM-DD)")
                .option("--check-out-from <date>", "Check-out on/after localized date (YYYY-MM-DD)")
                .option("--check-out-to <date>", "Check-out on/before localized date (YYYY-MM-DD)")
                .option("--created-from <timestamp>", "Created on/after ISO datetime with timezone")
                .option("--created-before <timestamp>", "Created strictly before ISO datetime with timezone")
                .option("--status <statuses>", "Status or comma-separated statuses")
                .option("--exclude-status <status>", "Exclude a status")
                .option("--listing <ids>", "Listing ID or comma-separated IDs")
                .option("--confirmation-code <codes>", "Confirmation code or comma-separated codes")
                .option("--source <sources>", "Source or comma-separated sources")
                .option_default("--limit <n>", "Page size (1-100)", "25")
                .option_default("--skip <n>", "Initial offset", "0")
                .add_option(
                    Opt::new("--sort <field>", "Sort field; prefix with - for descending")
                        .choices(&["_id", "-_id", "checkIn", "-checkIn", "checkOut", "-checkOut", "createdAt", "-createdAt"])
                        .default("-_id"),
                )
                .option("--all", "Fetch all pages from --skip (up to 10k)")
                .action(|c| {
                    let o = &c.opts;
                    let mut params = Params::new();
                    params.set("limit", integer_in(o.str("limit").unwrap_or(""), "--limit", 1.0, 100.0)?);
                    params.set("skip", integer(o.str("skip").unwrap_or(""), "--skip")?);
                    params.set("sort", o.str("sort").unwrap_or(""));
                    date_range(o.str("from"), o.str("to"))?;
                    date_range_named(o.str("checkOutFrom"), o.str("checkOutTo"), "--check-out-from", "--check-out-to")?;
                    date_range_named(o.str("createdFrom"), o.str("createdBefore"), "--created-from", "--created-before")?;
                    let truthy = |k: &str| o.str(k).filter(|s| !s.is_empty());
                    if let Some(v) = truthy("from") {
                        params.set("filter[checkIn][gte]", date(v, "--from")?);
                    }
                    if let Some(v) = truthy("to") {
                        params.set("filter[checkIn][lte]", date(v, "--to")?);
                    }
                    if let Some(v) = truthy("checkOutFrom") {
                        params.set("filter[checkOut][gte]", date(v, "--check-out-from")?);
                    }
                    if let Some(v) = truthy("checkOutTo") {
                        params.set("filter[checkOut][lte]", date(v, "--check-out-to")?);
                    }
                    if let Some(v) = truthy("createdFrom") {
                        params.set("filter[createdAt][gte]", date_time(v, "--created-from")?);
                    }
                    if let Some(v) = truthy("createdBefore") {
                        params.set("filter[createdAt][lt]", date_time(v, "--created-before")?);
                    }
                    for (key, param) in [
                        ("status", "filter[status]"),
                        ("excludeStatus", "filter[status][ne]"),
                        ("listing", "filter[listingId]"),
                        ("confirmationCode", "filter[confirmationCode]"),
                        ("source", "filter[source]"),
                    ] {
                        if let Some(v) = truthy(key) {
                            params.set(param, v);
                        }
                    }
                    if o.flag("all") {
                        let results = paginate_all("/v1/reservations-v3/search", &params, Some("results"))?;
                        print_value(&Json::Array(results));
                    } else {
                        print(&get("/v1/reservations-v3/search", params)?);
                    }
                    Ok(())
                }),
        )
        // ─── get / create (v3) ─────────────────────────────────────────────
        .command(
            Command::new("get <ids...>")
                .description("Retrieve reservations by ID (up to 10 IDs)")
                .option("--fields <fields>", "Unsupported by v3; use legacy-get --fields for API field selection")
                .option("--include-payments-template", "Include payment schedule template information")
                .option("--no-include-payments-template", "Exclude payment schedule template information")
                .option("--merge-inclusive-taxes", "Merge inclusive taxes into their line items")
                .option("--no-merge-inclusive-taxes", "Return inclusive taxes separately")
                .option(
                    "--merge-accommodation-fare-price-components",
                    "Merge markups, extra-person fees, and discounts into accommodation fare",
                )
                .option("--no-merge-accommodation-fare-price-components", "Return accommodation fare components separately")
                .action(|c| {
                    if c.opts.has("fields") {
                        bail!(
                            "The v3 get API ignores --fields. Use guesty res legacy-get <id> --fields <fields> for API field selection, or pipe guesty res get <id> to jq for local selection."
                        );
                    }
                    let ids = c.args_many(0);
                    if ids.len() > 10 {
                        bail!("The reservations v3 API accepts at most 10 reservation IDs per request.");
                    }
                    let mut params = financial_params(c);
                    for (i, id) in ids.iter().enumerate() {
                        params.set(&format!("reservationIds[{i}]"), id);
                    }
                    if let Some(v) = c.opts.bool("includePaymentsTemplate") {
                        params.set("includePaymentsTemplate", v);
                    }
                    if let Some(v) = c.opts.bool("mergeInclusiveTaxes") {
                        params.set("mergeInclusiveTaxes", v);
                    }
                    print(&get("/v1/reservations-v3", params)?);
                    Ok(())
                }),
        )
        .command(
            Command::new("create")
                .description("Create reservation without quote (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send("/v1/reservations-v3", "POST", Some(body(c)?), None)),
        )
        .command(
            Command::new("create-from-quote")
                .description("Create reservation from quote (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send("/v1/reservations-v3/quote", "POST", Some(body(c)?), None)),
        )
        // ─── reservation actions (v3) ──────────────────────────────────────
        .command(
            Command::new("approve <reservationId>")
                .description("Approve channel reservation")
                .action(|c| send(&format!("/v1/reservations-v3/{}/approve", c.arg(0)), "POST", None, None)),
        )
        .command(
            Command::new("decline <reservationId>")
                .description("Decline channel reservation with reason/message (--data or stdin)")
                .option("--data <json>", "JSON body with reason and messageToGuest")
                .action(|c| {
                    let data = c.opts.str("data");
                    let input = match data {
                        Some(d) => d.to_string(),
                        None if crate::hooks::is_terminal(crate::hooks::Stream::Stdin) => String::new(),
                        None => stdin::read()?,
                    };
                    let body = if data.is_some() || !js_trim(&input).is_empty() {
                        Some(json_object(&input, "--data or stdin")?)
                    } else {
                        None
                    };
                    if let Some(body) = &body {
                        for key in ["reason", "messageToGuest"] {
                            if body.get(key).is_some_and(|v| !v.is_string()) {
                                bail!("{key} must be a string.");
                            }
                        }
                    }
                    send(
                        &format!("/v1/reservations-v3/{}/decline", encode(c.arg(0))),
                        "POST",
                        body.map(Json::Object),
                        None,
                    )
                }),
        )
        .command(
            Command::new("pre-approve <reservationId>")
                .description("Pre-approve channel reservation")
                .action(|c| send(&format!("/v1/reservations-v3/{}/pre-approve", c.arg(0)), "POST", None, None)),
        )
        .command(
            Command::new("request-cancellation <reservationId>")
                .description("Request cancellation with required channel reason and messages (--data or stdin)")
                .option("--data <json>", "JSON body with reason, subReason, messageToChannel, and messageToGuest")
                .action(|c| {
                    let body = read_object(c.opts.str("data"))?;
                    for key in ["reason", "subReason", "messageToChannel", "messageToGuest"] {
                        if !matches!(body.get(key), Some(Json::String(s)) if !js_trim(s).is_empty()) {
                            bail!("Cancellation requires a non-empty {key} string.");
                        }
                    }
                    send(
                        &format!("/v1/reservations-v3/{}/request-cancellation", encode(c.arg(0))),
                        "POST",
                        Some(Json::Object(body)),
                        None,
                    )
                }),
        )
        .command(
            Command::new("mid-stay")
                .description("Create a mid-stay (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send("/v1/reservations-v3/mid-stay", "POST", Some(body(c)?), None)),
        )
        .command(
            Command::new("guest-stay")
                .description("Change guest stay status (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send("/v1/reservations-v3/guest-stay", "PUT", Some(body(c)?), None)),
        )
        // ─── reservation updates (v3) ──────────────────────────────────────
        .command(financial_options(
            Command::new("update-source <reservationId>")
                .description("Change reservation source (--data or stdin)")
                .option("--data <json>", "JSON body"),
        )
        .action(|c| {
            let body = body(c)?;
            send(&format!("/v1/reservations-v3/{}/source", c.arg(0)), "PUT", Some(body), Some(financial_params(c)))
        }))
        .command(
            Command::new("update-notes <reservationId>")
                .description("Update reservation notes (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send(&format!("/v1/reservations-v3/{}/notes", c.arg(0)), "PUT", Some(body(c)?), None)),
        )
        .command(financial_options(
            Command::new("update-dates <reservationId>")
                .description("Update localized dates/times; date changes recalculate financials (--data or stdin)")
                .option(
                    "--data <json>",
                    "JSON with checkInDateLocalized/checkOutDateLocalized and/or plannedArrival/plannedDeparture",
                ),
        )
        .action(|c| {
            let body = read_object(c.opts.str("data"))?;
            if body.contains_key("checkIn") || body.contains_key("checkOut") {
                bail!(
                    "Use checkInDateLocalized/checkOutDateLocalized (YYYY-MM-DD), and plannedArrival/plannedDeparture (HH:mm), instead of checkIn/checkOut."
                );
            }
            for key in ["checkInDateLocalized", "checkOutDateLocalized"] {
                if let Some(v) = body.get(key) {
                    let Json::String(s) = v else { bail!("{key} must be a YYYY-MM-DD string.") };
                    date(s, key)?;
                }
            }
            let check_in = body.get("checkInDateLocalized").and_then(Json::as_str);
            let check_out = body.get("checkOutDateLocalized").and_then(Json::as_str);
            date_range_named(check_in, check_out, "checkInDateLocalized", "checkOutDateLocalized")?;
            if check_in.is_some() && check_in == check_out {
                bail!("checkOutDateLocalized must be after checkInDateLocalized.");
            }
            for key in ["plannedArrival", "plannedDeparture"] {
                if let Some(v) = body.get(key) {
                    if !matches!(v, Json::String(s) if valid_time(s)) {
                        bail!("{key} must be a valid time in HH:mm format.");
                    }
                }
            }
            send(
                &format!("/v1/reservations-v3/{}/dates", encode(c.arg(0))),
                "PUT",
                Some(Json::Object(body)),
                Some(financial_params(c)),
            )
        }))
        .command(financial_options(
            Command::new("relocate <reservationId>")
                .description("Update reservation listing (--data or stdin)")
                .option("--data <json>", "JSON body"),
        )
        .action(|c| {
            let body = body(c)?;
            send(&format!("/v1/reservations-v3/{}/relocate", c.arg(0)), "PUT", Some(body), Some(financial_params(c)))
        }))
        .command(
            Command::new("lock-property <reservationId>")
                .description("Lock the reservation's listing/unit against changes (refreshes the lock when already locked)")
                .action(|c| send(&format!("/v1/reservations-v3/{}/property-lock", encode(c.arg(0))), "POST", None, None)),
        )
        .command(
            Command::new("unlock-property <reservationId>")
                .description("Unlock the reservation's listing/unit so it can be changed again")
                .action(|c| send(&format!("/v1/reservations-v3/{}/property-lock", encode(c.arg(0))), "DELETE", None, None)),
        )
        .command(
            Command::new("update-booking-date <reservationId>")
                .description("Update the real-world booking date (--data or stdin)")
                .option("--data <json>", "JSON body with bookingDate (ISO datetime with timezone)")
                .action(|c| {
                    let body = read_object(c.opts.str("data"))?;
                    let Some(Json::String(booking_date)) = body.get("bookingDate") else {
                        bail!("bookingDate is required and must be an ISO datetime with timezone.");
                    };
                    date_time(booking_date, "bookingDate")?;
                    send(
                        &format!("/v1/reservations-v3/{}/booking-date", encode(c.arg(0))),
                        "PUT",
                        Some(Json::Object(body)),
                        None,
                    )
                }),
        )
        .command(
            Command::new("update-travel-information <reservationId>")
                .description("Update transportation, reason for visit, or agent booking (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = read_object(c.opts.str("data"))?;
                    if let Some(reason) = body.get("reasonForVisit") {
                        let ok = matches!(reason, Json::String(s) if ["business", "leisure", "family", "event", "other"].contains(&s.as_str()));
                        if !ok {
                            bail!("reasonForVisit must be business, leisure, family, event, or other.");
                        }
                    }
                    if body.get("agentBooking").is_some_and(|v| !v.is_boolean()) {
                        bail!("agentBooking must be a boolean.");
                    }
                    if body.get("transportation").is_some_and(|v| !v.is_object()) {
                        bail!("transportation must be a JSON object.");
                    }
                    send(
                        &format!("/v1/reservations-v3/{}/travel-information", encode(c.arg(0))),
                        "PUT",
                        Some(Json::Object(body)),
                        None,
                    )
                }),
        )
        .command(
            Command::new("update-status <reservationId>")
                .description("Update reservation status (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send(&format!("/v1/reservations-v3/{}/status", c.arg(0)), "PUT", Some(body(c)?), None)),
        )
        .command(
            Command::new("update-confirmation-code <reservationId>")
                .description("Update confirmation code (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    send(&format!("/v1/reservations-v3/{}/confirmation-code", c.arg(0)), "PUT", Some(body(c)?), None)
                }),
        )
        .command(financial_options(
            Command::new("update-guests <reservationId>")
                .description("Update guests breakdown (--data or stdin)")
                .option("--data <json>", "JSON body"),
        )
        .action(|c| {
            let body = body(c)?;
            send(&format!("/v1/reservations-v3/{}/guests", c.arg(0)), "PUT", Some(body), Some(financial_params(c)))
        }))
        .command(
            Command::new("guests <reservationId>")
                .description("List the guest entity refs linked to a reservation, including the booker (refs only, no profiles)")
                .action(|c| {
                    print(&get(&format!("/v1/reservations-v3/{}/guests", encode(c.arg(0))), Params::new())?);
                    Ok(())
                }),
        )
        .command(
            Command::new("assign-guest <reservationId>")
                .description("Assign one guest entity to a reservation (not tied to the guest count)")
                .required_option("--guest-id <id>", "Guest entity ID")
                .add_option(
                    Opt::new("--type <type>", "Guest type for this assignment")
                        .choices(&["adult", "children", "infant", "pet"])
                        .mandatory(),
                )
                .action(|c| {
                    let body = json!({ "_id": guest_id(c.opts.str("guestId").unwrap_or(""))?, "type": c.opts.str("type").unwrap_or("") });
                    send(&format!("/v1/reservations-v3/{}/guests/assign", encode(c.arg(0))), "PUT", Some(body), None)
                }),
        )
        .command(
            Command::new("unassign-guest <reservationId>")
                .description("Unassign one guest entity from a reservation (the booker cannot be unassigned)")
                .required_option("--guest-id <id>", "Guest entity ID")
                .action(|c| {
                    let body = json!({ "_id": guest_id(c.opts.str("guestId").unwrap_or(""))? });
                    send(&format!("/v1/reservations-v3/{}/guests/unassign", encode(c.arg(0))), "PUT", Some(body), None)
                }),
        )
        // ─── internal comments (v3) ────────────────────────────────────────
        .command(
            Command::new("comments <reservationId>")
                .description("List internal reservation comments and nested replies")
                .option_default("--limit <n>", "Maximum top-level comments", "20")
                .option_default("--skip <n>", "Top-level comments to skip", "0")
                .action(|c| {
                    let mut params = Params::new();
                    params.set("limit", integer_in(c.opts.str("limit").unwrap_or(""), "--limit", 1.0, MAX_SAFE_INTEGER)?);
                    params.set("skip", integer(c.opts.str("skip").unwrap_or(""), "--skip")?);
                    print(&get(&format!("/v1/reservations-v3/{}/comments", encode(c.arg(0))), params)?);
                    Ok(())
                }),
        )
        .command(
            Command::new("add-comment <reservationId>")
                .description("Add an internal reservation comment or reply (--data or stdin)")
                .option("--data <json>", "JSON with body, optional mentions, and optional parentCommentId")
                .action(|c| {
                    let body = read_object(c.opts.str("data"))?;
                    validate_comment(&body)?;
                    send(
                        &format!("/v1/reservations-v3/{}/comments", encode(c.arg(0))),
                        "POST",
                        Some(Json::Object(body)),
                        None,
                    )
                }),
        )
        .command(
            Command::new("update-comment <reservationId> <commentId>")
                .description("Edit an internal reservation comment as its author (--data or stdin)")
                .option("--data <json>", "JSON with body and optional mentions")
                .action(|c| {
                    let body = read_object(c.opts.str("data"))?;
                    validate_comment(&body)?;
                    send(
                        &format!("/v1/reservations-v3/{}/comments/{}", encode(c.arg(0)), encode(c.arg(1))),
                        "PATCH",
                        Some(Json::Object(body)),
                        None,
                    )
                }),
        )
        .command(
            Command::new("delete-comment <reservationId> <commentId>")
                .description("Soft-delete an internal reservation comment as its author")
                .action(|c| {
                    send(
                        &format!("/v1/reservations-v3/{}/comments/{}", encode(c.arg(0)), encode(c.arg(1))),
                        "DELETE",
                        None,
                        None,
                    )
                }),
        )
        // ─── custom fields (v3) ────────────────────────────────────────────
        .command(
            Command::new("update-custom-fields <reservationId>")
                .description("Update custom fields (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    send(&format!("/v1/reservations-v3/{}/custom-fields", c.arg(0)), "PUT", Some(body(c)?), None)
                }),
        )
        .command(
            Command::new("custom-fields <reservationId>")
                .description("Get custom fields for a reservation")
                .action(|c| send(&format!("/v1/reservations-v3/{}/custom-fields", c.arg(0)), "GET", None, None)),
        )
        .command(
            Command::new("custom-field <reservationId> <fieldId>")
                .description("Get a specific custom field")
                .action(|c| {
                    send(&format!("/v1/reservations-v3/{}/custom-fields/{}", c.arg(0), c.arg(1)), "GET", None, None)
                }),
        )
        .command(
            Command::new("delete-custom-field <reservationId> <fieldId>")
                .description("Delete a custom field")
                .action(|c| {
                    send(&format!("/v1/reservations-v3/{}/custom-fields/{}", c.arg(0), c.arg(1)), "DELETE", None, None)
                }),
        )
        // ─── groups & owner reservations (v3) ──────────────────────────────
        .command(
            Command::new("group-get <groupId>")
                .description("Get group reservation")
                .action(|c| send(&format!("/v1/reservations-v3/group/{}", c.arg(0)), "GET", None, None)),
        )
        .command(
            Command::new("group-create")
                .description("Create a group reservation (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send("/v1/reservations-v3/group", "POST", Some(body(c)?), None)),
        )
        .command(
            Command::new("owner-reservation")
                .description("Create confirmed owner reservation (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send("/v1/reservations-v3/owner/confirmed", "POST", Some(body(c)?), None)),
        )
        // ─── payments & invoices (v1, deprecated; see the payments group) ──
        .command(
            Command::new("balance <id>")
                .description("Get the folio/balance for a reservation")
                .action(|c| send(&format!("/v1/accounting-api/reservations/{}/balance", c.arg(0)), "GET", None, None)),
        )
        .command(
            Command::new("add-payment <id>")
                .description("[deprecated] Add a payment to a reservation (--data or stdin) — use 'payments create', or 'payments record' for offline payments")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated("reservations add-payment", &["payments create", "payments record"]);
                    send(&format!("/v1/reservations/{}/payments", c.arg(0)), "POST", Some(body(c)?), None)
                }),
        )
        .command(
            Command::new("update-payment <id> <paymentId>")
                .description("[deprecated] Update or cancel a payment on a reservation (--data or stdin) — use 'payments update' or 'payments cancel' instead")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated("reservations update-payment", &["payments update", "payments cancel"]);
                    send(&format!("/v1/reservations/{}/payments/{}", c.arg(0), c.arg(1)), "PUT", Some(body(c)?), None)
                }),
        )
        .command(
            Command::new("refund-payment <id> <paymentId>")
                .description("[deprecated] Refund a payment on a reservation (--data or stdin) — use 'payments refund', or 'payments record-refund' for recorded payments")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated("reservations refund-payment", &["payments refund", "payments record-refund"]);
                    send(
                        &format!("/v1/reservations/{}/payments/{}/refund", c.arg(0), c.arg(1)),
                        "POST",
                        Some(body(c)?),
                        None,
                    )
                }),
        )
        .command(
            Command::new("cancel-payment <id> <paymentId>")
                .description("[deprecated] Cancel a pending or recorded payment (--data or stdin) — use 'payments cancel' instead")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated("reservations cancel-payment", &["payments cancel"]);
                    send(
                        &format!("/v1/reservations/{}/payments/{}/cancel", c.arg(0), c.arg(1)),
                        "PATCH",
                        Some(body(c)?),
                        None,
                    )
                }),
        )
        .command(
            Command::new("add-invoice-item <id>")
                .description("[deprecated] Create an invoice item on a reservation (--data or stdin) — use 'invoice-items create' instead")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated("reservations add-invoice-item", &["invoice-items create <reservationId>"]);
                    send(&format!("/v1/reservations/{}/invoiceItems", c.arg(0)), "POST", Some(body(c)?), None)
                }),
        )
        // ─── update (v1 — use granular v3 updates instead) ─────────────────
        .command(
            Command::new("update <id>")
                .description("[deprecated] Update a reservation (--data or stdin) — use update-dates, update-guests, update-status, relocate, or update-notes instead")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated(
                        "reservations update",
                        &[
                            "reservations update-dates",
                            "reservations update-guests",
                            "reservations update-status",
                            "reservations relocate",
                            "reservations update-notes",
                        ],
                    );
                    send(&format!("/v1/reservations/{}", c.arg(0)), "PUT", Some(body(c)?), None)
                }),
        )
        // ─── export / report ───────────────────────────────────────────────
        .command(
            Command::new("export-csv")
                .description("[deprecated] Export reservations as CSV (--data or stdin); Guesty documents no replacement")
                .option("--data <json>", "JSON body")
                .option("--output <path>", "Write CSV output to a file")
                .action(|c| {
                    warn_deprecated("reservations export-csv", &[]);
                    let body = body(c)?;
                    let data = guesty_fetch(
                        "/v1/reservations.csv",
                        Fetch {
                            method: "POST".into(),
                            body: Some(json_body(body)),
                            response_type: ResponseType::Text,
                            ..Fetch::default()
                        },
                    )?;
                    if let Some(output) = c.opts.str("output").filter(|s| !s.is_empty()) {
                        let text = match &data {
                            Data::Text(t) => t.clone(),
                            // writeFileSync(path, undefined) after a 204/205.
                            _ => bail!(
                                "The \"data\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received undefined"
                            ),
                        };
                        std::fs::write(output, text).map_err(|e| CliError::new(node_fs_error(&e, "open", output)))?;
                        write_err(&format!("Saved CSV to {output}\n"));
                        return Ok(());
                    }
                    print(&data);
                    Ok(())
                }),
        )
        .command(
            Command::new("export-email")
                .description("[deprecated] Send reservations results in email (--data or stdin); Guesty documents no replacement")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated("reservations export-email", &[]);
                    send("/v1/reservations.email", "POST", Some(body(c)?), None)
                }),
        )
        .command(
            Command::new("report <viewId>")
                .description("Get reservations report by view ID")
                .required_option("--timezone <tz>", "Timezone (e.g. America/Los_Angeles)")
                .option("--limit <n>", "Max results")
                .option("--skip <n>", "Offset")
                .action(|c| {
                    print(&get(&format!("/v1/reservations-reports/{}", encode(c.arg(0))), report_params(c)?)?);
                    Ok(())
                }),
        )
        .command(
            Command::new("report-csv <viewId>")
                .description("Get reservations report by view ID as CSV")
                .required_option("--timezone <tz>", "Timezone (e.g. America/Los_Angeles)")
                .option("--limit <n>", "Max results")
                .option("--skip <n>", "Offset")
                .option("--output <path>", "Write CSV output to a file")
                .action(|c| {
                    let data = guesty_fetch(
                        &format!("/v1/reservations-reports/{}/csv", encode(c.arg(0))),
                        Fetch { params: Some(report_params(c)?), response_type: ResponseType::Text, ..Fetch::default() },
                    )?;
                    if let Some(output) = c.opts.str("output").filter(|s| !s.is_empty()) {
                        let text = match &data {
                            Data::Text(t) => t.clone(),
                            // writeFileSync(path, undefined) after a 204/205.
                            _ => bail!(
                                "The \"data\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received undefined"
                            ),
                        };
                        std::fs::write(output, text).map_err(|e| CliError::new(node_fs_error(&e, "open", output)))?;
                        write_err(&format!("Saved CSV to {output}\n"));
                        return Ok(());
                    }
                    print(&data);
                    Ok(())
                }),
        )
        .command(
            Command::new("report-search")
                .description(
                    "Search reservations with report enrichments (money, listing, guest, accounting); dates are in the listing's timezone",
                )
                .option("--from <date>", "Check-in date on/after (YYYY-MM-DD)")
                .option("--to <date>", "Check-in date on/before (YYYY-MM-DD)")
                .option("--check-out-from <date>", "Check-out date on/after (YYYY-MM-DD)")
                .option("--check-out-to <date>", "Check-out date on/before (YYYY-MM-DD)")
                .option("--created-from <timestamp>", "Created on/after ISO datetime with timezone")
                .option("--created-before <timestamp>", "Created strictly before ISO datetime with timezone")
                .option("--status <statuses>", "Status or comma-separated statuses")
                .option("--exclude-status <statuses>", "Exclude a status or comma-separated statuses")
                .option("--listing <ids>", "Listing ID or comma-separated IDs")
                .option("--confirmation-code <codes>", "Confirmation code or comma-separated codes")
                .option("--source <sources>", "Source or comma-separated sources")
                .option_default("--limit <n>", "Page size (1-100)", "25")
                .option_default("--skip <n>", "Initial offset", "0")
                .add_option(
                    Opt::new("--sort <field>", "Sort field; prefix with - for descending")
                        .choices(&["_id", "-_id", "checkIn", "-checkIn", "checkOut", "-checkOut", "createdAt", "-createdAt"])
                        .default("-_id"),
                )
                .option("--all", "Fetch all pages from --skip (up to 10k)")
                .action(|c| {
                    let o = &c.opts;
                    let mut params = Params::new();
                    params.set("limit", integer_in(o.str("limit").unwrap_or(""), "--limit", 1.0, 100.0)?);
                    params.set("skip", integer(o.str("skip").unwrap_or(""), "--skip")?);
                    params.set("sort", o.str("sort").unwrap_or(""));
                    let truthy = |k: &str| o.str(k).filter(|s| !s.is_empty());
                    for (key, option) in
                        [("from", "--from"), ("to", "--to"), ("checkOutFrom", "--check-out-from"), ("checkOutTo", "--check-out-to")]
                    {
                        if let Some(v) = truthy(key) {
                            date(v, option)?;
                        }
                    }
                    date_range(o.str("from"), o.str("to"))?;
                    date_range_named(o.str("checkOutFrom"), o.str("checkOutTo"), "--check-out-from", "--check-out-to")?;
                    if let Some(v) = truthy("createdFrom") {
                        date_time(v, "--created-from")?;
                    }
                    if let Some(v) = truthy("createdBefore") {
                        date_time(v, "--created-before")?;
                    }
                    date_range_named(o.str("createdFrom"), o.str("createdBefore"), "--created-from", "--created-before")?;
                    for (key, param) in [
                        ("from", "filter[checkInDate][gte]"),
                        ("to", "filter[checkInDate][lte]"),
                        ("checkOutFrom", "filter[checkOutDate][gte]"),
                        ("checkOutTo", "filter[checkOutDate][lte]"),
                        ("createdFrom", "filter[createdAt][gte]"),
                        ("createdBefore", "filter[createdAt][lt]"),
                        ("status", "filter[status]"),
                        ("excludeStatus", "filter[status][nin]"),
                        ("listing", "filter[listingId]"),
                        ("confirmationCode", "filter[confirmationCode]"),
                        ("source", "filter[source]"),
                    ] {
                        if let Some(v) = truthy(key) {
                            params.set(param, v);
                        }
                    }
                    if o.flag("all") {
                        let results = paginate_all("/v1/reservations-reports/reservations/search", &params, Some("results"))?;
                        print_value(&Json::Array(results));
                    } else {
                        print(&get("/v1/reservations-reports/reservations/search", params)?);
                    }
                    Ok(())
                }),
        )
        .command(
            Command::new("logs <reservationId>")
                .description("Get reservation activity logs with cursor pagination")
                .option("--cursor <logId>", "Last logId from the previous page")
                .option_default("--limit <n>", "Page size (1-20)", "20")
                .add_option(Opt::new("--sort <order>", "Log sort order").choices(&["asc", "desc"]).default("desc"))
                .action(|c| {
                    let mut params = Params::new();
                    params.set("limit", integer_in(c.opts.str("limit").unwrap_or(""), "--limit", 1.0, 20.0)?);
                    params.set("sort", c.opts.str("sort").unwrap_or(""));
                    if let Some(cursor) = c.opts.str("cursor").filter(|s| !s.is_empty()) {
                        params.set("cursor", cursor);
                    }
                    print(&get(&format!("/v1/reservation-logs/{}", encode(c.arg(0))), params)?);
                    Ok(())
                }),
        )
        // ─── airbnb-specific ───────────────────────────────────────────────
        .command(
            Command::new("airbnb-pre-approve <reservationId>")
                .description("Pre-approve inquiry for Airbnb")
                .action(|c| {
                    send(&format!("/v1/reservations-api/reservations/{}/pre-approve", c.arg(0)), "POST", None, None)
                }),
        )
        .command(
            Command::new("request-cancellation-sync <id>")
                .description("[deprecated] Request Airbnb reservation cancellation sync — use 'request-cancellation' instead")
                .action(|c| {
                    deprecated("request-cancellation-sync", "request-cancellation");
                    send(&format!("/v1/reservations/{}/request-cancellation-sync", c.arg(0)), "POST", None, None)
                }),
        )
        // ─── legacy v1 commands (deprecated) ───────────────────────────────
        .command(
            Command::new("legacy-get <id>")
                .description("[deprecated] Get reservation via v1 API — use 'get' instead")
                .option("--fields <fields>", "Comma-separated fields to return")
                .action(|c| {
                    deprecated("legacy-get", "get");
                    let mut params = Params::new();
                    if let Some(f) = c.opts.str("fields").filter(|s| !s.is_empty()) {
                        params.set("fields", fields(f)?);
                    }
                    print(&get(&format!("/v1/reservations/{}", c.arg(0)), params)?);
                    Ok(())
                }),
        )
        .command(
            Command::new("legacy-create")
                .description("[deprecated] Create reservation via v1 API — use 'create' instead")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    deprecated("legacy-create", "create");
                    send("/v1/reservations", "POST", Some(body(c)?), None)
                }),
        )
        .command(
            Command::new("legacy-approve <id>")
                .description("[deprecated] Approve via v1 API — use 'approve' instead")
                .action(|c| {
                    deprecated("legacy-approve", "approve");
                    send(&format!("/v1/reservations/{}/approve", c.arg(0)), "POST", None, None)
                }),
        )
        .command(
            Command::new("legacy-decline <id>")
                .description("[deprecated] Decline via v1 API — use 'decline' instead")
                .action(|c| {
                    deprecated("legacy-decline", "decline");
                    send(&format!("/v1/reservations/{}/decline", c.arg(0)), "POST", None, None)
                }),
        )
        .command(
            Command::new("legacy-custom-fields <id>")
                .description("[deprecated] Get custom fields via v1 API — use 'custom-fields' instead")
                .action(|c| {
                    deprecated("legacy-custom-fields", "custom-fields");
                    send(&format!("/v1/reservations/{}/custom-fields", c.arg(0)), "GET", None, None)
                }),
        )
        .command(
            Command::new("legacy-set-custom-fields <id>")
                .description("[deprecated] Update custom fields via v1 API — use 'update-custom-fields' instead")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    deprecated("legacy-set-custom-fields", "update-custom-fields");
                    send(&format!("/v1/reservations/{}/custom-fields", c.arg(0)), "PUT", Some(body(c)?), None)
                }),
        )
        .command(
            Command::new("legacy-custom-field <id> <fieldId>")
                .description("[deprecated] Get single custom field via v1 API — use 'custom-field' instead")
                .action(|c| {
                    deprecated("legacy-custom-field", "custom-field");
                    send(&format!("/v1/reservations/{}/custom-fields/{}", c.arg(0), c.arg(1)), "GET", None, None)
                }),
        )
        .command(
            Command::new("legacy-delete-custom-field <id> <fieldId>")
                .description("[deprecated] Delete custom field via v1 API — use 'delete-custom-field' instead")
                .action(|c| {
                    deprecated("legacy-delete-custom-field", "delete-custom-field");
                    send(&format!("/v1/reservations/{}/custom-fields/{}", c.arg(0), c.arg(1)), "DELETE", None, None)
                }),
        )
}

/// `/^(?:[01]\d|2[0-3]):[0-5]\d$/`.
fn valid_time(value: &str) -> bool {
    let b = value.as_bytes();
    b.len() == 5
        && b[2] == b':'
        && b.iter().enumerate().all(|(i, c)| i == 2 || c.is_ascii_digit())
        && (b[0] < b'2' || (b[0] == b'2' && b[1] <= b'3'))
        && b[3] <= b'5'
}
