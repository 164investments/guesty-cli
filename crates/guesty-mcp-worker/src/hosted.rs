//! The shared core's MCP server on this Worker: [`Hosted`] implements `guesty_core::mcp::Backend`
//! over a request's [`HostedBackend`], and [`CoreHandler`] runs `guesty_core::mcp::Server` with
//! the hosted options. It is generic over the backend, so every rule here is tested natively.
//!
//! Each Guesty request runs the core's own decisions (`prepare_*`, then `Attempts` for retries,
//! 401s, redirects, error text and decoding), the same ones the CLI's client makes:
//!
//! - every attempt first gets the team's token from the token service (S2, no cache);
//! - it is sent with manual redirects, a timeout of the smaller of the request's own and what's
//!   left of the call (S8), and an 8 MB body cap (S7); a Guesty 3xx reaches the core as a
//!   response, so the core says redirects aren't followed;
//! - a 401 re-reads the token once; the same token again fails with the hosted guidance;
//! - error bodies are redacted with the tokens sent and the member key;
//! - one tool call makes at most 50 requests (S7), token lookups included.
//!
//! A revoked member key (`BackendError::Revoked`) anywhere in a call makes the whole `/mcp`
//! request answer 401 `invalid_token` ([`McpOutcome::Unauthorized`]).

use std::cell::Cell;

use guesty_core::json::{Json, Map};
use guesty_core::limits::{self, Limits};
use guesty_core::mcp::{Backend, Call, Instructions, Options, Server, failure, hosted_instructions};
use guesty_core::request::{
    Api, Attempts, BookingFetch, Fetch, Prepared, Response, Step, prepare_booking_engine, prepare_open_api,
    rejected_error_from,
};
use guesty_core::{Data, Error, Result, token_service};

use crate::mcp::{BackendError, HostedBackend, JsonRpcRequest, McpHandler, McpOutcome, TokenType, backend_error_text};
use crate::transport::{FetchLimits, OutboundRequest, TransportError};

/// The most requests (token lookups and Guesty or team-service fetches) one tool call makes (S7).
pub const MAX_SUBREQUESTS: u32 = 50;

/// What a 401 from Guesty that a fresh token didn't fix tells the agent.
pub const REJECTED_GUIDANCE: &str = "The team's shared token was rejected. A team admin can check it with `guesty team status` and renew it with `guesty team refresh`.";

pub fn too_many_requests_message() -> String {
    format!(
        "This tool call needs more than {MAX_SUBREQUESTS} requests, the most this server makes for one call. Use filters or fewer pages to narrow it; no partial result was returned."
    )
}

/// The hosted server's settings for each call.
#[derive(Clone, Debug, PartialEq)]
pub struct HostedSettings {
    /// The team token service's public, normalized URL. Invite links it returns must point here.
    pub token_service_url: String,
    pub limits: Limits,
    /// A lower cap on each Guesty request's timeout than the request's own (60 s). Unset in
    /// production; tests set it so timeouts don't take a minute.
    pub guesty_timeout_ms: Option<u64>,
}

impl HostedSettings {
    pub fn new(token_service_url: String) -> HostedSettings {
        HostedSettings { token_service_url, limits: Limits::HOSTED, guesty_timeout_ms: None }
    }
}

/// The core's I/O for one tool call, through the request's [`HostedBackend`].
pub struct Hosted<'a, B> {
    backend: &'a B,
    settings: &'a HostedSettings,
    revoked: Cell<bool>,
    requests: Cell<u32>,
}

