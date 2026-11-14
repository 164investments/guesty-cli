//! Port of src/commands/channel-commission.ts.

use crate::bail;
use crate::cli::{Command, Opt};
use crate::client::{Fetch, Params, get, guesty_fetch};
use crate::commands::query_options::{date, date_range, decimal, js_trim, json_array, json_object};
use crate::error::Result;
use crate::json::{self, Json};
use crate::output::{print, warn_deprecated};
use crate::stdin;

fn data_text(data: Option<&str>) -> Result<String> {
    match data {
        Some(d) => Ok(d.to_string()),
        None => stdin::read(),
    }
}

// ─── Channel commissions v2 ──────────────────────────────────────────────────

fn validate_commission(entry: &Json, label: &str) -> Result<()> {
    let Some(item) = entry.as_object() else {
        bail!("{label} must be an object.");
    };
    for key in ["channel", "source"] {
        if !matches!(item.get(key), Some(Json::String(s)) if !js_trim(s).is_empty()) {
            bail!("{label}.{key} is required.");
        }
    }
    let percent = |value: Option<&Json>| value.and_then(Json::as_f64).is_some_and(|v| (0.0..=100.0).contains(&v));
    if let Some(commission) = item.get("commission") {
        let commission = commission.as_object();
        if !percent(commission.and_then(|c| c.get("value"))) {
            bail!("{label}.commission.value must be a percentage from 0 to 100.");
        }
        let of = commission.and_then(|c| c.get("of")).and_then(Json::as_array);
        if !of.is_some_and(|of| !of.is_empty() && of.iter().all(Json::is_string)) {
            bail!("{label}.commission.of must list the charges it applies to, such as ACCOMMODATION_FARE.");
        }
    }
    if item.contains_key("tax") && !percent(item.get("tax")) {
        bail!("{label}.tax must be a percentage from 0 to 100.");
    }
    if item.get("isPreDeduct").is_some_and(|v| !v.is_boolean()) {
        bail!("{label}.isPreDeduct must be true or false.");
    }
    Ok(())
}

fn read_commission_list(data: Option<&str>) -> Result<Json> {
    let body = json_array(&data_text(data)?, "--data or stdin")?;
    for (index, entry) in body.iter().enumerate() {
        validate_commission(entry, &format!("[{index}]"))?;
    }
    Ok(Json::Array(body))
}

fn read_commission(data: Option<&str>) -> Result<Json> {
    let body = Json::Object(json_object(&data_text(data)?, "--data or stdin")?);
    validate_commission(&body, "body")?;
    Ok(body)
}

fn show(path: &str) -> Result<()> {
    print(&get(path, Params::new())?);
    Ok(())
}

fn send(path: &str, method: &str, body: Json) -> Result<()> {
    print(&guesty_fetch(path, Fetch::json(method, body))?);
    Ok(())
}

