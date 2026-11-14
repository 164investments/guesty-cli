//! Port of src/commands/owners.ts.

#[path = "owner_statement_options.rs"]
pub mod owner_statement_options;

use crate::bail;
use crate::cli::{Command, Opt, Opts};
use crate::client::{Body, Fetch, Params, Part, ResponseType, guesty_fetch};
use crate::commands::query_options::{date, date_range_named, js_trim, json_object};
use crate::commands::raw::node_fs_error;
use crate::error::{CliError, Result};
use crate::json::{self, Json};
use crate::output::{Data, print, warn_deprecated, write_err};
use crate::stdin;

use super::accounting::send_data;
use owner_statement_options::{owner_statement_params, statement_options};

/// JavaScript's `parseInt(value)` (no radix): leading whitespace, an optional
/// sign, a `0x` prefix for hexadecimal, then the longest run of digits; NaN
/// when there are none.
fn parse_int(value: &str) -> f64 {
    let s = js_trim(value);
    let (negative, s) = match s.as_bytes().first() {
        Some(b'-') => (true, &s[1..]),
        Some(b'+') => (false, &s[1..]),
        _ => (false, s),
    };
    let (radix, s) = match s.get(..2) {
        Some("0x") | Some("0X") => (16, &s[2..]),
        _ => (10, s),
    };
    let end = s.find(|c: char| !c.is_digit(radix)).unwrap_or(s.len());
    let digits = &s[..end];
    if digits.is_empty() {
        return f64::NAN;
    }
    let magnitude = if radix == 10 {
        digits.parse::<f64>().unwrap_or(f64::NAN)
    } else {
        digits.chars().fold(0.0, |n, c| n * 16.0 + c.to_digit(16).unwrap_or(0) as f64)
    };
    if negative { -magnitude } else { magnitude }
}

/// `{ limit: parseInt(opts.limit), skip: parseInt(opts.skip) }`.
fn parse_int_page(opts: &Opts) -> Params {
    let mut params = Params::new();
    params.set("limit", parse_int(opts.str("limit").unwrap_or("")));
    params.set("skip", parse_int(opts.str("skip").unwrap_or("")));
    params
}

/// Node's `path.basename` for a POSIX path.
fn basename(path: &str) -> &str {
    let trimmed = path.trim_end_matches('/');
    trimmed.rsplit('/').next().unwrap_or(trimmed)
}

fn get_print(path: &str) -> Result<()> {
    print(&guesty_fetch(path, Fetch::default())?);
    Ok(())
}

/// `jsonObject(opts.data ?? await readStdin(), "--data or stdin")`.
fn data_object(opts: &Opts) -> Result<json::Map<String, Json>> {
    let text = match opts.str("data") {
        Some(data) => data.to_string(),
        None => stdin::read()?,
    };
    json_object(&text, "--data or stdin")
}

// Guesty's schema also lists IBAN and code as required for every payout type,
// including US bank accounts, so the CLI checks only the fields that every
// payout-method schema requires and leaves the rest to Guesty.
fn validate_payout_method(method: Option<&Json>, label: &str) -> Result<()> {
    let Some(Json::Object(item)) = method else {
        bail!("{label} must be an object.");
    };
    for key in ["type", "accountHolderName", "bankName", "accountNumber", "accountType"] {
        if !matches!(item.get(key), Some(Json::String(s)) if !js_trim(s).is_empty()) {
            bail!("{label}.{key} is required.");
        }
    }
    Ok(())
}

fn payout_method_command(name: &str, description: &str, method: &'static str) -> Command {
    Command::new(name).description(description).option("--data <json>", "JSON body").action(move |c| {
        let body = data_object(&c.opts)?;
        let body = Json::Object(body);
        validate_payout_method(Some(&body), "body")?;
        print(&guesty_fetch(&format!("/v1/payouts/owners/{}", c.arg(0)), Fetch::json(method, body))?);
        Ok(())
    })
}

