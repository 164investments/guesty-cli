//! Port of src/commands/accounts.ts.

use super::accounting::send_data;
use crate::cli::Command;
use crate::client::{Fetch, guesty_fetch};
use crate::error::Result;
use crate::output::print;

fn fetch_print(path: &str, fetch: Fetch) -> Result<()> {
    print(&guesty_fetch(path, fetch)?);
    Ok(())
}

pub fn command() -> Command {
    Command::new("accounts")
        .alias("acct-fields")
        .description("Account custom fields and info")
        .command(
            Command::new("me")
                .description("Get current account info")
                .action(|_| fetch_print("/v1/accounts/me", Fetch::default())),
        )
        .command(
            Command::new("list-custom-fields <id>")
                .description("List custom fields for an account")
                .action(|c| fetch_print(&format!("/v1/accounts/{}/custom-fields", c.arg(0)), Fetch::default())),
        )
        .command(
            Command::new("create-custom-field <id>")
                .description("Create a custom field (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/accounts/{}/custom-fields", c.arg(0)), "POST", &c.opts)),
        )
        .command(
            Command::new("update-custom-field <id>")
                .description("Update a custom field (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/accounts/{}/custom-fields", c.arg(0)), "PUT", &c.opts)),
        )
        .command(Command::new("get-custom-field <id> <fieldId>").description("Get a specific custom field").action(
            |c| fetch_print(&format!("/v1/accounts/{}/custom-fields/{}", c.arg(0), c.arg(1)), Fetch::default()),
        ))
        .command(Command::new("delete-custom-field <id> <fieldId>").description("Delete a custom field").action(|c| {
            let path = format!("/v1/accounts/{}/custom-fields/{}", c.arg(0), c.arg(1));
            fetch_print(&path, Fetch::method("DELETE"))
        }))
}
