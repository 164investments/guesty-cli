//! Port of src/commands/price-adjustments.ts.

use super::contacts::{fetch_print, send_data};
use super::query_options::integer;
use crate::cli::Command;
use crate::client::{Fetch, guesty_fetch};
use crate::output::print;
use crate::params;

pub fn command() -> Command {
    Command::new("price-adjustments")
        .alias("pa")
        .description("Manual price adjustments for reservations")
        .command(
            Command::new("create")
                .description("Create a manual total amount adjustment (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/price-adjustments/manual-total-amount", "POST", c.opts.str("data"))),
        )
        .command(
            Command::new("adjustable-line-items <reservationId>")
                .description("Get adjustable base and tax line items for a reservation")
                .option("--stay-index <n>", "Stay index for a mid-stay reservation (zero-based)")
                .action(|c| {
                    let params = match c.opts.str("stayIndex") {
                        Some(v) => Some(params! { "stayIndex" => integer(v, "--stay-index")? }),
                        None => None,
                    };
                    let fetch = Fetch { params, ..Fetch::default() };
                    print(&guesty_fetch(&format!("/v1/price-adjustments/adjustable-line-items/{}", c.arg(0)), fetch)?);
                    Ok(())
                }),
        )
        .command(
            Command::new("list <reservationId>")
                .description("List total amount adjustments for a reservation")
                .action(|c| fetch_print(&format!("/v1/price-adjustments/total-amount/{}", c.arg(0)))),
        )
}
