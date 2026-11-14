//! Port of src/commands/payments.ts.

use crate::bail;
use crate::cli::{Call, Command, Opt};
use crate::client::{Fetch, Params, get, guesty_fetch};
use crate::commands::query_options::{date_time, decimal, js_trim, json_object};
use crate::error::Result;
use crate::json::{self, Json, Map};
use crate::output::print;
use crate::stdin;

// Guesty's Payments API: processor payments, offline (recorded) payments and
// vaulted payment methods. It replaces the deprecated reservation payment
// endpoints behind "guesty res add-payment" and related commands.

const RECORDED_METHODS: [&str; 9] =
    ["RECORDED_CASH", "ECHECK", "DEBIT", "CREDIT", "BANK_TRANSFER", "CREDIT_NOTE", "VOUCHER", "CHECK", "OTHER"];
const RECORDED_REFUND_METHODS: [&str; 10] =
    ["RECORDED_CASH", "ECHECK", "DEBIT", "CREDIT", "BANK_TRANSFER", "CREDIT_NOTE", "VOUCHER", "CHECK", "OTHER", "BCOM"];

type Body = Map<String, Json>;

fn read_object(data: Option<&str>) -> Result<Body> {
    let text = match data {
        Some(d) => d.to_string(),
        None => stdin::read()?,
    };
    json_object(&text, "--data or stdin")
}

fn require_string(body: &Body, key: &str) -> Result<()> {
    if !matches!(body.get(key), Some(Json::String(s)) if !js_trim(s).is_empty()) {
        bail!("The request body needs {key} as a nonempty string.");
    }
    Ok(())
}

// Shared rules from the Payments API reference: amounts are at least 1 in the
// reservation currency, notes at most 500 characters, timestamps ISO 8601.
fn validate_payment_fields(body: &Body, date_keys: &[&str]) -> Result<()> {
    if let Some(amount) = body.get("amount") {
        if !amount.as_f64().is_some_and(|a| a.is_finite() && a >= 1.0) {
            bail!("amount must be a number of at least 1, in the reservation currency.");
        }
    }
    if let Some(note) = body.get("note") {
        if !note.as_str().is_some_and(|n| n.chars().count() <= 500) {
            bail!("note must be a string of at most 500 characters.");
        }
    }
    for key in date_keys {
        if let Some(value) = body.get(*key) {
            let Some(value) = value.as_str() else {
                bail!("{key} must be an ISO 8601 date-time string.");
            };
            date_time(value, key)?;
        }
    }
    Ok(())
}

fn validate_recorded_method(body: &Body, methods: &[&str]) -> Result<()> {
    let Some(payment_method) = body.get("paymentMethod") else { return Ok(()) };
    let method = payment_method.as_object().and_then(|m| m.get("method")).and_then(Json::as_str);
    if !method.is_some_and(|m| methods.contains(&m)) {
        bail!("paymentMethod.method must be one of {}.", methods.join(", "));
    }
    Ok(())
}

fn amount_and_note(c: &Call) -> Result<Body> {
    let mut body = Body::new();
    if let Some(amount) = c.opts.str("amount") {
        body.insert("amount".into(), json::number(decimal(amount, "--amount", 1.0, f64::INFINITY)?));
    }
    if let Some(note) = c.opts.str("note") {
        body.insert("note".into(), Json::String(note.to_string()));
    }
    validate_payment_fields(&body, &[])?;
    Ok(body)
}

/// `[...value].length > max`: JavaScript counts code points here.
fn too_long(value: &str, max: usize) -> bool {
    value.chars().count() > max
}

fn post(path: &str, body: Body) -> Result<()> {
    print(&guesty_fetch(path, Fetch::json("POST", Json::Object(body)))?);
    Ok(())
}

fn patch(path: &str, body: Body) -> Result<()> {
    print(&guesty_fetch(path, Fetch::json("PATCH", Json::Object(body)))?);
    Ok(())
}

/// `--method` and `--at` for recorded refunds.
fn refund_fields(c: &Call, body: &mut Body) -> Result<()> {
    if let Some(method) = c.opts.str("method").filter(|m| !m.is_empty()) {
        body.insert("paymentMethod".into(), json::json!({ "method": method }));
    }
    if let Some(at) = c.opts.str("at") {
        body.insert("refundedAt".into(), Json::String(date_time(at, "--at")?));
    }
    Ok(())
}

