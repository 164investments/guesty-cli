//! The Worker: routing, responses, rate limits and logging.
//!
//! Logging (S9): the Worker writes only `guesty-mcp error: <code>` lines with a fixed code. It
//! never logs a URL, query, header, body, token or key; [`log_error`] takes only `&'static str`.

mod backend;
mod d1;
mod mcp_route;
mod oauth_routes;

use futures_util::StreamExt;
use serde_json::{Value, json};
use worker::{Env, Headers, Method, Request, Response, Result, event};

use crate::config::Config;
use crate::crypto::{Keys, nonce};
use crate::html;
use crate::token_service::client_network;

pub(crate) use d1::D1Db;

/// Form and JSON bodies of the OAuth endpoints.
const MAX_FORM_BYTES: usize = 16 * 1024;

pub(crate) struct App {
    pub env: Env,
    pub config: Config,
    pub keys: Keys,
    pub db: D1Db,
}

pub(crate) fn log_error(code: &'static str) {
    worker::console_error!("guesty-mcp error: {code}");
}

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: worker::Context) -> Result<Response> {
    match handle(req, env).await {
        Ok(response) => Ok(response),
        Err(_) => {
            log_error("internal");
            json_response(
                500,
                &json!({ "error": "server_error", "error_description": "The server hit an internal error." }),
            )
        }
    }
}

fn app(env: Env) -> std::result::Result<App, &'static str> {
    let public_url = env.var("PUBLIC_URL").map(|v| v.to_string()).map_err(|_| "config_public_url")?;
    let origins = env.var("TOKEN_SERVICE_ORIGINS").map(|v| v.to_string()).unwrap_or_default();
    // Unset in production; tests lower them so timeouts and deadlines take seconds.
    let test_var = |name: &str| env.var(name).ok().map(|v| v.to_string());
    let config = Config::new(&public_url, &origins)
        .ok_or("config_public_url")?
        .with_test_limits(test_var("CALL_BUDGET_MS").as_deref(), test_var("GUESTY_TIMEOUT_MS").as_deref());
    let secret = env.secret("MCP_KEY").map(|v| v.to_string()).map_err(|_| "config_mcp_key")?;
    let keys = Keys::from_secret(&secret).map_err(|_| "config_mcp_key")?;
    let db = D1Db(env.d1("DB").map_err(|_| "config_db")?);
    Ok(App { env, config, keys, db })
}

async fn handle(req: Request, env: Env) -> Result<Response> {
    let app = match app(env) {
        Ok(app) => app,
        Err(code) => {
            log_error(code);
            return json_response(
                500,
                &json!({ "error": "server_error", "error_description": "The server isn't configured." }),
            );
        }
    };
    let path = req.path();
    let method = req.method();
    let is_get = matches!(method, Method::Get | Method::Head);
    let response = match path.as_str() {
        "/mcp" => mcp_route::handle(req, &app).await?,
        "/.well-known/oauth-protected-resource" | "/.well-known/oauth-protected-resource/mcp" if is_get => {
            cors_any(json_response(200, &app.config.protected_resource_metadata())?)?
        }
        "/.well-known/oauth-authorization-server" if is_get => {
            cors_any(json_response(200, &app.config.authorization_server_metadata())?)?
        }
        "/.well-known/oauth-protected-resource"
        | "/.well-known/oauth-protected-resource/mcp"
        | "/.well-known/oauth-authorization-server"
        | "/register"
        | "/token"
        | "/revoke"
            if method == Method::Options =>
        {
            preflight_any()?
        }
        "/register" if method == Method::Post => cors_any(oauth_routes::register(req, &app).await?)?,
        "/token" if method == Method::Post => cors_any(oauth_routes::token(req, &app).await?)?,
        "/revoke" if method == Method::Post => cors_any(oauth_routes::revoke(req, &app).await?)?,
        "/authorize" if is_get => oauth_routes::authorize_get(req, &app).await?,
        "/authorize" if method == Method::Post => oauth_routes::authorize_post(req, &app).await?,
        "/" if is_get => {
            let nonce = nonce();
            html_response(200, &html::landing(&app.config.resource(), &nonce), &nonce, None)?
        }
        "/.well-known/oauth-protected-resource"
        | "/.well-known/oauth-protected-resource/mcp"
        | "/.well-known/oauth-authorization-server"
        | "/register"
        | "/token"
        | "/revoke"
        | "/authorize"
        | "/" => json_response(405, &json!({ "error": "method_not_allowed" }))?,
        _ => json_response(404, &json!({ "error": "not_found" }))?,
    };
    finish(response, &app)
}

/// Headers every response gets.
fn finish(response: Response, app: &App) -> Result<Response> {
    let headers = response.headers().clone();
    headers.set("x-content-type-options", "nosniff")?;
    headers.set("referrer-policy", "no-referrer")?;
    if app.config.public_url.starts_with("https://") {
        headers.set("strict-transport-security", "max-age=31536000")?;
    }
    Ok(response.with_headers(headers))
}

pub(crate) fn json_response(status: u16, value: &Value) -> Result<Response> {
    let headers = Headers::new();
    headers.set("content-type", "application/json")?;
    headers.set("cache-control", "no-store")?;
    Ok(Response::from_bytes(value.to_string().into_bytes())?.with_status(status).with_headers(headers))
}