pub fn command() -> Command {
    Command::new("channel-commission")
        .alias("cc")
        .description("Manage channel commission settings")
        .command(
            Command::new("account")
                .description("[deprecated] Get account channel commission — use 'account-v2' instead")
                .action(|_| {
                    warn_deprecated("channel-commission account", &["channel-commission account-v2"]);
                    show("/v1/channel-commission/account")
                }),
        )
        .command(
            Command::new("account-update")
                .description("[deprecated] Update account channel commission (--data or stdin) — use 'account-update-v2' instead")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated("channel-commission account-update", &["channel-commission account-update-v2"]);
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    send("/v1/channel-commission/account", "PUT", body)
                }),
        )
        .command(
            Command::new("listings")
                .description("[deprecated] Get listings channel commission — use 'listing-v2' or 'listing-effective-v2' instead")
                .required_option("--listing-ids <ids>", "Comma-separated listing IDs")
                .action(|c| {
                    warn_deprecated("channel-commission listings", &["channel-commission listing-v2 <unitTypeId>"]);
                    let ids: Vec<String> =
                        c.opts.str("listingIds").unwrap_or_default().split(',').map(str::to_string).collect();
                    let mut params = Params::new();
                    params.set("listingIds", ids);
                    print(&get("/v1/channel-commission/listings", params)?);
                    Ok(())
                }),
        )
        .command(
            Command::new("listings-update")
                .description("[deprecated] Update listings channel commission (--data or stdin) — use 'listing-update-v2' instead")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    warn_deprecated(
                        "channel-commission listings-update",
                        &["channel-commission listing-update-v2 <unitTypeId>"],
                    );
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    send("/v1/channel-commission/listings", "PUT", body)
                }),
        )
        .command(
            Command::new("account-v2")
                .description("Get account-level channel commissions")
                .action(|_| show("/v1/channel-commissions-v2/account")),
        )
        .command(
            Command::new("account-update-v2")
                .description("Create or replace account-level channel commissions (--data or stdin: array of {channel, source, commission, tax, isPreDeduct})")
                .option("--data <json>", "JSON array")
                .action(|c| {
                    let body = read_commission_list(c.opts.str("data"))?;
                    send("/v1/channel-commissions-v2/account", "PUT", body)
                }),
        )
        .command(
            Command::new("create-v2")
                .description("Create one channel commission; include unitTypeId for a listing-level entry (--data or stdin)")
                .option("--data <json>", "JSON body with channel, source, and optional unitTypeId, commission, tax, isPreDeduct")
                .action(|c| {
                    let body = read_commission(c.opts.str("data"))?;
                    send("/v1/channel-commissions-v2", "POST", body)
                }),
        )
        .command(
            Command::new("update-v2 <channelCommissionId>")
                .description("Replace one channel commission; omitted commission or tax is removed (--data or stdin)")
                .option("--data <json>", "JSON body with channel, source, and optional unitTypeId, commission, tax, isPreDeduct")
                .action(|c| {
                    let body = read_commission(c.opts.str("data"))?;
                    send(&format!("/v1/channel-commissions-v2/{}", c.arg(0)), "PATCH", body)
                }),
        )
        .command(Command::new("delete-v2 <channelCommissionId>").description("Delete one channel commission").action(|c| {
            print(&guesty_fetch(&format!("/v1/channel-commissions-v2/{}", c.arg(0)), Fetch::method("DELETE"))?);
            Ok(())
        }))
        .command(
            Command::new("listing-v2 <unitTypeId>")
                .description("Get a listing's own channel commissions (a sub-unit resolves to its parent)")
                .action(|c| show(&format!("/v1/channel-commissions-v2/unit-type/{}", c.arg(0)))),
        )
        .command(
            Command::new("listing-update-v2 <unitTypeId>")
                .description("Create or replace a listing's channel commissions (--data or stdin: array of {channel, source, commission, tax, isPreDeduct})")
                .option("--data <json>", "JSON array")
                .action(|c| {
                    let body = read_commission_list(c.opts.str("data"))?;
                    send(&format!("/v1/channel-commissions-v2/unit-type/{}", c.arg(0)), "PUT", body)
                }),
        )
        .command(
            Command::new("listing-effective-v2 <unitTypeId>")
                .description("Get the channel commissions that actually apply to a listing's reservations")
                .action(|c| show(&format!("/v1/channel-commissions-v2/unit-type/{}/actual", c.arg(0)))),
        )
        .command(
            Command::new("listing-level-v2 <unitTypeId>")
                .description("Get whether a listing uses account-level or listing-level commissions")
                .action(|c| show(&format!("/v1/channel-commissions-v2/unit-type/{}/level-configurations", c.arg(0)))),
        )
        .command(
            Command::new("listing-level-update-v2 <unitTypeId>")
                .description("Set whether a listing uses account-level or listing-level commissions")
                .add_option(
                    Opt::new("--level <level>", "ACCOUNT inherits account commissions; UNIT_TYPE uses the listing's own")
                        .choices(&["ACCOUNT", "UNIT_TYPE"])
                        .mandatory(),
                )
                .action(|c| {
                    let body = json::json!({ "levelEntityType": c.opts.str("level") });
                    send(&format!("/v1/channel-commissions-v2/unit-type/{}/level-configurations", c.arg(0)), "PUT", body)
                }),
        )
        .command(
            Command::new("reservation-update-v2 <reservationId>")
                .description("[Beta] Set a reservation's channel commission amount and when accounting recognizes it")
                .required_option("--amount <amount>", "Commission amount in the reservation currency (0 or more)")
                .option("--date <date>", "Single recognition date (YYYY-MM-DD, listing time zone)")
                .option("--from <date>", "Recognition range start (YYYY-MM-DD; requires --to)")
                .option("--to <date>", "Recognition range end (YYYY-MM-DD; requires --from)")
                .action(|c| {
                    let (single, from, to) = (c.opts.str("date"), c.opts.str("from"), c.opts.str("to"));
                    let range = from.is_some() || to.is_some();
                    if single.is_some() == range {
                        bail!("Use --date, or --from with --to, for the recognition dates.");
                    }
                    let (Some(from), Some(to)) = (from, to) else {
                        if range {
                            bail!("Use both --from and --to for a recognition range.");
                        }
                        // Only --date.
                        let realization = json::json!({ "date": date(single.unwrap_or_default(), "--date")? });
                        return put_realization(c.arg(0), realization, c.opts.str("amount"));
                    };
                    let realization = json::json!({ "from": date(from, "--from")?, "to": date(to, "--to")? });
                    date_range(Some(from), Some(to))?;
                    put_realization(c.arg(0), realization, c.opts.str("amount"))
                }),
        )
}

fn put_realization(reservation_id: &str, realization_dates: Json, amount: Option<&str>) -> Result<()> {
    let amount = decimal(amount.unwrap_or_default(), "--amount", 0.0, f64::INFINITY)?;
    let body = json::json!({ "realizationDates": realization_dates, "amount": json::number(amount) });
    send(&format!("/v1/channel-commissions-v2/reservations/{reservation_id}"), "PUT", body)
}
