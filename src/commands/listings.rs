//! Port of src/commands/listings.ts.

use crate::cli::{Call, Command};
use crate::client::{Fetch, Params, ResponseType, guesty_fetch, paginate_all};
use crate::commands::properties::data_body;
use crate::commands::query_options::{fields, integer, integer_in};
use crate::error::{CliError, Result};
use crate::json::Json;
use crate::output::{Data, print, warn_deprecated, write_err};

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

/// Node's `writeFileSync` error. (`raw::node_fs_error` reports EISDIR as a
/// read, which is right only for `readFileSync`.)
fn write_error(e: &std::io::Error, path: &str) -> String {
    if e.kind() == std::io::ErrorKind::IsADirectory {
        return format!("EISDIR: illegal operation on a directory, open '{path}'");
    }
    super::raw::node_fs_error(e, "open", path)
}

pub fn command() -> Command {
    Command::new("listings")
        .alias("ls")
        .description("Manage listings")
        .command(
            Command::new("list")
                .description("List all listings")
                .option("--fields <fields>", "Fields to return (space- or comma-separated)")
                .option("--q <query>", "Search listing title, internal note, or full address")
                .option("--city <city>", "Filter by city")
                .option("--tags <tag>", "Filter by listing tag")
                .option("--ids <ids>", "Comma-separated listing IDs")
                .option("--view <id>", "Use a saved listing view")
                .option("--sort <field>", "Sort field, prefix with - for descending")
                .option_default("--limit <n>", "Max results", "100")
                .option_default("--skip <n>", "Offset", "0")
                .option("--all", "Fetch all pages")
                .option("--active", "Only active listings")
                .option("--inactive", "Only inactive listings")
                .action(|c| {
                    let o = &c.opts;
                    if o.flag("active") && o.flag("inactive") {
                        return Err(CliError::new("Use only one of --active and --inactive."));
                    }
                    let given = |key: &str| o.str(key).filter(|v| !v.is_empty());
                    let mut params = crate::params! {
                        "limit" => integer_in(o.str("limit").unwrap_or(""), "--limit", 1.0, 100.0)?,
                        "skip" => integer(o.str("skip").unwrap_or(""), "--skip")?,
                    };
                    if let Some(f) = given("fields") {
                        params.set("fields", fields(f)?);
                    }
                    if o.flag("active") {
                        params.set("active", true);
                    }
                    if o.flag("inactive") {
                        params.set("active", false);
                    }
                    for (option, param) in [("q", "q"), ("city", "city"), ("tags", "tags"), ("ids", "ids"), ("view", "viewId"), ("sort", "sort")] {
                        if let Some(v) = given(option) {
                            params.set(param, v);
                        }
                    }

                    if o.flag("all") {
                        let results = paginate_all("/v1/listings", &params, Some("results"))?;
                        print(&Data::Json(Json::Array(results)));
                        Ok(())
                    } else {
                        show("/v1/listings", Fetch::get(params))
                    }
                }),
        )
        .command(write("create", "Create a listing (--data or stdin)", "POST", |_| "/v1/listings".into()))
        .command(
            Command::new("get <id>")
                .description("Get a single listing by ID")
                .option("--fields <fields>", "Fields to return (space- or comma-separated)")
                .action(|c| {
                    let mut params = Params::new();
                    if let Some(f) = c.opts.str("fields").filter(|v| !v.is_empty()) {
                        params.set("fields", fields(f)?);
                    }
                    show(&format!("/v1/listings/{}", c.arg(0)), Fetch::get(params))
                }),
        )
        .command(write("update <id>", "Update a listing (--data or stdin)", "PUT", |c| format!("/v1/listings/{}", c.arg(0))))
        .command(
            Command::new("delete <id>")
                .description("Delete a listing")
                .action(|c| show(&format!("/v1/listings/{}", c.arg(0)), Fetch::method("DELETE"))),
        )
        .command(write("set-availability <id>", "Update listing availability settings (--data or stdin)", "PUT", |c| {
            format!("/v1/listings/{}/availability-settings", c.arg(0))
        }))
        .command(Command::new("cities").description("List all listing cities").action(|_| show("/v1/listings/cities", Fetch::default())))
        .command(Command::new("tags").description("List all listing tags").action(|_| show("/v1/listings/tags", Fetch::default())))
        .command(Command::new("payment-provider <id>").description("Get a listing payment provider ID").action(|c| {
            show(&format!("/v1/listings/{}", c.arg(0)), Fetch::get(crate::params! { "fields" => "paymentProviderId" }))
        }))
        .command(
            Command::new("custom-fields <id>")
                .description("[deprecated] Get custom fields for a listing — use 'properties custom-fields' instead")
                .action(|c| {
                    warn_deprecated("listings custom-fields", &["properties custom-fields <propertyId>"]);
                    show(&format!("/v1/listings/{}/custom-fields", c.arg(0)), Fetch::default())
                }),
        )
        .command(
            Command::new("set-custom-fields <id>")
                .description("[deprecated] Update listing custom fields (--data or stdin) — use 'properties set-custom-fields' instead")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated("listings set-custom-fields", &["properties set-custom-fields <propertyId>"]);
                    let body = data_body(c)?;
                    show(
                        &format!("/v1/listings/{}/custom-fields", c.arg(0)),
                        Fetch { method: "PUT".into(), body: Some(body), ..Fetch::default() },
                    )
                }),
        )
        .command(
            Command::new("custom-field <id> <fieldId>")
                .description("[deprecated] Get a single listing custom field — use 'properties custom-field' instead")
                .action(|c| {
                    warn_deprecated("listings custom-field", &["properties custom-field <propertyId> <fieldId>"]);
                    show(&format!("/v1/listings/{}/custom-fields/{}", c.arg(0), c.arg(1)), Fetch::default())
                }),
        )
        .command(
            Command::new("delete-custom-field <id> <fieldId>")
                .description("[deprecated] Delete a listing custom field — use 'properties delete-custom-field' instead")
                .action(|c| {
                    warn_deprecated("listings delete-custom-field", &["properties delete-custom-field <propertyId> <fieldId>"]);
                    show(&format!("/v1/listings/{}/custom-fields/{}", c.arg(0), c.arg(1)), Fetch::method("DELETE"))
                }),
        )
        .command(
            Command::new("financials <id>")
                .description("Get financial settings for a listing")
                .action(|c| show(&format!("/v1/financials/listing/{}", c.arg(0)), Fetch::default())),
        )
        .command(write("set-financials <id>", "Update financial settings for a listing (--data or stdin)", "PUT", |c| {
            format!("/v1/financials/listing/{}", c.arg(0))
        }))
        .command(Command::new("get-payment-provider <id>").description("Get the payment provider ID for a listing").action(|c| {
            show(&format!("/v1/listings/{}", c.arg(0)), Fetch::get(crate::params! { "fields" => "paymentProviderId" }))
        }))
        .command(
            Command::new("export-csv")
                .description("Export listings as CSV (--data or stdin)")
                .option("--data <json>", "JSON body")
                .option("--output <path>", "Write CSV output to a file")
                .action(|c| {
                    let body = data_body(c)?;
                    let data = guesty_fetch(
                        "/v1/listings.csv",
                        Fetch { method: "POST".into(), body: Some(body), response_type: ResponseType::Text, ..Fetch::default() },
                    )?;
                    if let Some(output) = c.opts.str("output").filter(|v| !v.is_empty()) {
                        let bytes = match &data {
                            Data::Text(t) => t.clone().into_bytes(),
                            Data::Bytes(b) => b.clone(),
                            Data::Json(j) => crate::json::js_string(j).into_bytes(),
                            // writeFileSync(path, undefined) after an empty (204/205) response.
                            Data::None => {
                                return Err(CliError::new(
                                    "The \"data\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received undefined",
                                ));
                            }
                        };
                        std::fs::write(output, bytes)
                            .map_err(|e| CliError::new(write_error(&e, output)))?;
                        write_err(&format!("Saved CSV to {output}\n"));
                        return Ok(());
                    }
                    print(&data);
                    Ok(())
                }),
        )
        .command(write("export-email", "Export listings via email (--data or stdin)", "POST", |_| "/v1/listings.email".into()))
        .command(Command::new("get-brand <propertyId>").description("Get brand by property ID").action(|c| {
            show(&format!("/v1/account-brands/properties/{}", c.arg(0)), Fetch::default())
        }))
}
