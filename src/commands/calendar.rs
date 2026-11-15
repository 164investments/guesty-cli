//! Port of src/commands/calendar.ts.

use crate::cli::{Call, Command, Opt, Value};
use crate::client::{Fetch, Param, Params, guesty_fetch};
use crate::commands::query_options::{date, date_range, date_range_named, js_trim};
use crate::error::{CliError, Result};
use crate::json::{Json, Map};
use crate::output::print;
use crate::stdin;

const BLOCK_REASONS: [&str; 9] = [
    "Owner block",
    "Offboarded",
    "Migrated unit block",
    "Maintenance",
    "Onboarding",
    "Emergency out of order",
    "Do not sell",
    "Deactivated",
    "Other",
];

const CALENDAR_PATH: &str = "/v1/availability-pricing/api/calendar/listings";

/// `encodeURIComponent(value)`.
fn encode_uri_component(value: &str) -> String {
    let mut out = String::new();
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&byte) {
            out.push(byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

fn calendar_params(c: &Call) -> Result<Params> {
    let o = &c.opts;
    let from = o.str("from").unwrap_or("");
    let to = o.str("to").unwrap_or("");
    let mut params = crate::params! {
        "startDate" => date(from, "--from")?,
        "endDate" => date(to, "--to")?,
    };
    date_range(Some(from), Some(to))?;
    for key in ["includeAllotment", "ignoreInactiveChildAllotment", "ignoreUnlistedChildAllotment"] {
        if o.flag(key) {
            params.set(key, true);
        }
    }
    Ok(params)
}

fn validate_calendar_update(body: &Json) -> Result<()> {
    let Json::Object(record) = body else {
        return Err(CliError::new("Calendar update must be a JSON object with startDate and endDate."));
    };
    let (Some(Json::String(start)), Some(Json::String(end))) = (record.get("startDate"), record.get("endDate")) else {
        return Err(CliError::new(
            "Calendar update requires startDate and endDate (YYYY-MM-DD); dateFrom/dateTo are not supported.",
        ));
    };
    date(start, "startDate")?;
    date(end, "endDate")?;
    date_range_named(Some(start), Some(end), "startDate", "endDate")
}

/// The `--listing` parser: `[...previous, value]`, which allows empty values.
fn append(value: &str, previous: Option<&Value>) -> Result<Value> {
    let mut items = match previous {
        Some(Value::List(items)) => items.clone(),
        _ => Vec::new(),
    };
    items.push(value.to_string());
    Ok(Value::List(items))
}

/// The date range and allotment options every calendar read shares.
fn range_options(command: Command) -> Command {
    command
        .required_option("--from <date>", "Start date (YYYY-MM-DD)")
        .required_option("--to <date>", "End date (YYYY-MM-DD, inclusive)")
        .option("--include-allotment", "Include multi-unit allotment")
        .option("--ignore-inactive-child-allotment", "Exclude inactive sub-units from allotment")
        .option("--ignore-unlisted-child-allotment", "Exclude unlisted sub-units from allotment")
}

fn show(path: &str, fetch: Fetch) -> Result<()> {
    print(&guesty_fetch(path, fetch)?);
    Ok(())
}

pub fn command() -> Command {
    Command::new("calendar")
        .alias("cal")
        .description("Calendar and availability")
        .command(range_options(Command::new("get <listingId>").description("Get calendar for a listing")).action(|c| {
            show(&format!("{CALENDAR_PATH}/{}", encode_uri_component(c.arg(0))), Fetch::get(calendar_params(c)?))
        }))
        .command(
            range_options(
                Command::new("minified <listingId>")
                    .description("Get the optimized calendar for a listing")
                    .add_option(Opt::new("--view <view>", "Calendar detail level").choices(&["compact", "full"])),
            )
            .action(|c| {
                let mut params = calendar_params(c)?;
                if let Some(view) = c.opts.str("view").filter(|v| !v.is_empty()) {
                    params.set("view", view);
                }
                show(&format!("{CALENDAR_PATH}/minified/{}", encode_uri_component(c.arg(0))), Fetch::get(params))
            }),
        )
        .command(
            range_options(
                Command::new("list").description("Get calendars for multiple listings").required_option_parsed(
                    "--listing <id>",
                    "Listing ID (repeat for multiple listings)",
                    append,
                    Some(Value::List(Vec::new())),
                ),
            )
            .action(|c| {
                let listings = c.opts.list("listing");
                if listings.is_empty() || listings.iter().any(|id| js_trim(id).is_empty()) {
                    return Err(CliError::new("Provide at least one --listing ID."));
                }
                let mut params = calendar_params(c)?;
                params.set("listingIds", listings.join(","));
                show(CALENDAR_PATH, Fetch::get(params))
            }),
        )
        .command(
            Command::new("update <listingId>")
                .description("Update calendar (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    validate_calendar_update(&body)?;
                    show(&format!("{CALENDAR_PATH}/{}", encode_uri_component(c.arg(0))), Fetch::json("PUT", body))
                }),
        )
        .command(
            Command::new("update-many")
                .description("Update calendar for multiple listings (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    let items = match &body {
                        Json::Array(items) if !items.is_empty() => items,
                        _ => return Err(CliError::new("Calendar update-many requires a non-empty JSON array.")),
                    };
                    for item in items {
                        validate_calendar_update(item)?;
                        let valid = matches!(item.get("listingId"), Some(Json::String(id)) if !js_trim(id).is_empty());
                        if !valid {
                            return Err(CliError::new("Each calendar update requires a listingId."));
                        }
                    }
                    show(CALENDAR_PATH, Fetch::json("PUT", body))
                }),
        )
        .command(
            Command::new("block <listingId>")
                .description("Block dates on a listing (inclusive; for one night use the same --from and --to)")
                .required_option("--from <date>", "Start date (YYYY-MM-DD)")
                .required_option("--to <date>", "End date (YYYY-MM-DD, inclusive)")
                .add_option(
                    Opt::new("--reason <reason>", "Block reason (case-sensitive)")
                        .choices(&BLOCK_REASONS)
                        .default("Other"),
                )
                .option("--note <text>", "Block note")
                .action(|c| {
                    let params = calendar_params(c)?;
                    let mut body = Map::new();
                    for key in ["startDate", "endDate"] {
                        if let Some(Param::Str(v)) = params.get(key) {
                            body.insert(key.into(), Json::String(v.clone()));
                        }
                    }
                    body.insert("status".into(), Json::String("unavailable".into()));
                    if let Some(reason) = c.opts.str("reason") {
                        body.insert("blockReason".into(), Json::String(reason.into()));
                    }
                    if let Some(note) = c.opts.str("note") {
                        body.insert("note".into(), Json::String(note.into()));
                    }
                    show(
                        &format!("{CALENDAR_PATH}/{}", encode_uri_component(c.arg(0))),
                        Fetch::json("PUT", Json::Object(body)),
                    )
                }),
        )
}
