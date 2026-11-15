//! Port of src/commands/accounting-options.ts: journal entry filters shared by
//! `accounting journal-entries`, `accounting journal-entries-all` and
//! `financials journal-entries`.

use crate::bail;
use crate::cli::{Command, Opt, Opts};
use crate::client::Params;
use crate::commands::query_options::{collect, date_range, empty_list, integer, integer_in, json_object};
use crate::error::Result;
use crate::json::{self, Json};

const MAX_SAFE_INTEGER: f64 = 9_007_199_254_740_991.0;

/// The options every journal-entry read defines, in the order the TS defines them.
pub fn journal_options(cmd: Command) -> Command {
    cmd.option_default("--days <n>", "Past N days (default date filter)", "30")
        .option("--date-filter <json>", "Transaction date filter JSON with operator and value")
        .option("--from <date>", "Transaction date range start (requires --to)")
        .option("--to <date>", "Transaction date range end (requires --from)")
        .option_parsed("--listing <id>", "Filter by listing ID (repeat for multiple)", collect, empty_list())
        .option_parsed("--owner <id>", "Filter by owner ID (repeat for multiple)", collect, empty_list())
        .option_parsed("--vendor <id>", "Filter by vendor ID (repeat for multiple)", collect, empty_list())
        .option_parsed("--guest <id>", "Filter by guest ID (repeat for multiple)", collect, empty_list())
        .option_parsed("--ledger <type>", "Filter by ledger (repeat for multiple)", collect, empty_list())
        .option_parsed(
            "--trigger <type>",
            "Filter by trigger, including DISBURSEMENT or BULK_UPLOADS (repeatable)",
            collect,
            empty_list(),
        )
        .option_parsed("--charge-code <code>", "Filter by charge code (repeatable)", collect, empty_list())
        .option_parsed(
            "--confirmation-code <code>",
            "Filter by reservation confirmation code (repeatable)",
            collect,
            empty_list(),
        )
        .option("--name <text>", "Filter by journal entry name")
        .option("--description <text>", "Filter by journal entry description")
        .add_option(Opt::new("--sort-by-date <order>", "Date sort order").choices(&["ASC", "DESC"]))
        .option_default("--limit <n>", "Max results (1-100)", "100")
        .option_default("--skip <n>", "Offset", "0")
}

/// `journalParams(opts)`.
pub fn journal_params(opts: &Opts) -> Result<Params> {
    let mut params = Params::new();
    params.set("limit", integer_in(opts.str("limit").unwrap_or(""), "--limit", 1.0, 100.0)?);
    params.set("skip", integer(opts.str("skip").unwrap_or(""), "--skip")?);
    let (from, to) = (opts.str("from"), opts.str("to"));
    if from.is_some() || to.is_some() {
        if !opts.flag("from") || !opts.flag("to") {
            bail!("Use both --from and --to for a transaction date range.");
        }
        if opts.has("dateFilter") {
            bail!("Use a date range or --date-filter, not both.");
        }
        date_range(from, to)?;
        let filter = json::json!({ "operator": "@between", "value": [from, to] });
        params.set("transactionDate", json::compact(&filter));
    } else if let Some(date_filter) = opts.str("dateFilter") {
        let filter = json_object(date_filter, "--date-filter")?;
        if !matches!(filter.get("operator"), Some(Json::String(_))) || !filter.contains_key("value") {
            bail!("--date-filter must contain operator and value.");
        }
        params.set("transactionDate", json::compact(&Json::Object(filter)));
    } else {
        let days = integer_in(opts.str("days").unwrap_or(""), "--days", 1.0, MAX_SAFE_INTEGER)?;
        let filter = json::json!({ "operator": "@in_past_days", "value": json::number(days) });
        params.set("transactionDate", json::compact(&filter));
    }
    let array_keys = [
        ("listing", "listings"),
        ("owner", "owners"),
        ("vendor", "vendors"),
        ("guest", "guests"),
        ("ledger", "ledger"),
        ("trigger", "triggers"),
        ("chargeCode", "chargeCode"),
        ("confirmationCode", "reservationConfirmationCodes"),
    ];
    for (key, param) in array_keys {
        let value = opts.list(key);
        if !value.is_empty() {
            params.set(param, value);
        }
    }
    for key in ["name", "description", "sortByDate"] {
        if let Some(value) = opts.str(key).filter(|v| !v.is_empty()) {
            params.set(key, value);
        }
    }
    if let Some(recognized) = opts.str("recognized") {
        params.set("recognized", recognized);
    }
    Ok(params)
}
