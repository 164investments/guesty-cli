//! Port of src/commands/additional-fees.ts.

use crate::cli::Command;
use crate::client::{Fetch, Params, get, guesty_fetch};
use crate::output::print;
use crate::stdin;

/// A `--data`-or-stdin command that sends its JSON body to `path(id)`.
fn body_command(spec: &str, description: &str, method: &'static str, path: fn(&crate::cli::Call) -> String) -> Command {
    Command::new(spec).description(description).option("--data <json>", "JSON body").action(move |c| {
        let body = stdin::data_or_stdin(c.opts.str("data"))?;
        print(&guesty_fetch(&path(c), Fetch::json(method, body))?);
        Ok(())
    })
}

pub fn command() -> Command {
    Command::new("additional-fees")
        .alias("fees")
        .description("Manage additional fees")
        // --- Account-level fees ---
        .command(Command::new("list-account").description("List account-level fees").action(|_| {
            print(&get("/v1/additional-fees/account", Params::new())?);
            Ok(())
        }))
        .command(body_command("create-account", "Create an account-level fee (--data or stdin)", "POST", |_| {
            "/v1/additional-fees/account".to_string()
        }))
        // --- Listing-level fees ---
        .command(Command::new("list-listing <listingId>").description("List fees for a listing").action(|c| {
            print(&get(&format!("/v1/additional-fees/listing/{}", c.arg(0)), Params::new())?);
            Ok(())
        }))
        .command(body_command(
            "create-listing <listingId>",
            "Create a listing-level fee (--data or stdin)",
            "POST",
            |c| format!("/v1/additional-fees/listing/{}", c.arg(0)),
        ))
        // --- Fee operations ---
        .command(body_command("update <id>", "Update a fee (--data or stdin)", "PATCH", |c| {
            format!("/v1/additional-fees/{}", c.arg(0))
        }))
        .command(Command::new("delete <id>").description("Delete a fee").action(|c| {
            print(&guesty_fetch(&format!("/v1/additional-fees/{}", c.arg(0)), Fetch::method("DELETE"))?);
            Ok(())
        }))
        // --- Quote & inquiry ---
        .command(body_command(
            "calculate <quoteId>",
            "Calculate fee amount for a quote (--data or stdin)",
            "POST",
            |c| format!("/v1/additional-fees/quotes/{}/amount", c.arg(0)),
        ))
        .command(body_command(
            "add-upsell <inquiryId>",
            "Add upsell fee to an inquiry (--data or stdin)",
            "POST",
            |c| format!("/v1/additional-fees/inquiries/{}/upsells", c.arg(0)),
        ))
}
