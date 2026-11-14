//! Port of src/commands/team.ts: `guesty team`, and the team setup and join
//! steps `setup` and `join` share.


use crate::cli::Command;
use crate::config::save_settings;
use crate::error::{CliError, Result};
use crate::json::{self, Json, json};
use crate::output::{Data, print, printable};
use crate::prompt::{
    self, Check, TextOptions, command as highlight, confirm, done, frame, info, interactive, required, secret, success,
    summary, task, text, warn,
};
use crate::token_service::{
    self, CallError, HOSTED_TOKEN_SERVICE_URL, Invite, ServiceSettings, TOKEN_SERVICE_KEY_ENV, TOKEN_SERVICE_URL_ENV,
    configured_service, invited_link, is_access_key, parse_invite, service_url,
};

const GUESTY_OPEN_API_GUIDE: &str = "https://help.guesty.com/hc/en-gb/articles/9370472424605-Using-Guesty-s-Open-API";

/// `value.key` in JavaScript: reading from undefined or null throws.
fn prop<'a>(value: Option<&'a Json>, key: &str) -> Result<Option<&'a Json>> {
    match value {
        None => Err(CliError::new(format!("Cannot read properties of undefined (reading '{key}')"))),
        Some(Json::Null) => Err(CliError::new(format!("Cannot read properties of null (reading '{key}')"))),
        Some(Json::Object(map)) => Ok(map.get(key)),
        Some(_) => Ok(None),
    }
}

/// `value?.key`.
fn maybe<'a>(value: Option<&'a Json>, key: &str) -> Option<&'a Json> {
    value.and_then(|v| v.as_object()).and_then(|o| o.get(key))
}

/// `a ?? b` for a property that may be undefined or null.
fn present(value: Option<&Json>) -> Option<&Json> {
    value.filter(|v| !v.is_null())
}

/// `printable(value)`, which throws for anything but a string.
fn shown(value: Option<&Json>) -> Result<String> {
    match value {
        Some(Json::String(s)) => Ok(printable(s)),
        None => Err(CliError::new("Cannot read properties of undefined (reading 'replace')")),
        Some(Json::Null) => Err(CliError::new("Cannot read properties of null (reading 'replace')")),
        Some(_) => Err(CliError::new("value.replace is not a function")),
    }
}

/// `String(value)`, with undefined as "undefined".
fn js_string(value: Option<&Json>) -> String {
    value.map_or_else(|| "undefined".to_string(), json::js_string)
}

fn truthy(value: Option<&Json>) -> bool {
    value.is_some_and(json::truthy)
}

