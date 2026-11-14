//! `POST /mcp`: Streamable HTTP with stateless JSON responses (no SSE, no sessions).
//!
//! Order of checks: Origin (S10), method, declared size, bearer token, content type, streamed
//! size (1 MB), one JSON-RPC message, `MCP-Protocol-Version`, then the per-grant tool-call limit
//! (S3) and the handler.

use serde_json::{Value, json};
use worker::{Headers, Method, Request, Response, Result};

use super::backend::WorkerBackend;
use super::{App, BodyError, empty_response, json_response, json_text_response, limited, log_error, read_body};
use crate::clock::{Deadline, now_ms};
use crate::hosted::CoreHandler;
use crate::mcp::{
    GrantInfo, MAX_REQUEST_BYTES, McpHandler, McpOutcome, Message, classify, header_version_ok, rpc_error,
};
use crate::oauth::origin_allowed;
use crate::store;

fn with_cors(response: Response, origin: Option<&str>) -> Result<Response> {
    let Some(origin) = origin else {
        return Ok(response);
    };
    let headers = response.headers().clone();
    headers.set("access-control-allow-origin", origin)?;
    headers.set("access-control-expose-headers", "WWW-Authenticate, MCP-Protocol-Version")?;
    headers.append("vary", "Origin")?;
    Ok(response.with_headers(headers))
}

fn unauthorized(app: &App, invalid_token: bool) -> Result<Response> {
    let metadata = app.config.resource_metadata_url();
    let (challenge, body) = if invalid_token {
        (
            format!(
                "Bearer error=\"invalid_token\", error_description=\"The access token is invalid, expired or revoked.\", resource_metadata=\"{metadata}\""
            ),
            json!({ "error": "invalid_token", "error_description": "The access token is invalid, expired or revoked. Sign in again." }),
        )
    } else {
        (
            format!("Bearer resource_metadata=\"{metadata}\""),
            json!({ "error": "unauthorized", "error_description": "Sign in to use this server." }),
        )
    };
    let response = json_response(401, &body)?;
    let headers = response.headers().clone();
    headers.set("www-authenticate", &challenge)?;
    Ok(response.with_headers(headers))
}

fn rpc_status(status: u16, body: &Value) -> Result<Response> {
    json_response(status, body)
}

pub(crate) async fn handle(mut req: Request, app: &App) -> Result<Response> {
    let origin = req.headers().get("origin")?;
    if !origin_allowed(origin.as_deref()) {
        return json_response(
            403,
            &json!({ "error": "forbidden_origin", "error_description": "Requests from this Origin aren't allowed." }),
        );
    }
    let origin = origin.as_deref();
    let response = match req.method() {
        Method::Post => post(&mut req, app).await?,
        Method::Options => {
            let headers = Headers::new();
            headers.set("access-control-allow-methods", "POST, OPTIONS")?;
            headers.set(
                "access-control-allow-headers",
                "Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
            )?;
            headers.set("access-control-max-age", "600")?;
            Response::empty()?.with_status(204).with_headers(headers)
        }
        _ => {
            let response = json_response(
                405,
                &json!({ "error": "method_not_allowed", "error_description": "This server answers POST only (no SSE stream)." }),
            )?;
            let headers = response.headers().clone();
            headers.set("allow", "POST")?;
            response.with_headers(headers)
        }
    };
    with_cors(response, origin)
}

