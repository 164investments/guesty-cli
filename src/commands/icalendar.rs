//! Port of src/commands/icalendar.ts.

use crate::cli::{Call, Command, Opt};
use crate::client::{Fetch, guesty_fetch};
use crate::commands::properties::data_body;
use crate::error::Result;
use crate::output::print;

const EXPORTED: &str = "/v1/icalendar-api/exported-calendars";
const IMPORTED: &str = "/v1/icalendar-api/imported-calendars";

fn show(path: &str, fetch: Fetch) -> Result<()> {
    print(&guesty_fetch(path, fetch)?);
    Ok(())
}

/// A command that sends the `--data` or stdin JSON body to `path`.
fn write(spec: &str, description: &str, method: &'static str, path: fn(&Call) -> String) -> Command {
    Command::new(spec).description(description).option("--data <json>", "JSON body").action(move |c| {
        let body = data_body(c)?;
        show(&path(c), Fetch { method: method.into(), body: Some(body), ..Fetch::default() })
    })
}

pub fn command() -> Command {
    Command::new("icalendar")
        .alias("ical")
        .description("Manage iCalendar exported and imported calendars")
        // --- Exported calendars ---
        .command(
            Command::new("list-exported")
                .description("List exported calendars")
                .required_option("--listing <id>", "Listing ID")
                .action(|c| {
                    show(EXPORTED, Fetch::get(crate::params! { "listingId" => c.opts.str("listing").unwrap_or("") }))
                }),
        )
        .command(
            Command::new("get-exported <id>")
                .description("Get an exported calendar by ID")
                .action(|c| show(&format!("{EXPORTED}/{}", c.arg(0)), Fetch::default())),
        )
        .command(write("create-exported", "Create an exported calendar (--data or stdin)", "POST", |_| EXPORTED.into()))
        .command(write("update-exported <id>", "Update an exported calendar (--data or stdin)", "PUT", |c| {
            format!("{EXPORTED}/{}", c.arg(0))
        }))
        .command(
            Command::new("delete-exported <id>")
                .description("Delete an exported calendar")
                .action(|c| show(&format!("{EXPORTED}/{}", c.arg(0)), Fetch::method("DELETE"))),
        )
        // --- Imported calendars ---
        .command(
            Command::new("list-imported")
                .description("List imported calendars")
                .required_option("--listing <id>", "Listing ID")
                .action(|c| {
                    show(IMPORTED, Fetch::get(crate::params! { "listingId" => c.opts.str("listing").unwrap_or("") }))
                }),
        )
        .command(
            Command::new("get-imported <id>")
                .description("Get an imported calendar by ID")
                .action(|c| show(&format!("{IMPORTED}/{}", c.arg(0)), Fetch::default())),
        )
        .command(write("import", "Import a calendar (--data or stdin)", "POST", |_| IMPORTED.into()))
        .command(write("update-imported <id>", "Update an imported calendar (--data or stdin)", "PUT", |c| {
            format!("{IMPORTED}/{}", c.arg(0))
        }))
        .command(
            Command::new("delete-imported <id>")
                .description("Delete an imported calendar")
                .add_option(
                    Opt::new("--strategy <strategy>", "How to handle existing imported events")
                        .choices(&[
                            "remove_all_channel_events",
                            "remove_past_channel_events",
                            "remove_future_channel_events",
                            "preserve_channel_events",
                        ])
                        .mandatory(),
                )
                .action(|c| {
                    let params = crate::params! { "strategy" => c.opts.str("strategy").unwrap_or("") };
                    show(&format!("{IMPORTED}/{}", c.arg(0)), Fetch::method("DELETE").with_params(params))
                }),
        )
        .command(
            Command::new("pause <id>")
                .description("Pause an imported calendar")
                .action(|c| show(&format!("{IMPORTED}/{}/pause", c.arg(0)), Fetch::method("POST"))),
        )
        .command(
            Command::new("resume <id>")
                .description("Resume an imported calendar")
                .action(|c| show(&format!("{IMPORTED}/{}/resume", c.arg(0)), Fetch::method("POST"))),
        )
}