impl<'a, B: HostedBackend> Hosted<'a, B> {
    pub fn new(backend: &'a B, settings: &'a HostedSettings) -> Hosted<'a, B> {
        Hosted { backend, settings, revoked: Cell::new(false), requests: Cell::new(0) }
    }

    /// Whether the token service said the member key is revoked during this call.
    pub fn revoked(&self) -> bool {
        self.revoked.get()
    }

    /// How many requests the call has made.
    pub fn requests(&self) -> u32 {
        self.requests.get()
    }

    /// Counts one more request, or fails once the call has made its share.
    fn count_request(&self) -> Result<()> {
        if self.requests.get() >= MAX_SUBREQUESTS {
            return Err(Error::new(too_many_requests_message()));
        }
        self.requests.set(self.requests.get() + 1);
        Ok(())
    }

    fn backend_error(&self, error: BackendError, call: &Call) -> Error {
        match error {
            BackendError::Revoked => {
                self.revoked.set(true);
                Error::new(backend_error_text(&BackendError::Revoked))
            }
            BackendError::Transport(TransportError::DeadlineExceeded) => deadline_error(call),
            other => Error::new(backend_error_text(&other)),
        }
    }

    /// Milliseconds left of the call, or None without a deadline.
    fn time_left(&self, call: &Call) -> Option<f64> {
        call.deadline_ms.map(|deadline| deadline - self.now_ms())
    }

    /// Whether the call's time, or the request's, has run out.
    fn out_of_time(&self, call: &Call) -> bool {
        self.backend.deadline().remaining_at(self.backend.now_ms()) <= 0
            || self.time_left(call).is_some_and(|left| left <= 0.0)
    }

    /// Sends a prepared Guesty request until the core's decisions say it's done.
    async fn send(&self, prepared: Prepared, call: &Call) -> Result<Data> {
        let token_type = match prepared.api {
            Api::OpenApi => TokenType::OpenApi,
            Api::BookingEngine => TokenType::BookingEngine,
        };
        let max_body_bytes = call.limits.max_response_bytes.unwrap_or(FetchLimits::GUESTY.max_body_bytes);
        let mut sent: Vec<String> = Vec::new();
        let mut rejected: Vec<String> = Vec::new();
        let mut attempts = Attempts::new(&prepared).with_limits(call.limits, call.deadline_ms);
        let now = || self.now_ms();
        while attempts.next() {
            if self.time_left(call).is_some_and(|left| left <= 0.0) {
                return Err(deadline_error(call));
            }
            self.count_request()?;
            let token = match self.backend.guesty_token(token_type).await {
                Ok(token) => token.access_token,
                Err(error) => return Err(self.backend_error(error, call)),
            };
            // A 401 re-reads the token; the same token again can't succeed.
            if rejected.contains(&token) {
                return Err(rejected_error_from(prepared.api, "this server", REJECTED_GUIDANCE));
            }
            if !sent.contains(&token) {
                sent.push(token.clone());
            }
            let mut own_timeout_ms = prepared.timeout_ms as f64;
            if let Some(cap) = self.settings.guesty_timeout_ms {
                own_timeout_ms = own_timeout_ms.min(cap as f64);
            }
            // What's left of the call: the core's deadline, and the request's own (the transport
            // stops there too; it started a moment earlier).
            let request_left = self.backend.deadline().remaining_at(self.backend.now_ms()) as f64;
            let left = self.time_left(call).map_or(request_left, |left| left.min(request_left));
            if left <= 0.0 {
                return Err(deadline_error(call));
            }
            let timeout_ms = own_timeout_ms.min(left);
            // Whether a timeout would be the deadline's rather than the request's own.
            let deadline_bound = left <= own_timeout_ms;
            self.count_request()?;
            let mut headers = prepared.headers.clone();
            headers.push(("authorization".into(), format!("Bearer {token}")));
            let request = OutboundRequest {
                method: prepared.method.clone(),
                url: prepared.url.to_string(),
                headers,
                body: prepared.body.clone(),
            };
            let limits =
                FetchLimits { timeout_ms: timeout_ms.ceil() as i64, max_body_bytes, redirect_as_response: true };
            let step = match self.backend.http(request, limits).await {
                Ok(res) => {
                    let response = Response { status: res.status, headers: res.headers, body: Ok(res.body) };
                    let mut secrets = sent.clone();
                    secrets.push(self.backend.member_key().to_string());
                    attempts.response(&response, &secrets, now)
                }
                Err(TransportError::Redirect { status }) => {
                    let response = Response { status, headers: Vec::new(), body: Ok(Vec::new()) };
                    attempts.response(&response, &[], now)
                }
                Err(TransportError::DeadlineExceeded) => return Err(deadline_error(call)),
                Err(TransportError::BodyTooLarge { limit }) => {
                    return Err(attempts
                        .too_large()
                        .unwrap_or_else(|| Error::new(limits::response_too_large_message(attempts.label(), limit))));
                }
                // A read the deadline cut off says so; a write keeps "its outcome is unknown".
                Err(TransportError::Timeout) if prepared.is_read() && deadline_bound && self.out_of_time(call) => {
                    return Err(deadline_error(call));
                }
                Err(TransportError::Timeout | TransportError::Network) => attempts.network_error(now),
            };
            match step {
                Step::Retry { wait_ms, .. } => self.backend.sleep(wait_ms.ceil() as i64).await,
                Step::Rejected { retry } => {
                    rejected.push(token);
                    if !retry {
                        return Err(rejected_error_from(prepared.api, "this server", REJECTED_GUIDANCE));
                    }
                }
                Step::Fail(error) => return Err(error),
                Step::Done(data) => return Ok(data),
            }
        }
        Err(attempts.exhausted())
    }
}

