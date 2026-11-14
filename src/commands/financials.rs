//! Port of src/commands/financials.ts.

use crate::bail;
use crate::cli::Command;
use crate::client::{Fetch, guesty_fetch};
use crate::commands::query_options::js_trim;
use crate::error::Result;
use crate::json;
use crate::output::print;
use crate::params;

use super::accounting::accounting_options::{journal_options, journal_params};
use super::accounting::send_data;
use super::owners::owner_statement_options::{owner_statement_params, statement_options};

/// The three guest-folio reads: up to 200 reservation IDs and a field list,
/// both sent comma-separated.
fn folio_command(name: &str, description: &str, fields_description: &str, path: &'static str) -> Command {
    Command::new(name)
        .description(description)
        .required_option("--reservations <ids>", "Comma-separated reservation IDs (max 200)")
        .required_option("--fields <fields>", fields_description)
        .action(move |c| {
            let ids: Vec<&str> = c.opts.str("reservations").unwrap_or("").split(',').map(js_trim).collect();
            if ids.is_empty() || ids.len() > 200 || ids.iter().any(|id| json::js_len(id) != 24) {
                bail!("--reservations must contain 1-200 comma-separated reservation IDs of 24 characters each.");
            }
            let fields: Vec<&str> = c.opts.str("fields").unwrap_or("").split(',').map(js_trim).collect();
            if fields.iter().any(|value| value.is_empty()) {
                bail!("--fields must contain at least one field and no empty entries.");
            }
            let params = params! { "reservationIds" => ids.join(","), "fields" => fields.join(",") };
            print(&guesty_fetch(path, Fetch::get(params))?);
            Ok(())
        })
}

fn get_print(path: &str) -> Result<()> {
    print(&guesty_fetch(path, Fetch::default())?);
    Ok(())
}

pub fn command() -> Command {
    Command::new("financials")
        .alias("fin")
        .description("Financial data and accounting")
        .command(
            Command::new("balance <reservationId>")
                .description("Get folio balance for a reservation")
                .action(|c| get_print(&format!("/v1/accounting-api/reservations/{}/balance", c.arg(0)))),
        )
        .command(
            journal_options(Command::new("journal-entries").description("List recognized journal entries")).action(
                |c| {
                    let params = journal_params(&c.opts)?;
                    print(&guesty_fetch("/v1/accounting-api/journal-entries", Fetch::get(params))?);
                    Ok(())
                },
            ),
        )
        .command(
            Command::new("categories")
                .description("List accounting categories")
                .action(|_| get_print("/v1/accounting-api/categories")),
        )
        .command(
            Command::new("listing <listingId>")
                .description("Get financial settings for a listing")
                .action(|c| get_print(&format!("/v1/financials/listing/{}", c.arg(0)))),
        )
        .command(
            statement_options(
                Command::new("owner-statement <listingId>")
                    .description("List actual owner statements covering a listing"),
            )
            .action(|c| {
                let params = owner_statement_params(&c.opts, Some(c.arg(0)))?;
                print(&guesty_fetch("/v1/owner-statement-api/owner-statements", Fetch::get(params))?);
                Ok(())
            }),
        )
        .command(folio_command(
            "folio-overview",
            "Read selected financial totals for up to 200 reservations",
            "Comma-separated API field names; nested fields require leaf paths",
            "/v1/guest-folio/overview",
        ))
        .command(folio_command(
            "folio-invoice-items",
            "Read selected invoice item data for up to 200 reservations",
            "Comma-separated API field names; nested fields require leaf paths",
            "/v1/guest-folio/invoice-items",
        ))
        .command(folio_command(
            "folio-settings-snapshot",
            "Read the tax, fee, commission, and currency settings used to calculate up to 200 reservations",
            "Comma-separated snapshot fields, such as taxes.name,taxes.amount,currencyConversion",
            "/v1/guest-folio/settings-snapshot",
        ))
        .command(
            Command::new("update-listing <listingId>")
                .description("Update financial data for a listing (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/financials/listing/{}", c.arg(0)), "PUT", &c.opts)),
        )
}
