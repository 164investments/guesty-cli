//! Port of src/commands/webhooks.ts.

use super::contacts::{fetch_print, method_print, send_data};
use crate::cli::Command;
use crate::client::{Fetch, guesty_fetch};
use crate::output::print;
use crate::params;

pub fn command() -> Command {
    Command::new("webhooks")
        .description("Manage webhooks")
        .command(Command::new("list").description("List all webhooks").action(|_| fetch_print("/v1/webhooks")))
        .command(
            Command::new("get <id>")
                .description("Get a webhook by ID")
                .action(|c| fetch_print(&format!("/v1/webhooks/{}", c.arg(0)))),
        )
        .command(
            Command::new("create")
                .description("Create a webhook (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/webhooks", "POST", c.opts.str("data"))),
        )
        .command(
            Command::new("update <id>")
                .description("Update a webhook (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/webhooks/{}", c.arg(0)), "PUT", c.opts.str("data"))),
        )
        .command(
            Command::new("delete <id>")
                .description("Delete a webhook")
                .action(|c| method_print(&format!("/v1/webhooks/{}", c.arg(0)), "DELETE")),
        )
        .command(
            Command::new("secret")
                .description("Get webhook secret")
                .required_option("--url <url>", "Registered webhook URL")
                .action(|c| {
                    let params = params! { "url" => c.opts.str("url").unwrap_or("") };
                    print(&guesty_fetch("/v1/webhooks-v2/secret", Fetch::get(params))?);
                    Ok(())
                }),
        )
}