async fn post(req: &mut Request, app: &App) -> Result<Response> {
    let deadline = Deadline::after(now_ms(), app.config.call_budget_ms);
    let declared = req.headers().get("content-length")?.and_then(|v| v.trim().parse::<u64>().ok());
    if declared.is_some_and(|n| n > MAX_REQUEST_BYTES as u64) {
        return rpc_status(413, &rpc_error(&Value::Null, -32600, "The request body is larger than 1 MB."));
    }
    let Some(token) =
        req.headers().get("authorization")?.and_then(|h| h.strip_prefix("Bearer ").map(|t| t.trim().to_string()))
    else {
        return unauthorized(app, false);
    };
    let grant = match store::grant_for_access_token(&app.db, &app.keys, &token, now_ms()).await {
        Ok(Some(grant)) => grant,
        Ok(None) => return unauthorized(app, true),
        Err(_) => {
            log_error("db_auth");
            return rpc_status(
                503,
                &rpc_error(&Value::Null, -32603, "The server couldn't check the access token. Try again."),
            );
        }
    };
    let content_type = req.headers().get("content-type")?.unwrap_or_default().to_ascii_lowercase();
    if !content_type.starts_with("application/json") {
        return rpc_status(415, &rpc_error(&Value::Null, -32600, "Content-Type must be application/json."));
    }
    let body = match read_body(req, MAX_REQUEST_BYTES).await {
        Ok(body) => body,
        Err(BodyError::TooLarge) => {
            return rpc_status(413, &rpc_error(&Value::Null, -32600, "The request body is larger than 1 MB."));
        }
        Err(BodyError::Unreadable) => {
            return rpc_status(400, &rpc_error(&Value::Null, -32700, "The request body couldn't be read."));
        }
    };
    let request = match classify(&body) {
        Message::Request(request) => request,
        Message::Accepted => return empty_response(202),
        Message::Invalid(error) => return rpc_status(400, &error),
    };
    let version = req.headers().get("mcp-protocol-version")?;
    if request.method != "initialize" && !header_version_ok(version.as_deref()) {
        return rpc_status(400, &rpc_error(&request.id, -32600, "Unsupported MCP-Protocol-Version."));
    }
    // S3: approximate abuse control per sign-in, counted per Cloudflare location. Guesty's own
    // 429 / Retry-After handling is the real limit.
    if request.method == "tools/call" && limited(app, "TOOL_LIMITER", grant.id.clone()).await {
        let response = rpc_status(
            429,
            &rpc_error(
                &request.id,
                -32000,
                "Too many tool calls this minute for this sign-in. Wait a minute and try again.",
            ),
        )?;
        let headers = response.headers().clone();
        headers.set("retry-after", "60")?;
        return Ok(response.with_headers(headers));
    }
    let Some(member_key) = grant.member_key(&app.keys) else {
        // A sealed key that doesn't open (MCP_KEY changed): the sign-in can't work again.
        log_error("unseal_failed");
        if store::revoke_grant(&app.db, &grant.id, "unseal_failed", now_ms()).await.is_err() {
            log_error("revoke_failed");
        }
        return unauthorized(app, true);
    };
    let info = GrantInfo {
        grant_id: grant.id.clone(),
        client_id: grant.client_id.clone(),
        team_name: grant.team_name.clone(),
        key_label: grant.key_label.clone(),
        role: grant.role,
        read_only: grant.read_only,
    };
    let backend = WorkerBackend { app, grant: info, member_key, deadline };
    let handler = CoreHandler { settings: app.config.hosted_settings() };
    let response = match handler.handle(&backend, &request).await {
        McpOutcome::Response(text) => json_text_response(200, text)?,
        McpOutcome::Unauthorized => unauthorized(app, true)?,
    };
    if app.config.report_wasm_memory {
        let headers = response.headers().clone();
        headers.set("x-wasm-memory-bytes", &wasm_memory_bytes().to_string())?;
        return Ok(response.with_headers(headers));
    }
    Ok(response)
}

/// The wasm instance's memory size in bytes (tests only; see `Config::report_wasm_memory`).
fn wasm_memory_bytes() -> u32 {
    use wasm_bindgen::JsCast;
    wasm_bindgen::memory()
        .dyn_into::<js_sys::WebAssembly::Memory>()
        .map(|memory| memory.buffer().unchecked_into::<js_sys::ArrayBuffer>().byte_length())
        .unwrap_or(0)
}