/// `encodeURIComponent`.
fn encode_uri_component(value: &str) -> String {
    let mut out = String::new();
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&byte) {
            out.push(byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
}

fn email_ok(value: &str) -> bool {
    // /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/
    let part = |c: char| !(c.is_whitespace() || "@<>()\",;:".contains(c) || c == '\u{feff}');
    let Some((local, domain)) = value.split_once('@') else { return false };
    if local.is_empty() || !local.chars().all(part) || !domain.chars().all(part) {
        return false;
    }
    // The domain part is greedy, so any dot with text on both sides matches.
    domain.char_indices().any(|(i, c)| c == '.' && i > 0 && i + 1 < domain.len())
}

fn optional_email_problem(value: &str) -> Option<String> {
    if value.is_empty() || email_ok(value) {
        None
    } else {
        Some("Enter an email address, such as sam@example.com, or leave it blank.".to_string())
    }
}

fn optional_email() -> Check {
    Box::new(optional_email_problem)
}

fn try_it() -> String {
    format!("This CLI now uses your team's shared Guesty token. Try it: {}", highlight("guesty listings list"))
}

fn current_service() -> Result<ServiceSettings> {
    configured_service()?
        .ok_or_else(|| CliError::new("This CLI is not connected to a token service. Run guesty setup first."))
}

/// Saves the service and key. The key comes from the service, which may be
/// someone else's server.
fn use_service(url: &str, key: Option<&Json>) -> Result<String> {
    let key = js_string(key);
    if !is_access_key(&key) {
        return Err(CliError::new("The token service returned an invalid access key. Nothing was saved."));
    }
    let file = save_settings(&[(TOKEN_SERVICE_URL_ENV, Some(url)), (TOKEN_SERVICE_KEY_ENV, Some(&key))])?;
    Ok(file.to_string_lossy().into_owned())
}

fn service_name(url: &str) -> String {
    if url == HOSTED_TOKEN_SERVICE_URL { "StayKit hosted service".to_string() } else { url.to_string() }
}

fn short_path(file: &str) -> String {
    let home = crate::env::home().to_string_lossy().into_owned();
    match file.strip_prefix(&format!("{home}/")) {
        Some(rest) => format!("~/{rest}"),
        None => file.to_string(),
    }
}

/// `new Date(value).toLocaleString("en-US", ...)` in Pacific time, such as "Nov 14, 3:05 PM PST".
fn pacific(value: Option<&Json>) -> String {
    let ms = match value {
        Some(Json::Number(n)) => n.as_f64().unwrap_or(f64::NAN),
        Some(Json::Null) => 0.0,
        Some(Json::Bool(b)) => f64::from(u8::from(*b)),
        _ => f64::NAN,
    };
    pacific_ms(ms)
}

fn pacific_ms(ms: f64) -> String {
    if !ms.is_finite() || ms.abs() > 8.64e15 {
        return "Invalid Date".to_string();
    }
    match chrono::DateTime::from_timestamp_millis(ms.trunc() as i64) {
        Some(at) => at.with_timezone(&chrono_tz::America::Los_Angeles).format("%b %-d, %-I:%M %p %Z").to_string(),
        None => "Invalid Date".to_string(),
    }
}

fn call(
    url: &str,
    method: &str,
    path: &str,
    key: Option<&str>,
    body: Option<Json>,
) -> std::result::Result<Json, CallError> {
    token_service::call(url, method, path, key, body.as_ref(), None)
}

fn row(label: &str, value: impl Into<String>) -> (String, String) {
    (label.to_string(), value.into())
}

fn ask_credentials(kind: &str) -> Result<Json> {
    let client_id = text(
        &format!("Guesty {kind} client ID"),
        TextOptions { check: Some(required("Paste the client ID.")), ..Default::default() },
    )?;
    let client_secret = secret(&format!("Guesty {kind} client secret"), Some(required("Paste the client secret.")))?;
    Ok(json!({ "client_id": client_id, "client_secret": client_secret }))
}

/// Asks for the teammate's name and email unless the name was given, then
/// creates a one-time invite, which the service emails when given an address.
/// Returns the name and link.
fn invite_teammate(
    service: &ServiceSettings,
    name: Option<&str>,
    email: Option<&str>,
    admin: bool,
) -> Result<(String, String)> {
    let given_name = name.is_some_and(|n| !n.is_empty());
    let name = match name {
        Some(name) => name.to_string(),
        None => text(
            "Teammate's name",
            TextOptions {
                placeholder: Some("Shown in guesty team status".into()),
                check: Some(required("Enter their name.")),
                ..Default::default()
            },
        )?,
    };
    let email = match email {
        Some(email) => email.to_string(),
        None if given_name => String::new(),
        None => text(
            "Their email address",
            TextOptions {
                placeholder: Some("Leave blank to send them the link yourself".into()),
                check: Some(optional_email()),
                ..Default::default()
            },
        )?,
    };
    if let Some(problem) = optional_email_problem(&email) {
        return Err(CliError::new(problem));
    }
    let shown_name = printable(&name);
    let mut body = json!({ "label": name, "role": if admin { "admin" } else { "member" } });
    if !email.is_empty() {
        body["email"] = Json::String(email.clone());
    }
    let working = if email.is_empty() {
        format!("Creating {shown_name}'s invite")
    } else {
        format!("Emailing {shown_name} an invite")
    };
    let invite = task(
        &working,
        |created: &Json| {
            let sent = maybe(Some(created), "email");
            if truthy(maybe(sent, "sent")) {
                format!("Emailed the invite to {}", printable(&js_string(maybe(sent, "address"))))
            } else {
                format!("Created {shown_name}'s invite")
            }
        },
        "No invite was created",
        || match call(&service.url, "POST", "/v1/team/invites", Some(&service.key), Some(body)) {
            Ok(created) => Ok(created),
            Err(CallError::Service(e)) if e.code.as_deref() == Some("not_found") => Err(CliError::new(
                "This token service is too old to create invites. Its admin can update it; see \"Run your own token service\" in the README.",
            )),
            Err(e) => Err(e.into()),
        },
    )?;
    let (link, join_command) = invited_link(&service.url, prop(Some(&invite), "link")?.unwrap_or(&Json::Null))?;
    let sent = maybe(Some(&invite), "email");
    if !email.is_empty() && !truthy(maybe(sent, "sent")) {
        let reason = match present(maybe(sent, "message")) {
            Some(message) => shown(Some(message))?,
            None => "The token service didn't say why.".to_string(),
        };
        warn(&format!("The invite wasn't emailed. {reason} Send {shown_name} the link instead."));
    }
    let mut rows = vec![
        row("Link", link.clone()),
        row("Or they run", highlight(&join_command)),
        row("Expires", pacific(maybe(Some(&invite), "expires_at"))),
    ];
    if admin {
        rows.push(row("Role", "Admin"));
    }
    summary(&format!("Invite for {shown_name}"), &rows);
    Ok((name, link))
}

/// Guesty confirms the credentials before the service saves anything, so this
/// uses one of the account's daily tokens; that token then serves the team.
pub(crate) fn create_team_on(url: &str) -> Result<()> {
    let base = service_url(url)?;
    if base == HOSTED_TOKEN_SERVICE_URL {
        info(&format!(
            "StayKit's service stores your Guesty client ID and secret encrypted, and gives the token only to access keys your team creates. {} removes everything.",
            highlight("guesty team delete")
        ));
    }
    let name = text(
        "Team name",
        TextOptions {
            placeholder: Some("Your company's name".into()),
            check: Some(required("Enter a team name.")),
            ..Default::default()
        },
    )?;
    let admin_label = text(
        "Your name",
        TextOptions {
            placeholder: Some("Shown to your team's admins".into()),
            fallback: Some("Admin".into()),
            ..Default::default()
        },
    )?;
    // Every tool using a client ID shares its five tokens a day, and Guesty allows five client IDs per account.
    info(&format!(
        "Next, a Guesty Open API key. Create a new OAuth application in Guesty just for this team, so your other tools keep their own five tokens a day. How: {GUESTY_OPEN_API_GUIDE}"
    ));
    let openapi = ask_credentials("Open API")?;
    let beapi = if confirm("Add booking engine API credentials too?")? {
        Some(ask_credentials("booking engine")?)
    } else {
        None
    };
    let mut credentials = json!({ "openapi": openapi });
    if let Some(beapi) = beapi {
        credentials["beapi"] = beapi;
    }
    let body = json!({ "name": name, "admin_label": admin_label, "credentials": credentials });
    let created = task(
        "Checking your credentials with Guesty",
        |_: &Json| "Guesty accepted your credentials".to_string(),
        "Setup stopped",
        || call(&base, "POST", "/v1/teams", None, Some(body)).map_err(CliError::from),
    )?;
    let admin_key = maybe(Some(&created), "admin_key");
    let file = use_service(&base, admin_key)?;
    let team_name = shown(prop(prop(Some(&created), "team")?, "name")?)?;
    let recovered = truthy(maybe(Some(&created), "recovered"));
    if recovered {
        info(&format!(
            "These credentials already belong to the team \"{team_name}\". This CLI now has a new admin key for it."
        ));
    }
    let beapi_error = maybe(Some(&created), "beapi_error");
    if truthy(beapi_error) {
        warn(&format!("Booking engine credentials were not added: {}", shown(prop(beapi_error, "message")?)?));
    }
    let title =
        if recovered { format!("Reconnected to \"{team_name}\"") } else { format!("Team \"{team_name}\" is ready") };
    summary(
        &title,
        &[
            row("Service", service_name(&base)),
            row("Your role", "Admin"),
            row("Settings", short_path(&file)),
            row("Invite", highlight("guesty team invite")),
        ],
    );
    // Prompted with the key just created, not whatever the environment says.
    let key = js_string(admin_key);
    let admin = ServiceSettings { url: base.clone(), key };
    let mut first = true;
    while confirm(if first { "Invite a teammate now?" } else { "Invite someone else?" })? {
        first = false;
        match invite_teammate(&admin, None, None, false) {
            Ok(_) => {}
            // The team exists either way; a failed invite shouldn't read as a failed setup.
            Err(e) => warn(&printable(&e.message())),
        }
    }
    done(&try_it());
    Ok(())
}

/// Invite codes from CLI 1.4 hold the key itself.
fn join_with_key(settings: &ServiceSettings) -> Result<()> {
    task(
        "Joining your team",
        |_: &Json| "Joined your team".to_string(),
        "Couldn't join the team",
        || {
            call(&settings.url, "POST", "/v1/token", Some(&settings.key), Some(json!({ "token_type": "openapi" })))
                .map_err(CliError::from)
        },
    )?;
    let file = use_service(&settings.url, Some(&Json::String(settings.key.clone())))?;
    summary("You're on the team", &[row("Service", service_name(&settings.url)), row("Settings", short_path(&file))]);
    done(&try_it());
    Ok(())
}

pub(crate) fn join_team(value: &str) -> Result<()> {
    let invite = parse_invite(value)?;
    // Joining replaces this CLI's connection, which may be an admin key.
    if configured_service()?.is_some() && !confirm("This CLI is already connected to a team. Replace that connection?")?
    {
        return Err(CliError::new("Nothing was changed. This CLI is still connected to its team."));
    }
    let (url, code) = match invite {
        Invite::Key(settings) => return join_with_key(&settings),
        Invite::Code { url, code } => (url, code),
    };
    let joined = task(
        "Joining your team",
        |result: &Json| {
            let name = present(maybe(maybe(Some(result), "team"), "name"));
            format!("Joined \"{}\"", printable(&name.map_or_else(|| "your team".to_string(), json::js_string)))
        },
        "Couldn't join the team",
        || call(&url, "POST", "/v1/join", None, Some(json!({ "code": code }))).map_err(CliError::from),
    )?;
    // Saved before the token check: the invite is now used, and a token the
    // team can't renew right now shouldn't cost the teammate their key.
    let key = maybe(Some(&joined), "key");
    let file = use_service(&url, key)?;
    if let Err(e) = call(&url, "POST", "/v1/token", Some(&js_string(key)), Some(json!({ "token_type": "openapi" }))) {
        warn(&format!(
            "You're on the team, but its Guesty token isn't available right now: {}",
            printable(&CliError::from(e).message())
        ));
    }
    let team_name = match present(maybe(maybe(Some(&joined), "team"), "name")) {
        Some(name) => shown(Some(name))?,
        None => String::new(),
    };
    let role = if maybe(Some(&joined), "role").and_then(Json::as_str) == Some("admin") { "Admin" } else { "Member" };
    summary(
        &format!("You're on the \"{team_name}\" team"),
        &[
            row("Service", service_name(&url)),
            row("Your name", printable(&js_string(maybe(Some(&joined), "label")))),
            row("Role", role),
            row("Settings", short_path(&file)),
        ],
    );
    done(&try_it());
    Ok(())
}

/// `print(value)` for a token-service reply.
fn print_reply(value: Json) {
    match value {
        Json::String(s) => print(&Data::Text(s)),
        other => print(&Data::Json(other)),
    }
}

fn status_view(status: &Json) -> Result<()> {
    let team = prop(Some(status), "team")?;
    let now = crate::hooks::now_ms();
    frame(&format!("Team \"{}\"", shown(prop(team, "name")?)?), || {
        let types = prop(Some(status), "token_types")?;
        for item in types.and_then(Json::as_array).into_iter().flatten() {
            let token_type = maybe(Some(item), "token_type").and_then(Json::as_str);
            let title = if token_type == Some("openapi") { "Open API" } else { "Booking engine" };
            if !truthy(maybe(Some(item), "configured")) {
                let add =
                    format!("guesty team credentials{}", if token_type == Some("beapi") { " --beapi" } else { "" });
                summary(title, &[row("Status", format!("Not set up. Add it with {}", highlight(&add)))]);
                continue;
            }
            let expires = maybe(Some(item), "token_expires_at");
            let valid = expires.and_then(Json::as_f64).is_some_and(|at| at != 0.0 && at > now);
            let last = maybe(Some(item), "last_request").filter(|v| json::truthy(v));
            let last_text = match last {
                Some(last) => {
                    let http = maybe(Some(last), "http_status").filter(|v| json::truthy(v));
                    format!(
                        "{}{}, {}",
                        shown(maybe(Some(last), "outcome"))?,
                        http.map_or(String::new(), |h| format!(" (HTTP {})", printable(&json::js_string(h)))),
                        pacific(maybe(Some(last), "requested_at"))
                    )
                }
                None => "None in the last 24 hours".to_string(),
            };
            summary(
                title,
                &[
                    row(
                        "Token",
                        if valid {
                            format!("Valid until {}", pacific(expires))
                        } else {
                            "None yet. The next request gets one".into()
                        },
                    ),
                    row(
                        "Requests",
                        format!(
                            "{} of Guesty's 5 in the last 24 hours",
                            printable(&js_string(maybe(Some(item), "requests_last_24h")))
                        ),
                    ),
                    row("Last request", last_text),
                ],
            );
        }
        let mut keys = Vec::new();
        for key in prop(Some(status), "keys")?.and_then(Json::as_array).into_iter().flatten() {
            let state = if truthy(maybe(Some(key), "revoked_at")) {
                "revoked".to_string()
            } else if truthy(maybe(Some(key), "last_used_at")) {
                format!("last used {}", pacific(maybe(Some(key), "last_used_at")))
            } else {
                "never used".to_string()
            };
            keys.push(row(
                &shown(maybe(Some(key), "label"))?,
                format!("{}, {state}", shown(maybe(Some(key), "role"))?),
            ));
        }
        summary("Access keys", &keys);
        let invites = maybe(Some(status), "invites").and_then(Json::as_array).filter(|i| !i.is_empty());
        if let Some(invites) = invites {
            let mut rows = Vec::new();
            for invite in invites {
                let email = maybe(Some(invite), "email").filter(|v| json::truthy(v));
                let sent = match email {
                    Some(email) => format!("emailed to {}", shown(Some(email))?),
                    None => "link only".to_string(),
                };
                rows.push(row(
                    &shown(maybe(Some(invite), "label"))?,
                    format!(
                        "{}, {sent}, expires {}",
                        shown(maybe(Some(invite), "role"))?,
                        pacific(maybe(Some(invite), "expires_at"))
                    ),
                ));
            }
            summary("Pending invites", &rows);
        }
        done(&format!(
            "The team may make {} token requests a day. Change it with {}.",
            printable(&js_string(maybe(team, "max_requests_per_day"))),
            highlight("guesty team limit <1-5>")
        ));
        Ok(())
    })
}

fn token_type(beapi: bool) -> &'static str {
    if beapi { "beapi" } else { "openapi" }
}

