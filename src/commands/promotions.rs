//! Port of src/commands/promotions.ts.

use super::contacts::send_data;
use crate::cli::Command;
use crate::client::{Fetch, guesty_fetch};
use crate::output::print;
use crate::params;

pub fn command() -> Command {
    Command::new("promotions")
        .alias("promo")
        .description("Manage promotion property assignments")
        .command(
            Command::new("assign-properties <promotionId>")
                .description("Assign properties to a promotion (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    send_data(&format!("/v1/rm-promotions/promotions/{}/assign", c.arg(0)), "PUT", c.opts.str("data"))
                }),
        )
        .command(
            Command::new("unassign-properties <promotionId>")
                .description("Unassign properties from a promotion (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    send_data(&format!("/v1/rm-promotions/promotions/{}/unassign", c.arg(0)), "PUT", c.opts.str("data"))
                }),
        )
        .command(
            Command::new("list-properties <promotionId>")
                .description("List properties assigned to a promotion")
                .option("--include-children", "Include child listings")
                .action(|c| {
                    let params = params! { "includeChildren" => c.opts.flag("includeChildren") };
                    let path = format!("/v1/rm-promotions/promotions/{}/listings", c.arg(0));
                    print(&guesty_fetch(&path, Fetch::get(params))?);
                    Ok(())
                }),
        )
}
