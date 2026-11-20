//! Port of src/commands/accounting.ts.

#[path = "accounting_options.rs"]
pub mod accounting_options;

use crate::bail;
use crate::cli::{Command, Opt, Opts};
use crate::client::{Body, Fetch, Params, guesty_fetch};
use crate::commands::query_options::{
    collect, date_range, date_range_named, empty_list, integer, integer_in, js_trim, json_object,
};
use crate::error::Result;
use crate::json::{self, Json};
use crate::output::print;
use crate::stdin;

use accounting_options::{journal_options, journal_params};

const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;

/// `print(await guestyFetch(path))`.
fn get_print(path: &str) -> Result<()> {
    print(&guesty_fetch(path, Fetch::default())?);
    Ok(())
}

/// A request with a parsed JSON body. Node's client sent a string body as
/// is (as text/plain), not JSON-encoded, so `--data '"x"'` sends `x`.
pub(super) fn json_fetch(method: &str, body: Json) -> Fetch {
    match body {
        Json::String(text) => Fetch { method: method.to_string(), body: Some(Body::Text(text)), ..Fetch::default() },
        body => Fetch::json(method, body),
    }
}

/// `print(await guestyFetch(path, { method, body: <--data or stdin JSON> }))`.
pub(super) fn send_data(path: &str, method: &str, opts: &Opts) -> Result<()> {
    let body = stdin::data_or_stdin(opts.str("data"))?;
    print(&guesty_fetch(path, json_fetch(method, body))?);
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

/// Copies each truthy option into the params under its API name.
fn map_truthy(params: &mut Params, opts: &Opts, mappings: &[(&str, &str)]) {
    for (option, param) in mappings {
        if let Some(value) = opts.str(option).filter(|v| !v.is_empty()) {
            params.set(param, value);
        }
    }
}

fn limit_skip(opts: &Opts, key: &str, min: f64, max: f64) -> Result<Params> {
    let mut params = Params::new();
    params.set(key, integer_in(opts.str("limit").unwrap_or(""), "--limit", min, max)?);
    params.set("skip", integer(opts.str("skip").unwrap_or(""), "--skip")?);
    Ok(params)
}

fn non_blank_string(value: Option<&Json>) -> bool {
    matches!(value, Some(Json::String(s)) if !js_trim(s).is_empty())
}

fn validate_vendor(body: &json::Map<String, Json>, required: &[&str]) -> Result<()> {
    for key in required {
        if !non_blank_string(body.get(*key)) {
            bail!("The request body needs {key}.");
        }
    }
    for key in ["email", "phone"] {
        if let Some(value) = body.get(key) {
            let valid = match value {
                Json::Array(items) => items.iter().all(|item| non_blank_string(Some(item))),
                _ => false,
            };
            if !valid {
                bail!("{key} must be an array of strings.");
            }
        }
    }
    if let Some(Json::Array(items)) = body.get("email") {
        if items.is_empty() {
            bail!("email must contain at least one address.");
        }
    }
    Ok(())
}

/// The shared action of `payment-transactions` and `payouts-reconciliation`.
fn payment_report(path: &str, opts: &Opts) -> Result<()> {
    date_range(opts.str("from"), opts.str("to"))?;
    let any_filter = ["from", "to", "subAccount", "payout"].iter().any(|k| opts.flag(k));
    if opts.flag("confirmationCode") && any_filter {
        bail!("--confirmation-code cannot be combined with date, sub-account, or payout filters.");
    }
    if !opts.flag("confirmationCode") && (!opts.flag("from") || !opts.flag("to")) {
        bail!("Use both --from and --to, or provide --confirmation-code to look up one reservation.");
    }
    let mut params = limit_skip(opts, "take", 1.0, 100.0)?;
    map_truthy(
        &mut params,
        opts,
        &[
            ("from", "startDate"),
            ("to", "endDate"),
            ("subAccount", "subAccountId"),
            ("confirmationCode", "reservationConfirmationCode"),
            ("payout", "payoutId"),
        ],
    );
    print(&guesty_fetch(path, Fetch::get(params))?);
    Ok(())
}

fn payment_report_options(cmd: Command) -> Command {
    cmd.option("--from <date>", "Start date filter (YYYY-MM-DD)")
        .option("--to <date>", "End date filter (YYYY-MM-DD)")
        .option("--sub-account <id>", "Sub-account ID in accountId.subAccountId format")
        .option("--confirmation-code <code>", "Reservation confirmation code; cannot combine with other filters")
        .option_default("--limit <n>", "Max results (1-100), sent as API take", "25")
        .option_default("--skip <n>", "Offset", "0")
}

pub fn command() -> Command {
    Command::new("accounting")
        .alias("acct")
        .description("Accounting, expenses, and financial data")
        .command(
            Command::new("balance <reservationId>")
                .description("Get folio balance for a reservation")
                .action(|c| get_print(&format!("/v1/accounting-api/reservations/{}/balance", c.arg(0)))),
        )
        .command(journal_options(Command::new("journal-entries").description("Get recognized journal entries")).action(
            |c| {
                let params = journal_params(&c.opts)?;
                print(&guesty_fetch("/v1/accounting-api/journal-entries", Fetch::get(params))?);
                Ok(())
            },
        ))
        .command(
            journal_options(
                Command::new("journal-entries-all").description("Get all journal entries (including unrecognized)"),
            )
            .add_option(Opt::new("--recognized <boolean>", "Filter by recognition status").choices(&["true", "false"]))
            .action(|c| {
                let params = journal_params(&c.opts)?;
                print(&guesty_fetch("/v1/accounting-api/journal-entries/all", Fetch::get(params))?);
                Ok(())
            }),
        )
        .command(
            Command::new("categories")
                .description("Get accounting categories")
                .option("--q <name>", "Filter by category name")
                .option_default("--limit <n>", "Max results (1-100)", "20")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let mut params = limit_skip(&c.opts, "limit", 1.0, 100.0)?;
                    map_truthy(&mut params, &c.opts, &[("q", "q")]);
                    print(&guesty_fetch("/v1/accounting-api/categories", Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("working-capital <ownerId>")
                .description("Get owner working capital")
                .action(|c| get_print(&format!("/v1/accounting-api/owners/{}/working-capital", c.arg(0)))),
        )
        .command(
            Command::new("set-working-capital <ownerId>")
                .description("Update owner working capital (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    send_data(&format!("/v1/accounting-api/owners/{}/working-capital", c.arg(0)), "PUT", &c.opts)
                }),
        )
        .command(
            Command::new("business-models")
                .description("Get business models")
                .option("--include-assigned-listings", "Include listing assignments and activation dates")
                .option("--limit <n>", "Max results (omitted returns all)")
                .option("--skip <n>", "Offset")
                .action(|c| {
                    let o = &c.opts;
                    let mut params = Params::new();
                    if o.flag("includeAssignedListings") {
                        params.set("includeAssignedListings", true);
                    }
                    if let Some(limit) = o.str("limit") {
                        params.set("limit", integer_in(limit, "--limit", 1.0, MAX_SAFE_INTEGER)?);
                    }
                    if let Some(skip) = o.str("skip") {
                        params.set("skip", integer(skip, "--skip")?);
                    }
                    print(&guesty_fetch("/v1/business-models-api/light-business-models", Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("assign-business-model <businessModelId>")
                .description("Assign listings to a business model (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/business-models-api/assignment/{}", c.arg(0)), "PUT", &c.opts)),
        )
        .command(
            Command::new("update-business-model <businessModelId>")
                .description("Change a business model's category; Guesty saves a new version")
                .option("--category <name>", "Category name (max 255 characters)")
                .option("--clear-category", "Remove the category")
                .action(|c| {
                    let o = &c.opts;
                    let category = o.str("category");
                    if category.is_some() == o.flag("clearCategory") {
                        bail!("Use --category or --clear-category.");
                    }
                    if category.is_some_and(|v| v.chars().count() > 255) {
                        bail!("--category must be at most 255 characters.");
                    }
                    let value = if o.flag("clearCategory") { Json::Null } else { json::json!(category) };
                    let body = json::json!({ "category": value });
                    let path = format!("/v1/business-models-api/light-business-models/{}", c.arg(0));
                    print(&guesty_fetch(&path, Fetch::json("PATCH", body))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("create-owner-charge")
                .description("Create an owner charge (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/business-models-api/transactions/owner-charges", "POST", &c.opts)),
        )
        .command(
            Command::new("create-owner-charge-by-listing")
                .description("Create owner charges by listing (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    send_data("/v1/business-models-api/transactions/owner-charges-by-listing", "POST", &c.opts)
                }),
        )
        .command(
            Command::new("create-business-expense")
                .description("Create a business-model expense (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/business-models-api/transactions/expenses", "POST", &c.opts)),
        )
        .command(
            Command::new("create-business-expense-by-listing")
                .description("Create a business-model expense by listing (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/business-models-api/transactions/expenses-by-listing", "POST", &c.opts)),
        )
        .command(
            Command::new("expenses")
                .description("List expenses")
                .option("--status <statuses>", "Comma-separated expense statuses")
                .option("--category <id>", "Filter by category ID")
                .option("--vendor <id>", "Filter by vendor ID")
                .option("--owner <id>", "Filter by owner ID")
                .option("--listing <id>", "Filter by listing ID")
                .option("--reservation <id>", "Filter by reservation ID")
                .option("--expense-rule <id>", "Filter by expense rule ID")
                .option("--from <date>", "Expense date range start (YYYY-MM-DD)")
                .option("--to <date>", "Expense date range end (YYYY-MM-DD)")
                .add_option(Opt::new("--sort-by <field>", "Sort field").choices(&[
                    "expenseDate",
                    "createdAt",
                    "amount",
                ]))
                .add_option(Opt::new("--sort-order <order>", "Sort order").choices(&["ASC", "DESC"]))
                .option_default("--limit <n>", "Max results (1-100)", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let o = &c.opts;
                    date_range(o.str("from"), o.str("to"))?;
                    let mut params = limit_skip(o, "limit", 1.0, 100.0)?;
                    map_truthy(
                        &mut params,
                        o,
                        &[
                            ("status", "status"),
                            ("category", "categoryId"),
                            ("vendor", "vendorId"),
                            ("owner", "ownerId"),
                            ("listing", "listingId"),
                            ("reservation", "reservationId"),
                            ("expenseRule", "expenseRuleId"),
                            ("from", "expenseDateFrom"),
                            ("to", "expenseDateTo"),
                            ("sortBy", "sortBy"),
                            ("sortOrder", "sortOrder"),
                        ],
                    );
                    print(&guesty_fetch("/v1/expenses-api/expenses", Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("expense <id>")
                .description("Get expense by ID")
                .action(|c| get_print(&format!("/v1/expenses-api/expenses/{}", c.arg(0)))),
        )
        .command(
            Command::new("create-expense")
                .description("Create an expense (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/expenses-api/expenses", "POST", &c.opts)),
        )
        .command(Command::new("cancel-expense <id>").description("Cancel an expense").action(|c| {
            let path = format!("/v1/expenses-api/expenses/{}/cancel", c.arg(0));
            print(&guesty_fetch(&path, Fetch::method("POST"))?);
            Ok(())
        }))
        .command(
            Command::new("expense-rules")
                .description("List recurring expense rules (paid add-on; active and draft unless --status)")
                .option_parsed(
                    "--status <status>",
                    "Rule status: active, inactive, draft or archived (repeat for multiple)",
                    collect,
                    empty_list(),
                )
                .option("--listing <id>", "Listing ID filter")
                .option("--category <id>", "Category ID filter")
                .option("--vendor <id>", "Vendor ID filter")
                .option("--name <text>", "Name filter (at most 255 characters)")
                .add_option(Opt::new("--sort-by <field>", "Sort field").choices(&[
                    "createdAt",
                    "updatedAt",
                    "name",
                    "activatedAt",
                ]))
                .add_option(Opt::new("--sort-order <order>", "Sort order").choices(&["ASC", "DESC"]))
                .option_default("--limit <n>", "Max results (1-100)", "50")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let o = &c.opts;
                    let statuses = o.list("status");
                    for status in statuses {
                        if !["active", "inactive", "draft", "archived"].contains(&status.as_str()) {
                            bail!("--status must be active, inactive, draft or archived.");
                        }
                    }
                    if o.str("name").is_some_and(|name| name.chars().count() > 255) {
                        bail!("--name must be at most 255 characters.");
                    }
                    let mut params = limit_skip(o, "limit", 1.0, 100.0)?;
                    if !statuses.is_empty() {
                        params.set("status", statuses);
                    }
                    map_truthy(
                        &mut params,
                        o,
                        &[
                            ("listing", "listingId"),
                            ("category", "categoryId"),
                            ("vendor", "vendorId"),
                            ("name", "name"),
                            ("sortBy", "sortBy"),
                            ("sortOrder", "sortOrder"),
                        ],
                    );
                    print(&guesty_fetch("/v1/expenses-api/expense-rules", Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("expense-rule <id>")
                .description("Get an expense rule by ID, with its assigned listings")
                .action(|c| get_print(&format!("/v1/expenses-api/expense-rules/{}", c.arg(0)))),
        )
        .command(
            Command::new("create-expense-rule")
                .description("Create a recurring expense rule (--data or stdin: name, status draft or active, ...)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = data_object(&c.opts)?;
                    if !non_blank_string(body.get("name")) {
                        bail!("The request body needs name.");
                    }
                    match body.get("status") {
                        Some(Json::String(status)) if status == "draft" || status == "active" => {}
                        _ => bail!("The request body needs status draft or active."),
                    }
                    let fetch = Fetch::json("POST", Json::Object(body));
                    print(&guesty_fetch("/v1/expenses-api/expense-rules", fetch)?);
                    Ok(())
                }),
        )
        .command(
            Command::new("vendors")
                .description("List vendors")
                .option_default("--limit <n>", "Max results (25-100)", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let params = limit_skip(&c.opts, "limit", 25.0, 100.0)?;
                    print(&guesty_fetch("/v1/vendors", Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("vendor <id>")
                .description("Get a vendor by ID")
                .action(|c| get_print(&format!("/v1/vendors/{}", c.arg(0)))),
        )
        .command(
            payment_report_options(
                Command::new("payment-transactions").description("Get payment transactions from GuestyPay"),
            )
            .action(|c| payment_report("/v1/payment-transactions/reports", &c.opts)),
        )
        .command(
            payment_report_options(
                Command::new("payouts-reconciliation").description("Get payout reconciliation data from GuestyPay"),
            )
            .option("--payout <id>", "Filter by payout ID")
            .action(|c| payment_report("/v1/payment-transactions/reports/payouts-reconciliation", &c.opts)),
        )
        .command(
            Command::new("disbursements")
                .description("List disbursements (amounts are available through journal entries)")
                .option("--from <date>", "Payout date range start (YYYY-MM-DD)")
                .option("--to <date>", "Payout date range end (YYYY-MM-DD)")
                .option("--created-from <date-time>", "Creation timestamp range start")
                .option("--created-to <date-time>", "Creation timestamp range end")
                .option_parsed("--status <status>", "Payout status (repeat for multiple)", collect, empty_list())
                .option_parsed("--method <method>", "Payout method (repeat for multiple)", collect, empty_list())
                .option("--entity <name>", "Entity name contains filter")
                .option("--reference <number>", "Exact reference number")
                .add_option(Opt::new("--sort <field>", "Sort field, prefix with - for descending").choices(&[
                    "payoutDate",
                    "-payoutDate",
                    "createdAt",
                    "-createdAt",
                    "payoutStatus",
                    "-payoutStatus",
                    "checkNumber",
                    "-checkNumber",
                ]))
                .option_default("--limit <n>", "Max results (1-100)", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let o = &c.opts;
                    date_range(o.str("from"), o.str("to"))?;
                    date_range_named(o.str("createdFrom"), o.str("createdTo"), "--created-from", "--created-to")?;
                    let mut params = limit_skip(o, "limit", 1.0, 100.0)?;
                    map_truthy(
                        &mut params,
                        o,
                        &[
                            ("from", "payoutDateFrom"),
                            ("to", "payoutDateTo"),
                            ("createdFrom", "createdAtFrom"),
                            ("createdTo", "createdAtTo"),
                            ("entity", "entityName"),
                            ("reference", "referenceNumber"),
                            ("sort", "sort"),
                        ],
                    );
                    if !o.list("status").is_empty() {
                        params.set("payoutStatus", o.list("status"));
                    }
                    if !o.list("method").is_empty() {
                        params.set("payoutMethod", o.list("method"));
                    }
                    print(&guesty_fetch("/v1/accounting-api/disbursements", Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("disbursement <id>")
                .description("Get a disbursement by ID")
                .action(|c| get_print(&format!("/v1/accounting-api/disbursements/{}", c.arg(0)))),
        )
        .command(
            Command::new("add-expense-attachment <id>")
                .description("Add an attachment to an expense (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/expenses-api/expenses/{}/attachments", c.arg(0)), "POST", &c.opts)),
        )
        .command(
            Command::new("delete-expense-attachment <id> <attachmentId>")
                .description("Delete an attachment from an expense")
                .action(|c| {
                    let path = format!("/v1/expenses-api/expenses/{}/attachments/{}", c.arg(0), c.arg(1));
                    print(&guesty_fetch(&path, Fetch::method("DELETE"))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("create-vendor")
                .description(
                    "Create a vendor (--data or stdin: company, firstName, lastName, email[], optional payoutMethod)",
                )
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = data_object(&c.opts)?;
                    if !body.contains_key("email") {
                        bail!("The request body needs email as an array of at least one address.");
                    }
                    validate_vendor(&body, &["company", "firstName", "lastName"])?;
                    print(&guesty_fetch("/v1/vendors", Fetch::json("POST", Json::Object(body)))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("update-vendor <id>")
                .description("Update a vendor's details or payout method (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = data_object(&c.opts)?;
                    if body.is_empty() {
                        bail!("The request body needs at least one vendor field.");
                    }
                    validate_vendor(&body, &[])?;
                    let path = format!("/v1/vendors/{}", c.arg(0));
                    print(&guesty_fetch(&path, Fetch::json("PATCH", Json::Object(body)))?);
                    Ok(())
                }),
        )
}
