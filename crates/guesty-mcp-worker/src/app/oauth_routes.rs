//! The authorization server's endpoints: `/register`, `/authorize`, `/token`, `/revoke`.

use serde_json::{Value, json};
use worker::{Request, Response, Result};

use super::backend::call_tokens;
use super::{
    App, client_ip, empty_response, error_page, html_response, json_response, limited_by_address, log_error, read_form,
    read_json, redirect,
};
use crate::clock::{Deadline, now_ms};
use crate::crypto::nonce;
use crate::html;
use crate::oauth::{
    CIMD_MAX_BYTES, CIMD_TIMEOUT_MS, ClientInfo, Credential, MAX_STATE_LENGTH, PENDING_TTL_MS, Pending, check_pkce,
    cimd_url, find_redirect, form_action_source, form_value, is_url_client_id, parse_credential, parse_form,
    parse_registration, redirect_host, redirect_with, resource_ok, validate_cimd,
};
use crate::store::{self, CodeBinding, CodeExchange, NewGrant, Role, TokenError};
use crate::token_service::parse_join;
use crate::transport::{FetchLimits, OutboundRequest, Target, TransportError, fetch};

const SIGN_IN_BUDGET_MS: i64 = 15_000;

fn oauth_error(status: u16, error: &str, description: &str) -> Result<Response> {
    json_response(status, &json!({ "error": error, "error_description": description }))
}

fn too_many() -> Result<Response> {
    let response = oauth_error(
        429,
        "temporarily_unavailable",
        "Too many requests from your network. Wait a minute and try again.",
    )?;
    let headers = response.headers().clone();
    headers.set("retry-after", "60")?;
    Ok(response.with_headers(headers))
}

pub(crate) async fn register(mut req: Request, app: &App) -> Result<Response> {
    if limited_by_address(app, "REGISTER_LIMITER", &req).await {
        return too_many();
    }
    let body = match read_json(&mut req).await {
        Ok(body) => body,
        Err(message) => return oauth_error(400, "invalid_client_metadata", message),
    };
    let (name, redirect_uris) = match parse_registration(&body) {
        Ok(parsed) => parsed,
        Err(error) => return oauth_error(400, error.code, &error.description),
    };
    let now = now_ms();
    let Ok(client_id) = store::register_client(&app.db, name.as_deref(), &redirect_uris, now).await else {
        log_error("db_register");
        return oauth_error(500, "server_error", "The client couldn't be registered. Try again.");
    };
    let mut answer = json!({
        "client_id": client_id,
        "client_id_issued_at": now / 1000,
        "redirect_uris": redirect_uris,
        "grant_types": ["authorization_code", "refresh_token"],
        "response_types": ["code"],
        "token_endpoint_auth_method": "none",
    });
    if let Some(name) = name {
        answer["client_name"] = Value::from(name);
    }
    json_response(201, &answer)
}

/// The app behind a client ID: a registered client, or an allowed metadata document.
async fn resolve_client(app: &App, client_id: &str) -> std::result::Result<ClientInfo, &'static str> {
    if let Some(url) = cimd_url(client_id) {
        let request = OutboundRequest::get(url.as_str()).header("Accept", "application/json");
        let deadline = Deadline::after(now_ms(), CIMD_TIMEOUT_MS);
        let limits =
            FetchLimits { timeout_ms: CIMD_TIMEOUT_MS, max_body_bytes: CIMD_MAX_BYTES, redirect_as_response: false };
        let response = fetch(&Target::Internet, &request, deadline, limits).await.map_err(|error| {
            log_error(match error {
                TransportError::Redirect { .. } => "cimd_redirect",
                TransportError::Timeout | TransportError::DeadlineExceeded => "cimd_timeout",
                TransportError::BodyTooLarge { .. } => "cimd_too_large",
                TransportError::Network => "cimd_network",
            });
            "The app's client information couldn't be read. Try again later."
        })?;
        if response.status != 200 {
            log_error("cimd_status");
            return Err("The app's client information couldn't be read. Try again later.");
        }
        let doc: Value =
            serde_json::from_slice(&response.body).map_err(|_| "The app's client information isn't valid JSON.")?;
        return validate_cimd(client_id, &doc);
    }
    if is_url_client_id(client_id) {
        return Err(
            "This app identifies itself with a client information URL this server doesn't read. Only Claude's and ChatGPT's are read; other apps register.",
        );
    }
    match store::get_client(&app.db, client_id).await {
        Ok(Some(client)) => Ok(client),
        Ok(None) => Err("This app isn't registered with this server. Remove the server from the app and add it again."),
        Err(_) => {
            log_error("db_client");
            Err("The server couldn't look up this app. Try again.")
        }
    }
}

