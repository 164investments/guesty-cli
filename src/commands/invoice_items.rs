//! Port of src/commands/invoice-items.ts.

use crate::cli::Command;

use super::accounting::send_data;

pub fn command() -> Command {
    Command::new("invoice-items").alias("ii").description("Manage reservation invoice items").command(
        Command::new("create <reservationId>")
            .description("Create an invoice item for a reservation (--data or stdin)")
            .option("--data <json>", "JSON body")
            .action(|c| send_data(&format!("/v1/invoice-items/reservation/{}", c.arg(0)), "POST", &c.opts)),
    )
}