/// A JSON body already written as text (the core's JSON-RPC replies).
pub(crate) fn json_text_response(status: u16, text: String) -> Result<Response> {
    let headers = Headers::new();
    headers.set("content-type", "application/json")?;
    headers.set("cache-control", "no-store")?;
    Ok(Response::from_bytes(text.into_bytes())?.with_status(status).with_headers(headers))
}

pub(crate) fn empty_response(status: u16) -> Result<Response> {
    let headers = Headers::new();
    headers.set("cache-control", "no-store")?;
    Ok(Response::empty()?.with_status(status).with_headers(headers))
}

/// A page with a strict CSP: no scripts, no framing, and a form that may post only here (and, for
/// the sign-in page, redirect to the app).
pub(crate) fn html_response(status: u16, body: &str, nonce: &str, redirect_source: Option<&str>) -> Result<Response> {
    let headers = Headers::new();
    headers.set("content-type", "text/html; charset=utf-8")?;
    headers.set("cache-control", "no-store")?;
    headers.set("content-security-policy", &html::csp(nonce, redirect_source))?;
    headers.set("x-frame-options", "DENY")?;
    Ok(Response::from_html(body)?.with_status(status).with_headers(headers))
}

pub(crate) fn error_page(status: u16, title: &str, message: &str) -> Result<Response> {
    let nonce = nonce();
    html_response(status, &html::error_page(title, message, &nonce), &nonce, None)
}

pub(crate) fn redirect(location: &str, status: u16) -> Result<Response> {
    let headers = Headers::new();
    headers.set("location", location)?;
    headers.set("cache-control", "no-store")?;
    Ok(Response::empty()?.with_status(status).with_headers(headers))
}

/// The metadata, registration, token and revocation endpoints carry no cookies, so any origin
/// may call them (browser-based MCP inspectors do).
fn cors_any(response: Response) -> Result<Response> {
    let headers = response.headers().clone();
    headers.set("access-control-allow-origin", "*")?;
    Ok(response.with_headers(headers))
}

fn preflight_any() -> Result<Response> {
    let headers = Headers::new();
    headers.set("access-control-allow-origin", "*")?;
    headers.set("access-control-allow-methods", "GET, POST, OPTIONS")?;
    headers.set("access-control-allow-headers", "Content-Type, Authorization, MCP-Protocol-Version")?;
    headers.set("access-control-max-age", "600")?;
    Ok(Response::empty()?.with_status(204).with_headers(headers))
}

pub(crate) fn client_ip(req: &Request) -> String {
    req.headers().get("cf-connecting-ip").ok().flatten().unwrap_or_else(|| "unknown".into())
}

/// Whether a rate limit refuses this request. A missing binding is logged and lets it through.
pub(crate) async fn limited(app: &App, binding: &'static str, key: String) -> bool {
    match app.env.rate_limiter(binding) {
        Ok(limiter) => match limiter.limit(key).await {
            Ok(outcome) => !outcome.success,
            Err(_) => {
                log_error("ratelimit_failed");
                false
            }
        },
        Err(_) => {
            log_error("ratelimit_binding_missing");
            false
        }
    }
}

pub(crate) async fn limited_by_address(app: &App, binding: &'static str, req: &Request) -> bool {
    limited(app, binding, client_network(&client_ip(req))).await
}

pub(crate) enum BodyError {
    TooLarge,
    Unreadable,
}

/// Reads a request body, refusing it once it passes `cap` bytes (counted as it streams in).
pub(crate) async fn read_body(req: &mut Request, cap: usize) -> std::result::Result<Vec<u8>, BodyError> {
    let declared = req.headers().get("content-length").ok().flatten().and_then(|v| v.trim().parse::<u64>().ok());
    if declared.is_some_and(|n| n > cap as u64) {
        return Err(BodyError::TooLarge);
    }
    let Ok(mut stream) = req.stream() else {
        return Ok(Vec::new());
    };
    let mut body = Vec::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| BodyError::Unreadable)?;
        if body.len() + chunk.len() > cap {
            return Err(BodyError::TooLarge);
        }
        body.extend_from_slice(&chunk);
    }
    Ok(body)
}

pub(crate) async fn read_form(req: &mut Request) -> std::result::Result<Vec<(String, String)>, &'static str> {
    let content_type = req.headers().get("content-type").ok().flatten().unwrap_or_default();
    if !content_type.to_ascii_lowercase().starts_with("application/x-www-form-urlencoded") {
        return Err("The body must be application/x-www-form-urlencoded.");
    }
    let body = read_body(req, MAX_FORM_BYTES).await.map_err(|e| match e {
        BodyError::TooLarge => "The request body is too large.",
        BodyError::Unreadable => "The request body couldn't be read.",
    })?;
    let text = String::from_utf8(body).map_err(|_| "The request body isn't UTF-8.")?;
    crate::oauth::parse_form(&text)
}

pub(crate) async fn read_json(req: &mut Request) -> std::result::Result<Value, &'static str> {
    let body = read_body(req, MAX_FORM_BYTES).await.map_err(|e| match e {
        BodyError::TooLarge => "The request body is too large.",
        BodyError::Unreadable => "The request body couldn't be read.",
    })?;
    serde_json::from_slice(&body).map_err(|_| "The request body must be JSON.")
}
