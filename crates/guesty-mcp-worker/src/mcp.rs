//! The boundary between this Worker and the MCP tool logic.
//!
//! The Worker authenticates the request, parses one JSON-RPC message and hands requests to an
//! [`McpHandler`] with a [`HostedBackend`] for that request. The shared core (`guesty-core`) plugs
//! in here: its async `Backend` trait is implemented by the Worker's backend (see
//! `app::backend::WorkerBackend`, which implements [`HostedBackend`]), and its tool dispatcher
//! becomes the `McpHandler` that replaces [`StubHandler`] in `app::mcp_route`.

use std::fmt;
use std::future::Future;

use serde_json::{Value, json};

use crate::clock::Deadline;
use crate::config::PROTOCOL_VERSIONS;
use crate::store::Role;
use crate::transport::{FetchLimits, OutboundRequest, OutboundResponse, TransportError};

/// Each tool call has 50 seconds for its token lookup, fetches, body reads and retry waits (S8).
pub const CALL_BUDGET_MS: i64 = 50_000;
/// `/mcp` request bodies (S7).
pub const MAX_REQUEST_BYTES: usize = 1024 * 1024;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TokenType {
    OpenApi,
    BookingEngine,
}

impl TokenType {
    /// The token service's name for it.
    pub fn as_str(self) -> &'static str {
        match self {
            TokenType::OpenApi => "openapi",
            TokenType::BookingEngine => "beapi",
        }
    }
}

/// The verified sign-in a request runs as.
#[derive(Clone, Debug, PartialEq)]
pub struct GrantInfo {
    pub grant_id: String,
    pub client_id: String,
    pub team_name: Option<String>,
    pub key_label: Option<String>,
    pub role: Role,
    /// Set at sign-in and kept through refreshes; the tools must make no changes when it's on.
    pub read_only: bool,
}

/// A team's Guesty token, as the token service returned it. Never logged or shown.
#[derive(Clone, PartialEq)]
pub struct TeamToken {
    pub access_token: String,
    pub expires_at: i64,
}

impl fmt::Debug for TeamToken {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("TeamToken").field("access_token", &"[redacted]").field("expires_at", &self.expires_at).finish()
    }
}

#[derive(Debug, PartialEq)]
pub enum BackendError {
    /// The token service rejected the member key (401). The grant is already revoked; the request
    /// must answer 401 `invalid_token` so the app signs in again.
    Revoked,
    /// Another token-service answer: its status, error code and message (safe to show).
    Service {
        status: u16,
        code: String,
        message: String,
    },
    Transport(TransportError),
    /// The path isn't one of the team endpoints.
    NotAllowed,
}

/// What the tool logic can do for one request.
pub trait HostedBackend {
    fn grant(&self) -> &GrantInfo;
    fn deadline(&self) -> Deadline;

    /// S2: the team's token of a type, from the token service with the grant's member key, on
    /// every call (no cache), so a revoked key stops working at once.
    fn guesty_token(&self, token_type: TokenType) -> impl Future<Output = Result<TeamToken, BackendError>>;

    /// A team endpoint of the token service (`/v1/team`, `/v1/team/…`) with the member key.
    /// Returns the status and JSON body; a 401 revokes the grant and returns `Revoked`.
    fn team_service(
        &self,
        method: &str,
        path: &str,
        body: Option<&Value>,
    ) -> impl Future<Output = Result<(u16, Value), BackendError>>;

    /// One outbound request (Guesty), with manual redirects, the deadline and a size cap.
    fn http(
        &self,
        request: OutboundRequest,
        limits: FetchLimits,
    ) -> impl Future<Output = Result<OutboundResponse, TransportError>>;
}

#[derive(Debug, PartialEq)]
pub enum McpOutcome {
    /// A JSON-RPC response object.
    Response(Value),
    /// Answer 401 `invalid_token` (the grant was revoked during the call).
    Unauthorized,
}

#[derive(Debug, Clone, PartialEq)]
pub struct JsonRpcRequest {
    pub id: Value,
    pub method: String,
    pub params: Value,
}

pub trait McpHandler {
    fn handle<B: HostedBackend>(&self, backend: &B, request: &JsonRpcRequest) -> impl Future<Output = McpOutcome>;
}

#[derive(Debug, PartialEq)]
pub enum Message {
    Request(JsonRpcRequest),
    /// A notification or a response from the client: answered 202 with no body.
    Accepted,
    /// A JSON-RPC error to send with HTTP 400.
    Invalid(Value),
}

pub fn rpc_result(id: &Value, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}

pub fn rpc_error(id: &Value, code: i64, message: &str) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } })
}

