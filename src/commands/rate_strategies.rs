//! Port of src/commands/rate-strategies.ts.

use super::contacts::fetch_print;
use crate::cli::Command;

pub fn command() -> Command {
    Command::new("rate-strategies")
        .alias("rs")
        .description("Manage rate strategies")
        .command(
            Command::new("list")
                .description("List all rate strategies")
                .action(|_| fetch_print("/v1/rm-rate-strategies-open-api/rate-strategies")),
        )
        .command(
            Command::new("get <unitTypeId>").description("Get rate strategy for a property").action(|c| {
                fetch_print(&format!("/v1/rm-rate-strategies-open-api/rate-strategies/unitType/{}", c.arg(0)))
            }),
        )
}
