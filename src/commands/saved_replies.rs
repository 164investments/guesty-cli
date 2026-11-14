//! Port of src/commands/saved-replies.ts.

use super::contacts::{fetch_print, send_data};
use crate::cli::Command;
use crate::client::{Fetch, ResponseType, guesty_fetch};
use crate::output::print;

pub fn command() -> Command {
    Command::new("saved-replies")
        .alias("replies")
        .description("Manage saved replies")
        .command(Command::new("list").description("List saved replies").action(|_| fetch_print("/v1/saved-replies")))
        .command(
            Command::new("get <replyId>")
                .description("Get a saved reply by ID")
                .action(|c| fetch_print(&format!("/v1/saved-replies/{}", c.arg(0)))),
        )
        .command(
            Command::new("create")
                .description("Create a saved reply (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/saved-replies", "POST", c.opts.str("data"))),
        )
        .command(
            Command::new("update <replyId>")
                .description("Update a saved reply (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/saved-replies/{}", c.arg(0)), "PUT", c.opts.str("data"))),
        )
        .command(Command::new("delete <replyId>").description("Delete a saved reply").action(|c| {
            let fetch = Fetch { response_type: ResponseType::Text, ..Fetch::method("DELETE") };
            print(&guesty_fetch(&format!("/v1/saved-replies/{}", c.arg(0)), fetch)?);
            Ok(())
        }))
        .command(
            Command::new("by-listing <listingId>")
                .description("Get saved replies for a listing")
                .action(|c| fetch_print(&format!("/v1/saved-replies/listing/{}", c.arg(0)))),
        )
}