pub fn command() -> Command {
    Command::new("team")
        .description("Share one Guesty token with your team through a token service")
        .command(
            Command::new("join")
                .description("Join your team with the invite code or link its admin sent you (same as guesty join)")
                .argument("<invite>", "Invite code, such as ABCD-EFGH-JKLM, or invite link")
                .action(|c| frame("Join a team", || join_team(c.arg(0)))),
        )
        .command(
            Command::new("invite")
                .description("Invite a teammate: the service emails them a one-time invite, or you send them the link")
                .argument(
                    "[name]",
                    "Teammate's name, used to cancel or revoke their access later. Asked for when left out, along with their email",
                )
                .option("--email <address>", "Email the invite to this address")
                .option("--admin", "Let this teammate manage the team too")
                .action(|c| {
                    let service = current_service()?;
                    let mut link = String::new();
                    frame("Invite a teammate", || {
                        let (invited, created) =
                            invite_teammate(&service, c.arg_opt(0), c.opts.str("email"), c.opts.flag("admin"))?;
                        link = created;
                        done(&format!(
                            "It works once. To cancel it, run {}.",
                            highlight(&format!("guesty team revoke \"{}\"", printable(&invited)))
                        ));
                        Ok(())
                    })?;
                    // Printed on its own, outside the frame, so it copies cleanly.
                    print(&Data::Text(link));
                    Ok(())
                }),
        )
        .command(
            Command::new("revoke")
                .description("Revoke a teammate's access key and cancel their pending invite")
                .argument("<name>", "The name the key or invite was created with")
                .action(|c| {
                    let service = current_service()?;
                    let name = c.arg(0);
                    let path = format!("/v1/team/keys/{}", encode_uri_component(name));
                    let result = call(&service.url, "DELETE", &path, Some(&service.key), None)?;
                    let key = prop(Some(&result), "key")?;
                    let shown_name = printable(name);
                    if key == Some(&Json::Bool(false)) {
                        success(&format!("Cancelled {shown_name}'s invite."));
                        return Ok(());
                    }
                    let invite = truthy(maybe(Some(&result), "invite"));
                    success(&format!(
                        "Revoked {shown_name}'s key{}. A token they already have works until it expires, at most 24 hours.",
                        if invite { " and cancelled their pending invite" } else { "" }
                    ));
                    Ok(())
                }),
        )
        .command(
            Command::new("status")
                .description("Show the team's tokens, recent token requests and access keys (admin)")
                .action(|_| {
                    let service = current_service()?;
                    let status = call(&service.url, "GET", "/v1/team", Some(&service.key), None)?;
                    if !interactive() || !crate::hooks::is_terminal(crate::hooks::Stream::Stdout) {
                        print_reply(status);
                        return Ok(());
                    }
                    status_view(&status)
                }),
        )
        .command(
            Command::new("refresh")
                .description("Replace a token Guesty rejected before it expired. Uses one of the day's token requests (admin)")
                .option("--beapi", "Replace the booking-engine token instead of the Open API token")
                .action(|c| {
                    let service = current_service()?;
                    let body = json!({ "token_type": token_type(c.opts.flag("beapi")) });
                    task(
                        "Asking the token service for a new token",
                        |result: &Json| {
                            format!("New token issued. It expires {}.", pacific(maybe(Some(result), "expires_at")))
                        },
                        "No new token was issued",
                        || call(&service.url, "POST", "/v1/team/refresh", Some(&service.key), Some(body)).map_err(CliError::from),
                    )?;
                    Ok(())
                }),
        )
        .command(
            Command::new("credentials")
                .description("Add or replace the team's Guesty credentials. Guesty confirms them first (admin)")
                .option("--beapi", "Set booking-engine API credentials instead of Open API")
                .action(|c| {
                    let service = current_service()?;
                    let beapi = c.opts.flag("beapi");
                    frame("Update Guesty credentials", || {
                        let input = ask_credentials(if beapi { "booking engine" } else { "Open API" })?;
                        let mut body = json!({ "token_type": token_type(beapi) });
                        for (k, v) in input.as_object().into_iter().flatten() {
                            body[k.as_str()] = v.clone();
                        }
                        task(
                            "Checking the credentials with Guesty",
                            |_: &Json| "Guesty accepted the credentials".to_string(),
                            "Nothing was changed",
                            || {
                                call(&service.url, "PUT", "/v1/team/credentials", Some(&service.key), Some(body))
                                    .map_err(CliError::from)
                            },
                        )?;
                        done("Saved. The team now uses the new credentials.");
                        Ok(())
                    })
                }),
        )
        .command(
            Command::new("limit")
                .description("Set how many token requests the team may make in any 24 hours, from 1 to 5 (admin)")
                .argument("<count>", "Requests per 24 hours")
                .action(|c| {
                    let service = current_service()?;
                    let value = prompt::js_number(c.arg(0)).unwrap_or(f64::NAN);
                    call(
                        &service.url,
                        "PATCH",
                        "/v1/team",
                        Some(&service.key),
                        Some(json!({ "max_requests_per_day": json::number(value) })),
                    )?;
                    success(&format!(
                        "The team may now make {} token requests in any 24 hours.",
                        json::number_to_string(value, false)
                    ));
                    Ok(())
                }),
        )
        .command(
            Command::new("delete")
                .description("Delete the team, its stored Guesty credentials and every access key (admin)")
                .option("--yes", "Confirm without asking")
                .action(|c| {
                    let service = current_service()?;
                    frame("Delete the team", || {
                        if !c.opts.flag("yes") && !confirm("Delete this team and its stored Guesty credentials for everyone?")? {
                            done("Nothing was deleted.");
                            return Ok(());
                        }
                        task(
                            "Deleting the team",
                            |_: &Json| "Deleted the team".to_string(),
                            "Nothing was deleted",
                            || call(&service.url, "DELETE", "/v1/team", Some(&service.key), None).map_err(CliError::from),
                        )?;
                        save_settings(&[(TOKEN_SERVICE_URL_ENV, None), (TOKEN_SERVICE_KEY_ENV, None)])?;
                        done("Deleted the team and removed this CLI's token-service settings.");
                        Ok(())
                    })
                }),
        )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn emails() {
        assert!(email_ok("sam@example.com"));
        assert!(email_ok("a@b.c.d"));
        assert!(!email_ok("sam@example"));
        assert!(!email_ok("a b@example.com"));
        assert!(!email_ok("a@b@c.com"));
    }

    #[test]
    fn dates() {
        assert_eq!(pacific_ms(1763161500000.0), "Nov 14, 3:05 PM PST");
        assert_eq!(pacific_ms(0.0), "Dec 31, 4:00 PM PST");
        assert_eq!(pacific_ms(f64::NAN), "Invalid Date");
    }

    #[test]
    fn uri_components() {
        assert_eq!(encode_uri_component("Sam O'Neil/ä"), "Sam%20O'Neil%2F%C3%A4");
    }
}
