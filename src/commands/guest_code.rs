//! Port of src/commands/guest-code.ts.

use crate::cli::Command;
use crate::client::{Params, get};
use crate::output::print;

pub fn command() -> Command {
    Command::new("guest-code").description("Guest access codes").command(
        Command::new("get")
            .description("Get guest codes")
            .required_option("--reservation <id>", "Reservation ID")
            .action(|c| {
                let mut params = Params::new();
                if let Some(id) = c.opts.str("reservation").filter(|s| !s.is_empty()) {
                    params.set("reservationId", id);
                }
                print(&get("/v1/guest-code", params)?);
                Ok(())
            }),
    )
}
