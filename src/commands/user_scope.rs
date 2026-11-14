//! Port of src/commands/user-scope.ts.

use crate::cli::Command;
use crate::client::{Fetch, guesty_fetch};
use crate::commands::properties::data_body;
use crate::output::print;

pub fn command() -> Command {
    Command::new("user-scope")
        .description("Manage user scope assignments")
        .command(
            Command::new("assign")
                .description("Assign user scope (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = data_body(c)?;
                    print(&guesty_fetch(
                        "/v1/user-scope/assign",
                        Fetch { method: "POST".into(), body: Some(body), ..Fetch::default() },
                    )?);
                    Ok(())
                }),
        )
        .command(Command::new("get <id>").description("Get user scope by ID").action(|c| {
            print(&guesty_fetch(&format!("/v1/user-scope/{}", c.arg(0)), Fetch::default())?);
            Ok(())
        }))
}