pub fn command() -> Command {
    Command::new("owners")
        .description("Manage owners and ownerships")
        .command(
            statement_options(
                Command::new("statements")
                    .description("List owner statement metadata and PDF download URLs (valid for one hour)"),
            )
            .action(|c| {
                let params = owner_statement_params(&c.opts, None)?;
                print(&guesty_fetch("/v1/owner-statement-api/owner-statements", Fetch::get(params))?);
                Ok(())
            }),
        )
        .command(
            Command::new("bulk-create")
                .description("Create multiple owners with assigned listings (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/owners/bulk", "POST", &c.opts)),
        )
        .command(
            Command::new("list")
                .description("List all owners")
                .option_default("--limit <n>", "Max results", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    print(&guesty_fetch("/v1/owners", Fetch::get(parse_int_page(&c.opts)))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("get <ownerId>")
                .description("Get a single owner")
                .action(|c| get_print(&format!("/v1/owners/{}", c.arg(0)))),
        )
        .command(
            Command::new("create")
                .description("Create an owner (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/owners", "POST", &c.opts)),
        )
        .command(
            Command::new("update <ownerId>")
                .description("Update an owner (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/owners/{}", c.arg(0)), "PUT", &c.opts)),
        )
        .command(Command::new("delete <ownerId>").description("Delete an owner").action(|c| {
            print(&guesty_fetch(&format!("/v1/owners/{}", c.arg(0)), Fetch::method("DELETE"))?);
            Ok(())
        }))
        .command(
            Command::new("ownerships <listingId>")
                .description("Get ownerships for a listing")
                .action(|c| get_print(&format!("/v1/owners/listings/{}/ownerships", c.arg(0)))),
        )
        .command(
            Command::new("set-ownerships <listingId>")
                .description("Set ownerships for a listing (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/owners/listings/{}/ownerships", c.arg(0)), "PUT", &c.opts)),
        )
        .command(
            Command::new("owner-ownerships <ownerId>")
                .description("Get listing ownerships for an owner")
                .action(|c| get_print(&format!("/v1/owners/{}/ownerships", c.arg(0)))),
        )
        .command(
            Command::new("reservations")
                .description("[deprecated] List owner reservations; Guesty documents no replacement")
                .option_default("--limit <n>", "Max results", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    warn_deprecated("owners reservations", &[]);
                    print(&guesty_fetch("/v1/owners-reservations", Fetch::get(parse_int_page(&c.opts)))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("reservation <id>")
                .description("[deprecated] Get an owner reservation by ID — use 'reservations get' instead")
                .action(|c| {
                    warn_deprecated("owners reservation", &["reservations get <id>"]);
                    get_print(&format!("/v1/owners-reservations/{}", c.arg(0)))
                }),
        )
        .command(
            Command::new("update-reservation <id>")
                .description(
                    "[deprecated] Update an owner reservation (--data or stdin); Guesty documents no replacement",
                )
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated("owners update-reservation", &[]);
                    send_data(&format!("/v1/owners-reservations/{}", c.arg(0)), "PUT", &c.opts)
                }),
        )
        .command(
            Command::new("create-guest <ownerId>")
                .description("Create a guest for an owner")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/owners/{}/guest", c.arg(0)), "POST", &c.opts)),
        )
        .command(
            Command::new("list-documents <ownerId>")
                .description("List documents for an owner")
                .action(|c| get_print(&format!("/v1/owners/{}/documents", c.arg(0)))),
        )
        .command(
            Command::new("create-document <ownerId>")
                .description("Upload a PDF document for an owner (maximum 5 MB)")
                .required_option("--data-file <path>", "Path to the PDF document")
                .required_option("--name <name>", "Document name")
                .option("--description <text>", "Document description")
                .add_option(
                    Opt::new("--type <type>", "Document type")
                        .choices(&["DOCUMENT", "CONTRACT", "OWNER1099_COPYB", "OWNER1099_COPY2"])
                        .default("DOCUMENT"),
                )
                .option("--shared", "Make the document visible in the Owners Portal")
                .option("--start-date <date>", "Effective date (YYYY-MM-DD)")
                .option("--end-date <date>", "Expiration date (YYYY-MM-DD)")
                .action(|c| {
                    let o = &c.opts;
                    let (start, end) = (o.str("startDate"), o.str("endDate"));
                    if let Some(start) = start.filter(|v| !v.is_empty()) {
                        date(start, "--start-date")?;
                    }
                    if let Some(end) = end.filter(|v| !v.is_empty()) {
                        date(end, "--end-date")?;
                    }
                    date_range_named(start, end, "--start-date", "--end-date")?;
                    let file = o.str("dataFile").unwrap_or("");
                    let bytes = std::fs::read(file).map_err(|e| CliError::new(node_fs_error(&e, "open", file)))?;
                    if bytes.len() > 5 * 1024 * 1024 {
                        bail!("Owner documents must not exceed 5 MB.");
                    }
                    let text = |name: &str, value: &str| Part::Text { name: name.into(), value: value.into() };
                    let mut parts = vec![
                        Part::File {
                            name: "file".into(),
                            filename: basename(file).into(),
                            content_type: "application/pdf".into(),
                            data: bytes,
                        },
                        text("name", o.str("name").unwrap_or("")),
                        text("type", o.str("type").unwrap_or("")),
                        text("isShared", if o.flag("shared") { "true" } else { "false" }),
                    ];
                    if let Some(description) = o.str("description") {
                        parts.push(text("description", description));
                    }
                    if let Some(start) = start.filter(|v| !v.is_empty()) {
                        parts.push(text("startDate", start));
                    }
                    if let Some(end) = end.filter(|v| !v.is_empty()) {
                        parts.push(text("endDate", end));
                    }
                    let path = format!("/v1/owners/{}/documents", c.arg(0));
                    let fetch = Fetch { method: "POST".into(), body: Some(Body::Multipart(parts)), ..Fetch::default() };
                    print(&guesty_fetch(&path, fetch)?);
                    Ok(())
                }),
        )
        .command(
            Command::new("get-document <ownerId> <documentId>")
                .description("Get a document for an owner")
                .action(|c| get_print(&format!("/v1/owners/{}/documents/{}", c.arg(0), c.arg(1)))),
        )
        .command(
            Command::new("update-document <ownerId> <documentId>")
                .description("Update a document for an owner (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    send_data(&format!("/v1/owners/{}/documents/{}", c.arg(0), c.arg(1)), "PATCH", &c.opts)
                }),
        )
        .command(
            Command::new("delete-document <ownerId> <documentId>")
                .description("Delete a document for an owner")
                .action(|c| {
                    let path = format!("/v1/owners/{}/documents/{}", c.arg(0), c.arg(1));
                    print(&guesty_fetch(&path, Fetch::method("DELETE"))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("download-document <ownerId> <documentId>")
                .description("Download a document for an owner")
                .option("--output <path>", "Write the downloaded document to a file")
                .action(|c| {
                    let path = format!("/v1/owners/{}/documents/{}/download", c.arg(0), c.arg(1));
                    let data =
                        guesty_fetch(&path, Fetch { response_type: ResponseType::Buffer, ..Fetch::default() })?;
                    if let Some(output) = c.opts.str("output").filter(|v| !v.is_empty()) {
                        let bytes = match data {
                            Data::Bytes(b) => b,
                            // writeFileSync(path, undefined) after a 204.
                            _ => bail!(
                                "The \"data\" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received undefined"
                            ),
                        };
                        std::fs::write(output, bytes).map_err(|e| CliError::new(node_fs_error(&e, "open", output)))?;
                        write_err(&format!("Saved document to {output}\n"));
                        return Ok(());
                    }
                    print(&data);
                    Ok(())
                }),
        )
        // ─── Owner payout methods ────────────────────────────────────────────
        .command(
            Command::new("payout-method <ownerId>")
                .description("Get an owner's payout method")
                .action(|c| get_print(&format!("/v1/payouts/owners/{}", c.arg(0)))),
        )
        .command(payout_method_command(
            "create-payout-method <ownerId>",
            "Create an owner's payout method (--data or stdin: type, accountHolderName, bankName, accountNumber, accountType, ...)",
            "POST",
        ))
        .command(payout_method_command(
            "update-payout-method <ownerId>",
            "Replace an owner's payout method (--data or stdin: type, accountHolderName, bankName, accountNumber, accountType, ...)",
            "PUT",
        ))
        .command(
            Command::new("bulk-create-payout-methods")
                .description(
                    "Create payout methods for several owners (--data or stdin: {items: [{entityId, payoutMethod}]})",
                )
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = data_object(&c.opts)?;
                    let items = match body.get("items") {
                        Some(Json::Array(items)) if !items.is_empty() => items,
                        _ => bail!("The request body needs a nonempty items array."),
                    };
                    for (index, entry) in items.iter().enumerate() {
                        let item = entry.as_object();
                        if !matches!(item.and_then(|i| i.get("entityId")), Some(Json::String(s)) if !s.is_empty()) {
                            bail!("items[{index}].entityId is required.");
                        }
                        let method = item.and_then(|i| i.get("payoutMethod"));
                        validate_payout_method(method, &format!("items[{index}].payoutMethod"))?;
                    }
                    print(&guesty_fetch("/v1/payouts/owners/bulk", Fetch::json("POST", Json::Object(body)))?);
                    Ok(())
                }),
        )
}
