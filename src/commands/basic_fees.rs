//! Port of src/commands/basic-fees.ts.

use crate::bail;
use crate::cli::Command;
use crate::client::{Fetch, Params, get, guesty_fetch};
use crate::commands::query_options::{collect, empty_list, json_object};
use crate::error::Result;
use crate::json::Json;
use crate::output::print;
use crate::stdin;

// [Beta] Listing basic fees. The cleaning fee is currently the only basic fee.

const MULTIPLIERS: [&str; 4] = ["PER_STAY", "PER_GUEST", "PER_NIGHT", "PER_GUEST_PER_NIGHT"];

/// `(value as Record)?.[key]` for a parsed JSON value: only objects have keys.
fn field<'a>(value: Option<&'a Json>, key: &str) -> Option<&'a Json> {
    value.and_then(Json::as_object).and_then(|m| m.get(key))
}

fn validate_cleaning_fee(fee: &Json, label: &str) -> Result<()> {
    let value = field(Some(fee), "value");
    // `!value || typeof value !== "object"`: arrays are objects too.
    if !matches!(value, Some(Json::Object(_) | Json::Array(_))) {
        bail!("{label}.value is required.");
    }
    let value_type = field(value, "valueType").and_then(Json::as_str);
    if !matches!(value_type, Some("FIXED" | "PERCENTAGE")) {
        bail!("{label}.value.valueType must be FIXED or PERCENTAGE.");
    }
    let multiplier = field(value, "multiplier").and_then(Json::as_str);
    if !multiplier.is_some_and(|m| MULTIPLIERS.contains(&m)) {
        bail!("{label}.value.multiplier must be one of {}.", MULTIPLIERS.join(", "));
    }
    if value_type == Some("PERCENTAGE") && multiplier != Some("PER_STAY") {
        bail!("{label}.value.multiplier must be PER_STAY for a PERCENTAGE fee.");
    }
    if !matches!(field(value, "formula"), Some(Json::Number(_))) {
        bail!("{label}.value.formula must be a number.");
    }
    Ok(())
}

pub fn command() -> Command {
    Command::new("basic-fees")
        .alias("bf")
        .description("[Beta] Listing basic fees (cleaning fee) and per-channel overrides")
        .command(
            Command::new("list")
                .description("Get basic fees for up to 50 listings; listings without basic fees are omitted")
                .required_option_parsed("--listing <id>", "Listing ID; repeat for up to 50 listings", collect, empty_list())
                .action(|c| {
                    let listing = c.opts.list("listing");
                    if listing.len() > 50 {
                        bail!("--listing accepts at most 50 listings per request; split larger sets into batches.");
                    }
                    let mut params = Params::new();
                    params.set("listingIds", listing);
                    print(&get("/v1/basic-fees/listings", params)?);
                    Ok(())
                }),
        )
        .command(Command::new("get <listingId>").description("Get a listing's basic fees and channel overrides").action(|c| {
            print(&get(&format!("/v1/basic-fees/listings/{}", c.arg(0)), Params::new())?);
            Ok(())
        }))
        .command(
            Command::new("channel <listingId> <channel>")
                .description("Get the cleaning fee a channel receives for a listing, such as airbnb2 or bookingCom")
                .action(|c| {
                    print(&get(&format!("/v1/basic-fees/listings/{}/channels/{}", c.arg(0), c.arg(1)), Params::new())?);
                    Ok(())
                }),
        )
        .command(
            Command::new("set <listingId>")
                .description("Replace a listing's basic fees (--data or stdin with channelConfigurations, and optional cleaningFee)")
                .option("--data <json>", "JSON body; channelConfigurations is required, [] clears every override")
                .option("--update-sub-units", "Overwrite the listing's child units with the same payload")
                .action(|c| {
                    let text = match c.opts.str("data") {
                        Some(d) => d.to_string(),
                        None => stdin::read()?,
                    };
                    let body = json_object(&text, "--data or stdin")?;
                    let Some(Json::Array(configs)) = body.get("channelConfigurations") else {
                        bail!("The request body needs channelConfigurations as an array; send [] for no channel overrides.");
                    };
                    if let Some(fee) = body.get("cleaningFee") {
                        validate_cleaning_fee(fee, "cleaningFee")?;
                    }
                    for (index, entry) in configs.iter().enumerate() {
                        let channel = field(Some(entry), "channel");
                        if !matches!(channel, Some(Json::String(s)) if !s.is_empty()) {
                            bail!("channelConfigurations[{index}].channel is required.");
                        }
                        if let Some(fee) = field(Some(entry), "cleaningFee") {
                            validate_cleaning_fee(fee, &format!("channelConfigurations[{index}].cleaningFee"))?;
                        }
                    }
                    let mut params = Params::new();
                    if c.opts.flag("updateSubUnits") {
                        params.set("shouldUpdateSubUnits", true);
                    }
                    let path = format!("/v1/basic-fees/listings/{}", c.arg(0));
                    print(&guesty_fetch(&path, Fetch::json("PUT", Json::Object(body)).with_params(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("delete <listingId>")
                .description("Delete all of a listing's basic fees and channel overrides")
                .action(|c| {
                    print(&guesty_fetch(&format!("/v1/basic-fees/listings/{}", c.arg(0)), Fetch::method("DELETE"))?);
                    Ok(())
                }),
        )
}