fn authorization_error(
    pending_redirect: &str,
    state: Option<&str>,
    issuer: &str,
    error: &str,
    description: &str,
    status: u16,
) -> Result<Response> {
    let mut params = vec![("error", error), ("error_description", description)];
    if let Some(state) = state {
        params.push(("state", state));
    }
    params.push(("iss", issuer));
    redirect(&redirect_with(pending_redirect, &params), status)
}

fn consent_page(pending: &Pending, field: &str, error: Option<&str>, status: u16) -> Result<Response> {
    let nonce = nonce();
    let host = redirect_host(&pending.redirect_uri);
    let view = html::Consent {
        app_name: pending.client_name.as_deref(),
        verified_origin: pending.verified_origin.as_deref(),
        redirect_host: &host,
        request_field: field,
        error,
    };
    html_response(status, &html::consent(&view, &nonce), &nonce, form_action_source(&pending.redirect_uri).as_deref())
}

pub(crate) async fn authorize_get(req: Request, app: &App) -> Result<Response> {
    if limited_by_address(app, "AUTHORIZE_LIMITER", &req).await {
        return error_page(
            429,
            "Too many attempts",
            "Too many sign-in attempts came from your network. Wait a minute and try again.",
        );
    }
    let url = req.url()?;
    let Ok(query) = parse_form(url.query().unwrap_or("")) else {
        return error_page(
            400,
            "This sign-in link isn't valid",
            "A parameter was sent more than once. Go back to the app and start again.",
        );
    };
    let get = |name: &str| form_value(&query, name).filter(|v| !v.is_empty());
    // Until the client and its redirect URI check out, errors are shown here, never redirected.
    let Some(client_id) = get("client_id") else {
        return error_page(
            400,
            "This sign-in link isn't valid",
            "It has no client_id. Go back to the app and start again.",
        );
    };
    let Some(redirect_uri) = get("redirect_uri") else {
        return error_page(
            400,
            "This sign-in link isn't valid",
            "It has no redirect_uri. Go back to the app and start again.",
        );
    };
    let client = match resolve_client(app, client_id).await {
        Ok(client) => client,
        Err(message) => return error_page(400, "This app can't sign in", message),
    };
    if find_redirect(&client.redirect_uris, redirect_uri).is_none() {
        return error_page(400, "This app can't sign in", "The address it wants to return to isn't one it registered.");
    }
    let issuer = app.config.issuer();
    let state = get("state");
    if state.is_some_and(|s| s.len() > MAX_STATE_LENGTH) {
        return authorization_error(redirect_uri, None, issuer, "invalid_request", "state is too long.", 302);
    }
    if get("response_type") != Some("code") {
        return authorization_error(
            redirect_uri,
            state,
            issuer,
            "unsupported_response_type",
            "response_type must be code.",
            302,
        );
    }
    let challenge = match check_pkce(get("code_challenge"), get("code_challenge_method")) {
        Ok(challenge) => challenge,
        Err(message) => return authorization_error(redirect_uri, state, issuer, "invalid_request", message, 302),
    };
    let resource = app.config.resource();
    if !resource_ok(form_value(&query, "resource"), &resource) {
        return authorization_error(
            redirect_uri,
            state,
            issuer,
            "invalid_target",
            "resource must be this server's MCP URL.",
            302,
        );
    }
    let pending = Pending {
        client_id: client.client_id.clone(),
        client_name: client.client_name.clone(),
        verified_origin: client.verified_origin.clone(),
        redirect_uri: redirect_uri.to_string(),
        state: state.map(str::to_string),
        code_challenge: challenge,
        resource,
        expires_at: now_ms() + PENDING_TTL_MS,
    };
    let field = pending.sign(&app.keys);
    consent_page(&pending, &field, None, 200)
}

struct SignedIn {
    key: String,
    role: Role,
    team_name: Option<String>,
    label: Option<String>,
}

const SERVICE_DOWN: &str = "The team token service couldn't be reached. Try again in a minute.";