fn deadline_error(call: &Call) -> Error {
    Error::new(limits::deadline_message(call.limits.call_deadline_ms.unwrap_or(0)))
}

impl<B: HostedBackend> Backend for Hosted<'_, B> {
    async fn open_api(&self, path: &str, fetch: Fetch, call: &Call) -> Result<Data> {
        // Multipart bodies need files, which no MCP tool sends.
        let prepared = prepare_open_api(path, &fetch, || "----formdata-guesty-mcp".into())?;
        self.send(prepared, call).await
    }

    async fn booking_engine(&self, path: &str, fetch: BookingFetch, call: &Call) -> Result<Data> {
        let prepared = prepare_booking_engine(path, &fetch)?;
        self.send(prepared, call).await
    }

    fn team_service(&self) -> Result<String> {
        Ok(self.settings.token_service_url.clone())
    }

    async fn team_request(&self, method: &str, path: &str, body: Option<&Json>, call: &Call) -> Result<Json> {
        let base = &self.settings.token_service_url;
        if self.time_left(call).is_some_and(|left| left <= 0.0) {
            return Err(deadline_error(call));
        }
        self.count_request()?;
        let (status, bytes) = match self.backend.team_service(method, path, body).await {
            Ok(answer) => answer,
            Err(BackendError::Transport(TransportError::Redirect { .. } | TransportError::Network)) => {
                return Err(token_service::unreachable(base).into());
            }
            Err(BackendError::Transport(TransportError::Timeout)) => {
                return Err(Error::new(format!(
                    "The token service at {base} didn't answer in time. Try again in a minute."
                )));
            }
            Err(error) => return Err(self.backend_error(error, call)),
        };
        let response = Response { status, headers: Vec::new(), body: Ok(bytes) };
        token_service::interpret(base, &response).map_err(Error::from)
    }

    fn now_ms(&self) -> f64 {
        self.backend.now_ms() as f64
    }
}

/// Runs the core's MCP server for one request, with the grant's read-only flag.
pub struct CoreHandler {
    pub settings: HostedSettings,
}

/// The hosted `initialize` options.
pub fn options(read_only: bool, limits: Limits) -> Options {
    Options {
        read_only,
        instructions: Instructions::Custom(hosted_instructions(read_only)),
        limits,
        title: "Guesty".into(),
        version: guesty_core::VERSION.into(),
    }
}

impl McpHandler for CoreHandler {
    async fn handle<B: HostedBackend>(&self, backend: &B, request: &JsonRpcRequest) -> McpOutcome {
        let read_only = backend.grant().read_only;
        let server = Server::new(Hosted::new(backend, &self.settings), options(read_only, self.settings.limits));
        let mut message = Map::new();
        message.insert("jsonrpc".into(), Json::from("2.0"));
        message.insert("id".into(), request.id.clone());
        message.insert("method".into(), Json::from(request.method.clone()));
        if !request.params.is_null() {
            message.insert("params".into(), request.params.clone());
        }
        let reply = server.handle(&message).await;
        if server.backend.revoked() {
            return McpOutcome::Unauthorized;
        }
        McpOutcome::Response(reply.unwrap_or_else(|| failure(&request.id, -32603, "The server had no reply.")))
    }
}
