//! Port of src/commands/owner-statement-options.ts: owner statement filters
//! shared by `owners statements` and `financials owner-statement`.

use crate::bail;
use crate::cli::{Command, Opt, Opts};
use crate::client::Params;
use crate::commands::query_options::{collect, date_range_named, date_time, empty_list, integer, integer_in};
use crate::error::Result;

const PERIOD_FIELDS: [(&str, &[&str]); 6] = [
    ("month", &["year", "month"]),
    ("year", &["year"]),
    ("monthRange", &["fromYear", "fromMonth", "toYear", "toMonth"]),
    ("yearRange", &["fromYear", "toYear"]),
    ("fiscalYear", &["fiscalYear"]),
    ("fiscalYearRange", &["fromFiscalYear", "toFiscalYear"]),
];

/// `[...new Set(Object.values(periodFields).flat())]`.
const ALL_PERIOD_FIELDS: [&str; 9] =
    ["year", "month", "fromYear", "fromMonth", "toYear", "toMonth", "fiscalYear", "fromFiscalYear", "toFiscalYear"];

/// `fromFiscalYear` → `--from-fiscal-year`.
fn flag(name: &str) -> String {
    let mut out = String::from("--");
    for c in name.chars() {
        if c.is_ascii_uppercase() {
            out.push('-');
            out.push(c.to_ascii_lowercase());
        } else {
            out.push(c);
        }
    }
    out
}

/// The options both statement commands define, in the order the TS defines them.
pub fn statement_options(cmd: Command) -> Command {
    cmd.option("--owner <id>", "Filter by owner ID")
        .option_parsed("--listing <id>", "Filter by listing ID (repeat for multiple)", collect, empty_list())
        .option_parsed(
            "--business-model <id>",
            "Filter by business model ID (repeat for multiple)",
            collect,
            empty_list(),
        )
        .add_option(Opt::new("--period-mode <mode>", "Period filter mode").choices(&[
            "month",
            "year",
            "monthRange",
            "yearRange",
            "fiscalYear",
            "fiscalYearRange",
        ]))
        .option("--year <n>", "Period filter year")
        .option("--month <n>", "Period filter month")
        .option("--from-year <n>", "Period filter fromYear")
        .option("--from-month <n>", "Period filter fromMonth")
        .option("--to-year <n>", "Period filter toYear")
        .option("--to-month <n>", "Period filter toMonth")
        .option("--fiscal-year <n>", "Period filter fiscalYear")
        .option("--from-fiscal-year <n>", "Period filter fromFiscalYear")
        .option("--to-fiscal-year <n>", "Period filter toFiscalYear")
        .option("--updated-since <date-time>", "Incremental sync timestamp (ISO 8601 with timezone)")
        .option("--generated-from <date-time>", "Generation timestamp range start")
        .option("--generated-to <date-time>", "Generation timestamp range end")
        .add_option(Opt::new("--statement-type <type>", "Statement type").choices(&[
            "MONTHLY",
            "ANNUAL",
            "ANNUAL_SUMMARY",
            "ANNUAL_SUMMARY_BY_MONTH",
        ]))
        .option_parsed("--status <status>", "Lifecycle status (repeat for multiple)", collect, empty_list())
        .option_parsed("--shared-via <channel>", "Sharing channel (repeat for multiple)", collect, empty_list())
        .option_default("--limit <n>", "Max results (1-100)", "25")
        .option_default("--skip <n>", "Offset", "0")
}

/// `ownerStatementParams(opts, listingId)`.
pub fn owner_statement_params(opts: &Opts, listing_id: Option<&str>) -> Result<Params> {
    let mut params = Params::new();
    params.set("limit", integer_in(opts.str("limit").unwrap_or(""), "--limit", 1.0, 100.0)?);
    params.set("skip", integer(opts.str("skip").unwrap_or(""), "--skip")?);
    let supplied = ALL_PERIOD_FIELDS.iter().any(|name| opts.has(name));
    let period_mode = opts.str("periodMode").filter(|m| !m.is_empty());
    if supplied && period_mode.is_none() {
        bail!("--period-mode is required when period fields are provided.");
    }
    if let Some(mode) = period_mode {
        let Some((_, required)) = PERIOD_FIELDS.iter().find(|(m, _)| *m == mode) else {
            bail!("Unknown --period-mode.");
        };
        params.set("periodMode", mode);
        let mut values = std::collections::HashMap::new();
        for name in *required {
            let Some(value) = opts.str(name) else {
                bail!("{} is required for --period-mode {mode}.", flag(name));
            };
            let maximum = if name.to_ascii_lowercase().contains("month") { 12.0 } else { 9999.0 };
            let parsed = integer_in(value, &flag(name), 1.0, maximum)?;
            values.insert(*name, parsed);
            params.set(name, parsed);
        }
        let v = |name: &str| values.get(name).copied().unwrap_or(f64::NAN);
        let backwards = match mode {
            "monthRange" => v("fromYear") * 12.0 + v("fromMonth") > v("toYear") * 12.0 + v("toMonth"),
            "yearRange" => v("fromYear") > v("toYear"),
            "fiscalYearRange" => v("fromFiscalYear") > v("toFiscalYear"),
            _ => false,
        };
        if backwards {
            bail!("The statement period start must be on or before its end.");
        }
    }
    if let Some(owner) = opts.str("owner").filter(|v| !v.is_empty()) {
        params.set("ownerId", owner);
    }
    let mut listings = opts.list("listing").to_vec();
    if let Some(id) = listing_id.filter(|v| !v.is_empty()) {
        listings.push(id.to_string());
    }
    if !listings.is_empty() {
        params.set("listingId", listings);
    }
    for (key, param) in [("businessModel", "businessModelId"), ("status", "status"), ("sharedVia", "sharedVia")] {
        if !opts.list(key).is_empty() {
            params.set(param, opts.list(key));
        }
    }
    if let Some(statement_type) = opts.str("statementType").filter(|v| !v.is_empty()) {
        params.set("statementType", statement_type);
    }
    if let Some(updated_since) = opts.str("updatedSince").filter(|v| !v.is_empty()) {
        params.set("updatedSince", date_time(updated_since, "--updated-since")?);
    }
    let (from, to) = (opts.str("generatedFrom"), opts.str("generatedTo"));
    date_range_named(from, to, "--generated-from", "--generated-to")?;
    if let Some(from) = from.filter(|v| !v.is_empty()) {
        params.set("generatedAtFrom", date_time(from, "--generated-from")?);
    }
    if let Some(to) = to.filter(|v| !v.is_empty()) {
        params.set("generatedAtTo", date_time(to, "--generated-to")?);
    }
    Ok(params)
}