/// An existing access key: `POST /v1/token` checks it, and `GET /v1/team` tells an admin key
/// (200, with the team's name) from a member key (403).
async fn sign_in_with_key(app: &App, key: &str) -> std::result::Result<SignedIn, (u16, String)> {
    let deadline = Deadline::after(now_ms(), SIGN_IN_BUDGET_MS);
    let checked =
        call_tokens(app, "POST", "/v1/token", Some(key), Some(&json!({ "token_type": "openapi" })), None, deadline)
            .await
            .map_err(|_| (503, SERVICE_DOWN.to_string()))?;
    match checked.status {
        401 => return Err((400, "This access key is wrong or has been revoked.".into())),
        500 => return Err((503, SERVICE_DOWN.into())),
        _ => {}
    }
    let team = call_tokens(app, "GET", "/v1/team", Some(key), None, None, deadline)
        .await
        .map_err(|_| (503, SERVICE_DOWN.to_string()))?;
    match team.status {
        200 => {
            let body: Value = serde_json::from_slice(&team.body).unwrap_or(Value::Null);
            let name = body.pointer("/team/name").and_then(Value::as_str).map(|n| crate::oauth::clean_text(n, 100));
            Ok(SignedIn { key: key.to_string(), role: Role::Admin, team_name: name, label: None })
        }
        403 => Ok(SignedIn { key: key.to_string(), role: Role::Member, team_name: None, label: None }),
        401 => Err((400, "This access key is wrong or has been revoked.".into())),
        _ => Err((503, SERVICE_DOWN.into())),
    }
}

/// An invite: `POST /v1/join`, forwarding the person's address for the service's wrong-code limit.
async fn sign_in_with_invite(app: &App, code: &str, ip: &str) -> std::result::Result<SignedIn, (u16, String)> {
    let deadline = Deadline::after(now_ms(), SIGN_IN_BUDGET_MS);
    let response = call_tokens(app, "POST", "/v1/join", None, Some(&json!({ "code": code })), Some(ip), deadline)
        .await
        .map_err(|_| (503, SERVICE_DOWN.to_string()))?;
    match parse_join(response.status, &response.body) {
        Ok(joined) => {
            Ok(SignedIn { key: joined.key, role: joined.role, team_name: joined.team_name, label: joined.label })
        }
        Err(message) => {
            let status = match message.status {
                429 => 429,
                status if status >= 500 => 503,
                _ => 400,
            };
            Err((status, message.message))
        }
    }
}

pub(crate) async fn authorize_post(mut req: Request, app: &App) -> Result<Response> {
    if limited_by_address(app, "AUTHORIZE_LIMITER", &req).await {
        return error_page(
            429,
            "Too many attempts",
            "Too many sign-in attempts came from your network. Wait a minute and try again.",
        );
    }
    let ip = client_ip(&req);
    let form = match read_form(&mut req).await {
        Ok(form) => form,
        Err(message) => return error_page(400, "This sign-in didn't work", message),
    };
    let Some(field) = form_value(&form, "request") else {
        return error_page(
            400,
            "This sign-in didn't work",
            "The form is missing its request. Go back to the app and start again.",
        );
    };
    let pending = match Pending::verify(&app.keys, field, now_ms()) {
        Ok(pending) => pending,
        Err("expired") => {
            return error_page(
                400,
                "This sign-in page expired",
                "Sign-in pages last 10 minutes. Go back to the app and start again.",
            );
        }
        Err(_) => {
            return error_page(
                400,
                "This sign-in didn't work",
                "The sign-in form was changed. Go back to the app and start again.",
            );
        }
    };
    if !is_url_client_id(&pending.client_id) {
        match store::get_client(&app.db, &pending.client_id).await {
            Ok(Some(_)) => {}
            Ok(None) => {
                return error_page(
                    400,
                    "This app can't sign in",
                    "This app is no longer registered. Go back to the app and start again.",
                );
            }
            Err(_) => {
                log_error("db_client");
                return error_page(503, "Try again", "The server couldn't look up this app. Try again.");
            }
        }
    }
    let issuer = app.config.issuer();
    match form_value(&form, "action") {
        Some("approve") => {}
        Some("deny") => {
            return authorization_error(
                &pending.redirect_uri,
                pending.state.as_deref(),
                issuer,
                "access_denied",
                "The person cancelled the sign-in.",
                303,
            );
        }
        _ => return consent_page(&pending, field, Some("Choose Approve or Cancel."), 400),
    }
    let credential =
        match parse_credential(form_value(&form, "credential").unwrap_or(""), &app.config.token_service_origins) {
            Ok(credential) => credential,
            Err(message) => return consent_page(&pending, field, Some(message), 400),
        };
    let signed_in = match &credential {
        Credential::AccessKey(key) => sign_in_with_key(app, key).await,
        Credential::Invite(code) => sign_in_with_invite(app, code, &ip).await,
    };
    let signed_in = match signed_in {
        Ok(signed_in) => signed_in,
        Err((status, message)) => return consent_page(&pending, field, Some(&message), status),
    };
    let read_only = form_value(&form, "read_only") == Some("1");
    let grant = NewGrant {
        client_id: &pending.client_id,
        team_name: signed_in.team_name.as_deref(),
        key_label: signed_in.label.as_deref(),
        role: signed_in.role,
        read_only,
        member_key: &signed_in.key,
    };
    let binding = CodeBinding {
        redirect_uri: &pending.redirect_uri,
        resource: &pending.resource,
        code_challenge: &pending.code_challenge,
    };
    let Ok(code) = store::create_grant(&app.db, &app.keys, &grant, &binding, now_ms()).await else {
        log_error("db_grant");
        return error_page(503, "Try again", "The sign-in couldn't be saved. Go back to the app and start again.");
    };
    let mut params = vec![("code", code.as_str())];
    if let Some(state) = pending.state.as_deref() {
        params.push(("state", state));
    }
    params.push(("iss", issuer));
    redirect(&redirect_with(&pending.redirect_uri, &params), 303)
}

