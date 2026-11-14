//! Port of src/commands/rate-plans.ts.

use super::contacts::{method_print, send_data};
use super::query_options::{date_range, integer, integer_in};
use crate::cli::{Call, Command};
use crate::client::{Fetch, Params, guesty_fetch};
use crate::error::Result;
use crate::output::print;
use crate::params;

const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;

/// `{ channelId, sort, limit, skip }` for the rate plan list endpoints.
pub(super) fn rate_plan_list_params(c: &Call) -> Result<Params> {
    let o = &c.opts;
    Ok(params! {
        "channelId" => o.str("channel").unwrap_or(""),
        "sort" => o.str("sort").unwrap_or(""),
        "limit" => integer_in(o.str("limit").unwrap_or(""), "--limit", 1.0, MAX_SAFE_INTEGER)?,
        "skip" => integer(o.str("skip").unwrap_or(""), "--skip")?,
    })
}

pub fn command() -> Command {
    let ari = |c: &Call| format!("/v1/rm-rate-plans-ext/ari-calendar/listing/{}/ratePlan/{}", c.arg(0), c.arg(1));
    Command::new("rate-plans")
        .alias("rp")
        .description("Manage rate plans")
        .command(
            Command::new("create")
                .description("Create a rate plan (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/rm-rate-plans-ext/rate-plans", "POST", c.opts.str("data"))),
        )
        .command(
            Command::new("update <ratePlanId>")
                .description("Update a rate plan (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    send_data(&format!("/v1/rm-rate-plans-ext/rate-plans/{}", c.arg(0)), "PUT", c.opts.str("data"))
                }),
        )
        .command(
            Command::new("patch <ratePlanId>")
                .description("Patch a rate plan (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    send_data(&format!("/v1/rm-rate-plans-ext/rate-plans/{}", c.arg(0)), "PATCH", c.opts.str("data"))
                }),
        )
        .command(
            Command::new("delete <ratePlanId>")
                .description("Remove a rate plan")
                .action(|c| method_print(&format!("/v1/rm-rate-plans-ext/rate-plans/{}", c.arg(0)), "DELETE")),
        )
        .command(
            Command::new("by-listing <listingId>")
                .description("Get rate plans for a property")
                .required_option("--channel <id>", "Channel ID (bookingCom, manual_reservations, booking_engine)")
                .option_default("--sort <field>", "Sort field", "name")
                .option_default("--limit <n>", "Max results", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let params = rate_plan_list_params(c)?;
                    let path = format!("/v1/rm-rate-plans-ext/rate-plans/listing/{}", c.arg(0));
                    print(&guesty_fetch(&path, Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("get-calendar <listingId> <ratePlanId>")
                .description("Get rate plan calendar for a property")
                .required_option("--from <date>", "Period start date (YYYY-MM-DD)")
                .required_option("--to <date>", "Period end date (YYYY-MM-DD)")
                .action(move |c| {
                    let (from, to) = (c.opts.str("from"), c.opts.str("to"));
                    date_range(from, to)?;
                    let params = params! { "fromDate" => from.unwrap_or(""), "toDate" => to.unwrap_or("") };
                    print(&guesty_fetch(&ari(c), Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("upsert-calendar <listingId> <ratePlanId>")
                .description("Upsert rate plan calendar (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(move |c| send_data(&ari(c), "PUT", c.opts.str("data"))),
        )
        .command(
            Command::new("assign-listings <ratePlanId>")
                .description("Assign properties to a rate plan (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let path = format!("/v1/rm-rate-plans-ext/rate-plans/{}/init-assign-listings", c.arg(0));
                    send_data(&path, "PUT", c.opts.str("data"))
                }),
        )
        .command(
            Command::new("unassign-listings <ratePlanId>")
                .description("Unassign properties from a rate plan (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let path = format!("/v1/rm-rate-plans-ext/rate-plans/{}/init-unassign-listings", c.arg(0));
                    send_data(&path, "PUT", c.opts.str("data"))
                }),
        )
}
