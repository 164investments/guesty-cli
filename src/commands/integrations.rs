//! Port of src/commands/integrations.ts.

use super::contacts::{fetch_print, method_print, parse_int, send_data};
use super::rate_plans::rate_plan_list_params;
use crate::cli::Command;
use crate::client::{Fetch, guesty_fetch};
use crate::output::{print, warn_deprecated};
use crate::params;

pub fn command() -> Command {
    Command::new("integrations")
        .alias("int")
        .description("Manage integrations and channels")
        .command(Command::new("list").description("List all integrations").action(|_| fetch_print("/v1/integrations")))
        .command(
            Command::new("create")
                .description("[deprecated] Create an integration (--data or stdin); Guesty documents no replacement")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated("integrations create", &[]);
                    send_data("/v1/integrations", "POST", c.opts.str("data"))
                }),
        )
        .command(
            Command::new("get <id>")
                .description("Get an integration by ID")
                .action(|c| fetch_print(&format!("/v1/integrations/{}", c.arg(0)))),
        )
        .command(
            Command::new("update <id>")
                .description("[deprecated] Update an integration (--data or stdin); Guesty documents no replacement")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated("integrations update", &[]);
                    send_data(&format!("/v1/integrations/{}", c.arg(0)), "PUT", c.opts.str("data"))
                }),
        )
        .command(
            Command::new("channels")
                .description("List supported marketing channels")
                .action(|_| fetch_print("/v1/marketing/channels")),
        )
        .command(
            Command::new("promotions")
                .description("List all promotions")
                .action(|_| fetch_print("/v1/rm-promotions/promotions")),
        )
        .command(
            Command::new("rate-plans")
                .description("List rate plans for a channel")
                .required_option("--channel <id>", "Channel ID (bookingCom, manual_reservations, booking_engine)")
                .option_default("--sort <field>", "Sort field", "name")
                .option_default("--limit <n>", "Max results", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let params = rate_plan_list_params(c)?;
                    print(&guesty_fetch("/v1/rm-rate-plans-ext/rate-plans", Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("rate-plan <id>")
                .description("Get a rate plan by ID")
                .action(|c| fetch_print(&format!("/v1/rm-rate-plans-ext/rate-plans/{}", c.arg(0)))),
        )
        .command(
            Command::new("views")
                .description("List all views")
                .required_option("--section <section>", "Section: listings or reservations")
                .option_default("--limit <n>", "Max results", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let o = &c.opts;
                    let params = params! {
                        "section" => o.str("section").unwrap_or(""),
                        "limit" => parse_int(o.str("limit").unwrap_or("")),
                        "skip" => parse_int(o.str("skip").unwrap_or("")),
                    };
                    print(&guesty_fetch("/v1/views", Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("create-view")
                .description("Create a view (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/views", "POST", c.opts.str("data"))),
        )
        .command(
            Command::new("view <id>")
                .description("Get a view by ID")
                .action(|c| fetch_print(&format!("/v1/views/{}", c.arg(0)))),
        )
        .command(
            Command::new("update-view <id>")
                .description("Update a view (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/views/{}", c.arg(0)), "PUT", c.opts.str("data"))),
        )
        .command(
            Command::new("delete-view <id>")
                .description("Delete a view")
                .action(|c| method_print(&format!("/v1/views/{}", c.arg(0)), "DELETE")),
        )
}
