//! Client for the team token service in `server/`. StayKit hosts one copy;
//! teams can also run their own and point the CLI at it. Addresses, invites
//! and what responses mean are the shared core's
//! (`guesty_core::token_service`); this file reads the settings and sends
//! the requests.

pub use guesty_core::token_service::{
    HOSTED_TOKEN_SERVICE_URL, Invite, ServiceSettings, TokenServiceError, invited_link, is_access_key, parse_invite,
    service_url,
};
use guesty_core::token_service::{REQUEST_TIMEOUT_MS, interpret, request_headers, unreachable};

use crate::error::{CliError, Result};
use crate::http;
use crate::json::{self, Json};

pub const TOKEN_SERVICE_URL_ENV: &str = "GUESTY_TOKEN_SERVICE_URL";
pub const TOKEN_SERVICE_KEY_ENV: &str = "GUESTY_TOKEN_SERVICE_KEY";

pub fn configured_service() -> Result<Option<ServiceSettings>> {
    let url = std::env::var(TOKEN_SERVICE_URL_ENV).unwrap_or_default();
    let key = std::env::var(TOKEN_SERVICE_KEY_ENV).unwrap_or_default();
    if url.is_empty() || key.is_empty() {
        return Ok(None);
    }
    Ok(Some(ServiceSettings { url: service_url(&url)?, key }))
}

/// Calls the token service. Every failure is a `TokenServiceError`.
pub fn call(
    url: &str,
    method: &str,
    path: &str,
    key: Option<&str>,
    body: Option<&Json>,
    timeout_ms: Option<u64>,
) -> std::result::Result<Json, CallError> {
    let base = service_url(url).map_err(|e| CallError::Other(e.into()))?;
    let target = format!("{base}{path}");
    let response = http::send(http::Request {
        method,
        url: &target,
        headers: request_headers(key, body.is_some()),
        body: body.map(|b| json::compact(b).into_bytes()),
        timeout_ms: timeout_ms.unwrap_or(REQUEST_TIMEOUT_MS),
    })
    .map_err(|_| CallError::Service(unreachable(&base)))?;
    interpret(&base, &response).map_err(CallError::Service)
}

/// A token-service call that failed: from the service, or before it (a bad URL).
#[derive(Debug)]
pub enum CallError {
    Service(TokenServiceError),
    Other(CliError),
}

impl From<TokenServiceError> for CliError {
    fn from(e: TokenServiceError) -> Self {
        CliError::Message(e.message)
    }
}

impl From<CallError> for CliError {
    fn from(e: CallError) -> Self {
        match e {
            CallError::Service(s) => s.into(),
            CallError::Other(c) => c,
        }
    }
}
