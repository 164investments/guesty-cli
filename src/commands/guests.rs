//! Port of src/commands/guests.ts.

use super::contacts::send_data;
use super::query_options::{fields, integer, integer_in, json_object};
use crate::bail;
use crate::cli::Command;
use crate::client::{Fetch, Params, guesty_fetch};
use crate::json::{self, Json};
use crate::output::{print, warn_deprecated};
use crate::params;

const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;

pub fn command() -> Command {
    Command::new("guests")
        .description("Manage guests")
        .command(
            Command::new("list")
                .description("List/search guests")
                .option("--q <query>", "Unsupported by Guesty; use --filters instead")
                .option("--filters <json>", "JSON object of guest report filters")
                .option_default("--columns <cols>", "Columns to return (space- or comma-separated)", "id fullName guestEmail guestPhone")
                .option_default("--limit <n>", "Max results", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let o = &c.opts;
                    if o.has("q") {
                        bail!("Guesty's guests API does not support --q. Use --filters with guest report fields instead.");
                    }
                    let mut params = params! {
                        "columns" => fields(o.str("columns").unwrap_or(""))?,
                        "limit" => integer_in(o.str("limit").unwrap_or(""), "--limit", 1.0, MAX_SAFE_INTEGER)?,
                        "skip" => integer(o.str("skip").unwrap_or(""), "--skip")?,
                    };
                    if let Some(filters) = o.str("filters").filter(|v| !v.is_empty()) {
                        params.set("filters", json::compact(&Json::Object(json_object(filters, "--filters")?)));
                    }
                    print(&guesty_fetch("/v1/guests-crud", Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("get <id>")
                .description("Get a single guest by ID")
                .option_default("--fields <fields>", "Fields to return (space- or comma-separated)", "id firstName lastName fullName address")
                .action(|c| {
                    let params = params! { "fields" => fields(c.opts.str("fields").unwrap_or(""))? };
                    print(&guesty_fetch(&format!("/v1/guests-crud/{}", c.arg(0)), Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("create")
                .description("Create a guest (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/guests-crud", "POST", c.opts.str("data"))),
        )
        .command(
            Command::new("update <id>")
                .description("Update a guest (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/guests-crud/{}", c.arg(0)), "PUT", c.opts.str("data"))),
        )
        .command(
            Command::new("add-payment-method <id>")
                .description("[deprecated] Add a payment method to a guest (--data or stdin) — use 'payments create-method' instead")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated("guests add-payment-method", &["payments create-method"]);
                    send_data(&format!("/v1/guests/{}/payment-methods", c.arg(0)), "POST", c.opts.str("data"))
                }),
        )
        .command(
            Command::new("payment-methods <id>")
                .description("[deprecated] List payment methods for a guest — use 'payments methods' instead")
                .option("--reservation <id>", "Reservation context for its payment methods, including virtual credit cards")
                .action(|c| {
                    warn_deprecated(
                        "guests payment-methods",
                        &["payments methods --guest <id>", "payments methods --reservation <id>"],
                    );
                    let mut params = Params::new();
                    if let Some(r) = c.opts.str("reservation").filter(|v| !v.is_empty()) {
                        params.set("reservationId", r);
                    }
                    print(&guesty_fetch(&format!("/v1/guests/{}/payment-methods", c.arg(0)), Fetch::get(params))?);
                    Ok(())
                }),
        )
}
