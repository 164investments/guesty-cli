//! Port of src/commands/airbnb.ts.

use crate::cli::Command;
use crate::client::{Fetch, Params, get, guesty_fetch};
use crate::commands::query_options::date_range;
use crate::commands::reservations::json_body;
use crate::output::print;
use crate::stdin;

pub fn command() -> Command {
    Command::new("airbnb")
        .description("Airbnb listing expectations and resolutions")
        .command(
            Command::new("upsert-expectations <id>")
                .description("Upsert Airbnb listing expectations (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    let path = format!("/v1/airbnb-resource-service/listing-expectations/{}", c.arg(0));
                    print(&guesty_fetch(
                        &path,
                        Fetch { method: "PUT".into(), body: Some(json_body(body)), ..Fetch::default() },
                    )?);
                    Ok(())
                }),
        )
        .command(Command::new("get-expectations <id>").description("Get Airbnb listing expectations").action(|c| {
            let path = format!("/v1/airbnb-resource-service/listing-expectations/{}", c.arg(0));
            print(&guesty_fetch(&path, Fetch::default())?);
            Ok(())
        }))
        .command(
            Command::new("resolutions <guestyReservationId>")
                .description("List Airbnb resolutions for a reservation")
                .required_option("--from <date>", "Created on or after this ISO 8601 date-time")
                .required_option("--to <date>", "Created on or before this ISO 8601 date-time")
                .action(|c| {
                    let (from, to) = (c.opts.str("from"), c.opts.str("to"));
                    date_range(from, to)?;
                    let mut params = Params::new();
                    if let Some(from) = from.filter(|s| !s.is_empty()) {
                        params.set("from", from);
                    }
                    if let Some(to) = to.filter(|s| !s.is_empty()) {
                        params.set("to", to);
                    }
                    let path = format!("/v1/airbnb-resolutions-center/reservations/{}/resolutions", c.arg(0));
                    print(&get(&path, params)?);
                    Ok(())
                }),
        )
}
