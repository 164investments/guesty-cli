//! Port of src/commands/block-logs.ts.

use crate::cli::Command;
use crate::client::{Params, get};
use crate::output::print;

pub fn command() -> Command {
    Command::new("block-logs").description("Calendar block logs").command(
        Command::new("list")
            .description("List block logs")
            .option("--listing <id>", "Filter by listing ID")
            .option("--user <name>", "Filter by user name")
            .option("--start-date <date>", "Filter by block start date")
            .option("--end-date <date>", "Filter by block end date")
            .option("--block-type <type>", "Filter by block type (manual, preparation_time)")
            .option("--event-type <type>", "Filter by event type (created, updated, removed)")
            .action(|c| {
                let mut params = Params::new();
                for (key, param) in [
                    ("listing", "listingId"),
                    ("user", "userName"),
                    ("startDate", "startDate"),
                    ("endDate", "endDate"),
                    ("blockType", "blockType"),
                    ("eventType", "eventType"),
                ] {
                    if let Some(v) = c.opts.str(key).filter(|s| !s.is_empty()) {
                        params.set(param, v);
                    }
                }
                print(&get("/v1/api/block-logs", params)?);
                Ok(())
            }),
    )
}