/// Parses one JSON-RPC message. Batches aren't supported (one tool call per request, S7); JSON
/// nested deeper than 128 levels is refused by serde_json's recursion limit.
pub fn classify(body: &[u8]) -> Message {
    let value: Value = match serde_json::from_slice(body) {
        Ok(value) => value,
        Err(_) => return Message::Invalid(rpc_error(&Value::Null, -32700, "The request body isn't valid JSON.")),
    };
    let Value::Object(object) = value else {
        if value.is_array() {
            return Message::Invalid(rpc_error(
                &Value::Null,
                -32600,
                "Batch requests aren't supported. Send one message per request.",
            ));
        }
        return Message::Invalid(rpc_error(&Value::Null, -32600, "A JSON-RPC message must be an object."));
    };
    if object.get("jsonrpc").and_then(Value::as_str) != Some("2.0") {
        return Message::Invalid(rpc_error(&Value::Null, -32600, "jsonrpc must be \"2.0\"."));
    }
    let id = object.get("id").cloned();
    match (object.get("method").and_then(Value::as_str), id) {
        (Some(method), Some(id)) if id.is_string() || id.is_number() => Message::Request(JsonRpcRequest {
            id,
            method: method.to_string(),
            params: object.get("params").cloned().unwrap_or(Value::Null),
        }),
        (Some(_), Some(_)) => Message::Invalid(rpc_error(&Value::Null, -32600, "id must be a string or a number.")),
        (Some(_), None) => Message::Accepted,
        (None, Some(_)) if object.contains_key("result") || object.contains_key("error") => Message::Accepted,
        _ => Message::Invalid(rpc_error(&Value::Null, -32600, "Not a JSON-RPC request.")),
    }
}

/// The version to answer `initialize` with: the client's, if supported, otherwise the newest.
pub fn negotiate_version(requested: Option<&str>) -> &'static str {
    requested.and_then(|r| PROTOCOL_VERSIONS.iter().copied().find(|v| *v == r)).unwrap_or(PROTOCOL_VERSIONS[0])
}

/// The `MCP-Protocol-Version` header: absent (taken as 2025-03-26) or a supported version.
pub fn header_version_ok(header: Option<&str>) -> bool {
    header.is_none_or(|h| PROTOCOL_VERSIONS.contains(&h.trim()))
}

/// Answers `initialize`, `ping` and `tools/list` minimally, and one `key_check` tool that runs the
/// per-request member-key check. Replaced by the core's dispatcher when it joins.
pub struct StubHandler;

impl McpHandler for StubHandler {
    async fn handle<B: HostedBackend>(&self, backend: &B, request: &JsonRpcRequest) -> McpOutcome {
        let id = &request.id;
        let result = match request.method.as_str() {
            "initialize" => json!({
                "protocolVersion": negotiate_version(request.params.get("protocolVersion").and_then(Value::as_str)),
                "capabilities": { "tools": { "listChanged": false } },
                "serverInfo": { "name": "guesty", "version": env!("CARGO_PKG_VERSION") },
                "instructions": "Guesty tools for your team's account. If a call says the sign-in ended, reconnect this server to sign in again.",
            }),
            "ping" => json!({}),
            "tools/list" => json!({ "tools": [{
                "name": "key_check",
                "description": "Checks that this sign-in's team access key still works. (Placeholder until the Guesty tools are joined.)",
                "inputSchema": { "type": "object", "properties": {}, "additionalProperties": false },
            }] }),
            "tools/call" => {
                if request.params.get("name").and_then(Value::as_str) != Some("key_check") {
                    return McpOutcome::Response(rpc_error(id, -32602, "Unknown tool."));
                }
                let grant = backend.grant();
                match backend.guesty_token(TokenType::OpenApi).await {
                    Err(BackendError::Revoked) => return McpOutcome::Unauthorized,
                    Ok(_) => json!({
                        "content": [{ "type": "text", "text": "This sign-in's team access key works." }],
                        "structuredContent": { "ok": true, "read_only": grant.read_only, "role": grant.role.as_str(), "team": grant.team_name },
                    }),
                    Err(error) => json!({
                        "content": [{ "type": "text", "text": backend_error_text(&error) }],
                        "isError": true,
                    }),
                }
            }
            _ => return McpOutcome::Response(rpc_error(id, -32601, "Method not found.")),
        };
        McpOutcome::Response(rpc_result(id, result))
    }
}

/// Plain text for a backend failure, safe to show the agent.
pub fn backend_error_text(error: &BackendError) -> String {
    match error {
        BackendError::Revoked => "This sign-in ended. Reconnect the server to sign in again.".into(),
        BackendError::Service { message, .. } => message.clone(),
        BackendError::Transport(TransportError::DeadlineExceeded | TransportError::Timeout) => {
            "The team token service didn't answer in time. Try again.".into()
        }
        BackendError::Transport(_) => "The team token service couldn't be reached. Try again.".into(),
        BackendError::NotAllowed => "That team endpoint isn't available.".into(),
    }
}