pub fn command() -> Command {
    Command::new("payments")
        .alias("pay")
        .description("Reservation payments, recorded offline payments, refunds, chargebacks, and guest payment methods")
        // ─── Processor payments ──────────────────────────────────────────────
        .command(
            Command::new("list")
                .description("List a reservation's payments, authorization holds, and payment summary")
                .required_option("--reservation <id>", "Reservation ID")
                .action(|c| {
                    let mut params = Params::new();
                    params.set("reservationId", c.opts.str("reservation").unwrap_or_default());
                    print(&get("/v1/payments", params)?);
                    Ok(())
                }),
        )
        .command(Command::new("get <paymentId>").description("Get a payment").action(|c| {
            print(&get(&format!("/v1/payments/{}", c.arg(0)), Params::new())?);
            Ok(())
        }))
        .command(
            Command::new("create")
                .description("Charge, schedule, or hold a payment on a reservation (--data or stdin: reservationId, paymentMethodId, amount)")
                .option("--data <json>", "JSON body; add isAuthorizationHold, or isSecurityDeposit with releaseAuthorizationHold.shouldTriggerAt")
                .action(|c| {
                    let body = read_object(c.opts.str("data"))?;
                    for key in ["reservationId", "paymentMethodId"] {
                        require_string(&body, key)?;
                    }
                    if !body.contains_key("amount") {
                        bail!("The request body needs amount.");
                    }
                    validate_payment_fields(&body, &["shouldBePaidAt"])?;
                    let is_true = |key: &str| body.get(key) == Some(&Json::Bool(true));
                    if is_true("isAuthorizationHold") && is_true("isSecurityDeposit") {
                        bail!("isAuthorizationHold and isSecurityDeposit cannot both be true.");
                    }
                    if is_true("isSecurityDeposit") {
                        let release = body.get("releaseAuthorizationHold").and_then(Json::as_object);
                        let Some(trigger) = release.and_then(|r| r.get("shouldTriggerAt")).and_then(Json::as_str) else {
                            bail!("A security deposit needs releaseAuthorizationHold.shouldTriggerAt.");
                        };
                        date_time(trigger, "releaseAuthorizationHold.shouldTriggerAt")?;
                    }
                    post("/v1/payments", body)
                }),
        )
        .command(
            Command::new("update <paymentId>")
                .description("Change a processor payment's amount, payment method, scheduled date, or note (--data or stdin)")
                .option("--data <json>", "JSON body with paymentMethodId, amount, shouldBePaidAt, and/or note")
                .action(|c| {
                    let body = read_object(c.opts.str("data"))?;
                    if !["paymentMethodId", "amount", "shouldBePaidAt", "note"].iter().any(|k| body.contains_key(*k)) {
                        bail!("The request body needs paymentMethodId, amount, shouldBePaidAt, or note.");
                    }
                    validate_payment_fields(&body, &["shouldBePaidAt"])?;
                    patch(&format!("/v1/payments/{}", c.arg(0)), body)
                }),
        )
        .command(Command::new("charge <paymentId>").description("Charge a PENDING or FAILED payment now").action(|c| {
            print(&guesty_fetch(&format!("/v1/payments/{}/pay", c.arg(0)), Fetch::method("POST"))?);
            Ok(())
        }))
        .command(
            Command::new("cancel <paymentId>")
                .description("Cancel a PENDING or PENDING_AUTH payment, or a succeeded recorded payment")
                .action(|c| {
                    print(&guesty_fetch(&format!("/v1/payments/{}/cancel", c.arg(0)), Fetch::method("POST"))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("capture <paymentId>")
                .description("Capture an authorization hold, fully or with --amount")
                .option("--amount <amount>", "Amount to capture (at least 1); omit to capture the full hold")
                .option("--note <text>", "Note stored on the capture (max 500 characters)")
                .action(|c| post(&format!("/v1/payments/{}/capture", c.arg(0)), amount_and_note(c)?)),
        )
        .command(
            Command::new("refund <paymentId>")
                .description("Refund a succeeded processor payment, fully or with --amount")
                .option("--amount <amount>", "Amount to refund (at least 1); omit to refund the original amount")
                .option("--note <text>", "Note stored on the refund (max 500 characters)")
                .action(|c| post(&format!("/v1/payments/{}/refund", c.arg(0)), amount_and_note(c)?)),
        )
        .command(
            Command::new("chargeback <paymentId>")
                .description("Record a chargeback on a succeeded processor payment")
                .required_option("--amount <amount>", "Chargeback amount (at least 1, at most the payment balance)")
                .option("--at <date-time>", "When the chargeback occurred (past ISO 8601 date-time)")
                .option("--reason <text>", "Reason (max 500 characters)")
                .option("--note <text>", "Note (max 500 characters)")
                .option("--case-id <id>", "Processor dispute case ID (max 100 characters)")
                .action(|c| {
                    let mut body = amount_and_note(c)?;
                    if let Some(at) = c.opts.str("at") {
                        body.insert("chargebackAt".into(), Json::String(date_time(at, "--at")?));
                    }
                    if let Some(reason) = c.opts.str("reason") {
                        if too_long(reason, 500) {
                            bail!("--reason must be at most 500 characters.");
                        }
                        body.insert("reason".into(), Json::String(reason.to_string()));
                    }
                    if let Some(case_id) = c.opts.str("caseId") {
                        if too_long(case_id, 100) {
                            bail!("--case-id must be at most 100 characters.");
                        }
                        body.insert("caseId".into(), Json::String(case_id.to_string()));
                    }
                    post(&format!("/v1/payments/{}/chargeback", c.arg(0)), body)
                }),
        )
        // ─── Recorded (offline) payments ─────────────────────────────────────
        .command(
            Command::new("record")
                .description("Record an offline payment without charging a processor (--data or stdin: reservationId, amount, paymentMethod.method)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = read_object(c.opts.str("data"))?;
                    require_string(&body, "reservationId")?;
                    if !body.contains_key("amount") {
                        bail!("The request body needs amount.");
                    }
                    if !body.contains_key("paymentMethod") {
                        bail!("The request body needs paymentMethod.method.");
                    }
                    validate_payment_fields(&body, &["shouldBePaidAt"])?;
                    validate_recorded_method(&body, &RECORDED_METHODS)?;
                    post("/v1/payments/record", body)
                }),
        )
        .command(
            Command::new("update-recorded <paymentId>")
                .description("Update a recorded payment (--data or stdin)")
                .option("--data <json>", "JSON body with shouldBePaidAt, amount, paymentMethod, confirmationCode, and/or note")
                .action(|c| {
                    let body = read_object(c.opts.str("data"))?;
                    let keys = ["shouldBePaidAt", "amount", "paymentMethod", "confirmationCode", "note"];
                    if !keys.iter().any(|k| body.contains_key(*k)) {
                        bail!("The request body needs shouldBePaidAt, amount, paymentMethod, confirmationCode, or note.");
                    }
                    validate_payment_fields(&body, &["shouldBePaidAt"])?;
                    validate_recorded_method(&body, &RECORDED_METHODS)?;
                    patch(&format!("/v1/payments/{}/record", c.arg(0)), body)
                }),
        )
        .command(
            Command::new("record-refund <paymentId>")
                .description("Record an offline refund on a succeeded recorded payment")
                .option("--amount <amount>", "Refund amount (at least 1); omit to refund the full recorded amount")
                .add_option(Opt::new("--method <method>", "Refund method").choices(&RECORDED_REFUND_METHODS))
                .option("--at <date-time>", "When the refund was made (ISO 8601); omit for now")
                .option("--note <text>", "Note (max 500 characters)")
                .action(|c| {
                    let mut body = amount_and_note(c)?;
                    refund_fields(c, &mut body)?;
                    post(&format!("/v1/payments/{}/record/refund", c.arg(0)), body)
                }),
        )
        .command(
            Command::new("update-recorded-refund <paymentId> <refundId>")
                .description("Update a recorded refund")
                .option("--amount <amount>", "Refund amount (at least 1)")
                .add_option(Opt::new("--method <method>", "Refund method").choices(&RECORDED_REFUND_METHODS))
                .option("--at <date-time>", "When the refund was made (ISO 8601)")
                .option("--note <text>", "Note (max 500 characters)")
                .action(|c| {
                    let mut body = amount_and_note(c)?;
                    refund_fields(c, &mut body)?;
                    if body.is_empty() {
                        bail!("Use --amount, --method, --at, or --note.");
                    }
                    patch(&format!("/v1/payments/{}/record/refund/{}", c.arg(0), c.arg(1)), body)
                }),
        )
        // ─── Payment methods ─────────────────────────────────────────────────
        .command(
            Command::new("methods")
                .description("List payment methods for a guest or a reservation")
                .option("--guest <id>", "Guest ID")
                .option("--reservation <id>", "Reservation ID")
                .action(|c| {
                    if c.opts.has("guest") == c.opts.has("reservation") {
                        bail!("Use exactly one of --guest or --reservation.");
                    }
                    let mut params = Params::new();
                    if let Some(guest) = c.opts.str("guest").filter(|s| !s.is_empty()) {
                        params.set("guestId", guest);
                    }
                    if let Some(reservation) = c.opts.str("reservation").filter(|s| !s.is_empty()) {
                        params.set("reservationId", reservation);
                    }
                    print(&get("/v1/payment-methods", params)?);
                    Ok(())
                }),
        )
        .command(Command::new("method <paymentMethodId>").description("Get a payment method").action(|c| {
            print(&get(&format!("/v1/payment-methods/{}", c.arg(0)), Params::new())?);
            Ok(())
        }))
        .command(
            Command::new("create-method")
                .description("Vault a tokenized payment method for a guest (--data or stdin: guestId, paymentProviderId, confirmationCode, and _id or stripeCardToken)")
                .option("--data <json>", "JSON body; card details are never sent")
                .action(|c| {
                    let body = read_object(c.opts.str("data"))?;
                    for key in ["guestId", "paymentProviderId", "confirmationCode"] {
                        require_string(&body, key)?;
                    }
                    let tokens: Vec<&str> = ["_id", "stripeCardToken"].into_iter().filter(|k| body.contains_key(*k)).collect();
                    if tokens.len() != 1 {
                        bail!("The request body needs exactly one of _id (GuestyPay) or stripeCardToken (Stripe).");
                    }
                    require_string(&body, tokens[0])?;
                    if body.get("reuse").is_some_and(|r| !r.is_boolean()) {
                        bail!("reuse must be true or false.");
                    }
                    post("/v1/payment-methods", body)
                }),
        )
}
