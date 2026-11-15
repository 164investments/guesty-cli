//! Port of src/commands/address.ts.

use crate::cli::{Call, Command};
use crate::client::{Fetch, guesty_fetch};
use crate::commands::properties::data_body;
use crate::output::print;

/// A command that sends the `--data` or stdin JSON body to `path`.
fn write(spec: &str, description: &str, method: &'static str, path: fn(&Call) -> String) -> Command {
    Command::new(spec).description(description).option("--data <json>", "JSON body").action(move |c| {
        let body = data_body(c)?;
        print(&guesty_fetch(&path(c), Fetch { method: method.into(), body: Some(body), ..Fetch::default() })?);
        Ok(())
    })
}

pub fn command() -> Command {
    Command::new("address")
        .description("Address geocoding and updates")
        .command(write("geocode", "Geocode an address (--data or stdin)", "POST", |_| "/v1/address/geocode".into()))
        .command(write("update <id>", "Update an address (--data or stdin)", "PUT", |c| {
            format!("/v1/address/{}/update", c.arg(0))
        }))
        .command(write("update-complex <id>", "Update a complex address (--data or stdin)", "PUT", |c| {
            format!("/v1/address/{}/update/complex", c.arg(0))
        }))
}
