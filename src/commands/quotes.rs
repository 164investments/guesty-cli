//! Port of src/commands/quotes.ts.

use crate::cli::Command;
use crate::client::{Fetch, guesty_fetch};
use crate::commands::reservations::json_body;
use crate::error::Result;
use crate::json::Json;
use crate::output::print;
use crate::stdin;

fn post(path: &str, body: Json) -> Result<()> {
    print(&guesty_fetch(path, Fetch { method: "POST".into(), body: Some(json_body(body)), ..Fetch::default() })?);
    Ok(())
}

pub fn command() -> Command {
    Command::new("quotes")
        .description("Manage quotes")
        .command(Command::new("get <quoteId>").description("Get a quote by ID").action(|c| {
            print(&guesty_fetch(&format!("/v1/quotes/{}", c.arg(0)), Fetch::default())?);
            Ok(())
        }))
        .command(
            Command::new("create")
                .description("Create a quote (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| post("/v1/quotes", stdin::data_or_stdin(c.opts.str("data"))?)),
        )
        .command(
            Command::new("create-multiple")
                .description("Create multiple quotes (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| post("/v1/quotes/multiple", stdin::data_or_stdin(c.opts.str("data"))?)),
        )
        .command(
            Command::new("add-coupons <quoteId>")
                .description("Add coupons to an existing quote (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    post(&format!("/v1/quotes/{}/coupons", c.arg(0)), body)
                }),
        )
}
