//! Port of src/commands/guest-app.ts.

use crate::cli::Command;
use crate::client::{Fetch, guesty_fetch};
use crate::output::print;

pub fn command() -> Command {
    Command::new("guest-app").description("Guest app runtime data").command(
        Command::new("summary <reservationId> <moduleType>")
            .description("Get guest app module summary for a reservation")
            .action(|c| {
                let path = format!("/v1/guest-app-api/guest-app-runtime/{}/module/{}/summary", c.arg(0), c.arg(1));
                print(&guesty_fetch(&path, Fetch::default())?);
                Ok(())
            }),
    )
}
