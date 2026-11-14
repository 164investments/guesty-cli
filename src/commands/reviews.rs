//! Port of src/commands/reviews.ts.

use super::contacts::{fetch_print, send_data};
use super::query_options::{collect, date_range, empty_list, integer, integer_in};
use crate::bail;
use crate::cli::Command;
use crate::client::{Fetch, guesty_fetch};
use crate::json::json;
use crate::output::print;
use crate::params;

const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;

pub fn command() -> Command {
    Command::new("reviews")
        .description("Manage reviews")
        .command(
            Command::new("custom-channels")
                .description("List custom review channels")
                .action(|_| fetch_print("/v1/reviews/custom-channels")),
        )
        .command(
            Command::new("create-custom-channel")
                .description("Create a custom review channel (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/reviews/custom-channels", "POST", c.opts.str("data"))),
        )
        .command(
            Command::new("list")
                .description("List reviews")
                .option("--listing <id>", "Filter by listing ID")
                .option("--reservation <id>", "Filter by reservation ID")
                .option("--channel <id>", "Filter by channel ID")
                .option("--custom-channel <name>", "Filter by custom channel name")
                .option("--include-custom-channels", "Include custom channel reviews")
                .option("--from <date-time>", "Updated on or after this ISO 8601 timestamp")
                .option("--to <date-time>", "Updated on or before this ISO 8601 timestamp")
                .option_default("--limit <n>", "Max results", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let o = &c.opts;
                    date_range(o.str("from"), o.str("to"))?;
                    let mut params = params! {
                        "limit" => integer_in(o.str("limit").unwrap_or(""), "--limit", 1.0, MAX_SAFE_INTEGER)?,
                        "skip" => integer(o.str("skip").unwrap_or(""), "--skip")?,
                    };
                    for (option, key) in [
                        ("listing", "listingId"),
                        ("reservation", "reservationId"),
                        ("channel", "channelId"),
                        ("customChannel", "customChannelName"),
                    ] {
                        if let Some(v) = o.str(option).filter(|v| !v.is_empty()) {
                            params.set(key, v);
                        }
                    }
                    if o.flag("includeCustomChannels") {
                        params.set("includeCustomChannels", true);
                    }
                    for (option, key) in [("from", "startDate"), ("to", "endDate")] {
                        if let Some(v) = o.str(option).filter(|v| !v.is_empty()) {
                            params.set(key, v);
                        }
                    }
                    print(&guesty_fetch("/v1/reviews", Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("get <id>")
                .description("Get a single review")
                .action(|c| fetch_print(&format!("/v1/reviews/{}", c.arg(0)))),
        )
        .command(
            Command::new("listings-average")
                .description("Get average review scores by listing IDs")
                .required_option_parsed("--listing <id>", "Listing ID (repeat for multiple)", collect, empty_list())
                .option("--include-custom-channels", "Include custom channel reviews")
                .action(|c| {
                    let listing = c.opts.list("listing");
                    if listing.is_empty() {
                        bail!("At least one --listing is required.");
                    }
                    // Brackets preserve array semantics when only one listing is requested.
                    let mut params = params! { "listingIds[]" => listing };
                    if c.opts.flag("includeCustomChannels") {
                        params.set("includeCustomChannels", true);
                    }
                    print(&guesty_fetch("/v1/reviews/listings-average", Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("create-custom-channel-review")
                .description("Publish a custom-channel review (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/reviews/custom-channel-reviews", "POST", c.opts.str("data"))),
        )
        .command(
            Command::new("reply <id>")
                .description("Reply to a review")
                .required_option("--body <text>", "Reply text")
                .action(|c| {
                    let body = json!({ "reviewReply": c.opts.str("body").unwrap_or("") });
                    print(&guesty_fetch(&format!("/v1/reviews/{}/reply", c.arg(0)), Fetch::json("PUT", body))?);
                    Ok(())
                }),
        )
}