fn token_response(issued: &store::Issued) -> Result<Response> {
    let response = json_response(
        200,
        &json!({
            "access_token": issued.access_token,
            "token_type": "Bearer",
            "expires_in": issued.expires_in,
            "refresh_token": issued.refresh_token,
        }),
    )?;
    let headers = response.headers().clone();
    headers.set("pragma", "no-cache")?;
    Ok(response.with_headers(headers))
}

pub(crate) async fn token(mut req: Request, app: &App) -> Result<Response> {
    if limited_by_address(app, "TOKEN_LIMITER", &req).await {
        return too_many();
    }
    if req.headers().get("authorization")?.is_some() {
        return oauth_error(
            401,
            "invalid_client",
            "This server has public clients only (token_endpoint_auth_method none).",
        );
    }
    let form = match read_form(&mut req).await {
        Ok(form) => form,
        Err(message) => return oauth_error(400, "invalid_request", message),
    };
    let get = |name: &str| form_value(&form, name).filter(|v| !v.is_empty());
    if get("client_secret").is_some() || get("client_assertion").is_some() {
        return oauth_error(
            401,
            "invalid_client",
            "This server has public clients only (token_endpoint_auth_method none).",
        );
    }
    let Some(client_id) = get("client_id") else {
        return oauth_error(400, "invalid_request", "client_id is required.");
    };
    let resource = app.config.resource();
    if !resource_ok(form_value(&form, "resource"), &resource) {
        return oauth_error(400, "invalid_target", "resource must be this server's MCP URL.");
    }
    let now = now_ms();
    let result = match get("grant_type") {
        Some("authorization_code") => {
            let (Some(code), Some(redirect_uri), Some(verifier)) =
                (get("code"), get("redirect_uri"), get("code_verifier"))
            else {
                return oauth_error(400, "invalid_request", "code, redirect_uri and code_verifier are required.");
            };
            let exchange = CodeExchange { code, client_id, redirect_uri, verifier, resource: &resource };
            store::exchange_code(&app.db, &app.keys, &exchange, now).await
        }
        Some("refresh_token") => {
            let Some(refresh_token) = get("refresh_token") else {
                return oauth_error(400, "invalid_request", "refresh_token is required.");
            };
            store::refresh(&app.db, &app.keys, refresh_token, client_id, now).await
        }
        Some(_) => {
            return oauth_error(
                400,
                "unsupported_grant_type",
                "grant_type must be authorization_code or refresh_token.",
            );
        }
        None => return oauth_error(400, "invalid_request", "grant_type is required."),
    };
    match result {
        Ok(issued) => token_response(&issued),
        Err(TokenError::InvalidGrant(description)) => oauth_error(400, "invalid_grant", description),
        Err(TokenError::Db) => {
            log_error("db_token");
            oauth_error(500, "server_error", "The server couldn't issue tokens. Try again.")
        }
    }
}

/// RFC 7009: always 200 once the request is well-formed.
pub(crate) async fn revoke(mut req: Request, app: &App) -> Result<Response> {
    if limited_by_address(app, "TOKEN_LIMITER", &req).await {
        return too_many();
    }
    let form = match read_form(&mut req).await {
        Ok(form) => form,
        Err(message) => return oauth_error(400, "invalid_request", message),
    };
    let Some(token) = form_value(&form, "token").filter(|t| !t.is_empty()) else {
        return oauth_error(400, "invalid_request", "token is required.");
    };
    if store::revoke_token(&app.db, &app.keys, token, form_value(&form, "client_id"), now_ms()).await.is_err() {
        log_error("db_revoke");
        return oauth_error(503, "temporarily_unavailable", "Try again.");
    }
    empty_response(200)
}
