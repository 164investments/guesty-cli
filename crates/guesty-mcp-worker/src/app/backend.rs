//! The token service through the `TOKENS` service binding, and the [`HostedBackend`] one `/mcp`
//! request runs with. The core's `Backend` runs over it (`crate::hosted::Hosted`): Guesty
//! requests in the core's retry loop, retry waits with `worker::Delay`.

use std::time::Duration;

use serde_json::{Value, json};

use super::{App, log_error};
use crate::clock::Deadline;
use crate::mcp::{BackendError, GrantInfo, HostedBackend, TeamToken, TokenType};
use crate::store;
use crate::token_service::{SERVICE_BASE, parse_token, service_message, team_path_allowed};
use crate::transport::{FetchLimits, OutboundRequest, OutboundResponse, Target, TransportError, fetch};

/// One request to the token service. `key` is sent as the bearer; `client_ip` as
/// `CF-Connecting-IP`, so the service's per-address limits count the person, not this Worker.
pub(crate) async fn call_tokens(
    app: &App,
    method: &str,
    path: &str,
    key: Option<&str>,
    body: Option<&Value>,
    client_ip: Option<&str>,
    deadline: Deadline,
) -> Result<OutboundResponse, TransportError> {
    let fetcher = app.env.service("TOKENS").map_err(|_| {
        log_error("tokens_binding_missing");
        TransportError::Network
    })?;
    let url = format!("{SERVICE_BASE}{path}");
    let mut request = match body {
        Some(body) => OutboundRequest::json(method, url, body),
        None => OutboundRequest { method: method.into(), url, headers: Vec::new(), body: None },
    };
    if let Some(key) = key {
        request = request.header("Authorization", format!("Bearer {key}"));
    }
    if let Some(ip) = client_ip {
        request = request.header("CF-Connecting-IP", ip);
    }
    fetch(&Target::Service(&fetcher), &request, deadline, FetchLimits::TOKEN_SERVICE).await
}

pub(crate) struct WorkerBackend<'a> {
    pub app: &'a App,
    pub grant: GrantInfo,
    pub member_key: String,
    pub deadline: Deadline,
}

impl WorkerBackend<'_> {
    /// The token service said the member key is revoked: the grant goes too.
    async fn revoked(&self) -> BackendError {
        if store::revoke_grant(&self.app.db, &self.grant.grant_id, "member_key_revoked", crate::clock::now_ms())
            .await
            .is_err()
        {
            log_error("revoke_failed");
        }
        BackendError::Revoked
    }
}

impl HostedBackend for WorkerBackend<'_> {
    fn grant(&self) -> &GrantInfo {
        &self.grant
    }

    fn deadline(&self) -> Deadline {
        self.deadline
    }

    fn member_key(&self) -> &str {
        &self.member_key
    }

    async fn sleep(&self, ms: i64) {
        if ms > 0 {
            worker::Delay::from(Duration::from_millis(ms as u64)).await;
        }
    }

    async fn guesty_token(&self, token_type: TokenType) -> Result<TeamToken, BackendError> {
        let body = json!({ "token_type": token_type.as_str() });
        let response =
            call_tokens(self.app, "POST", "/v1/token", Some(&self.member_key), Some(&body), None, self.deadline)
                .await
                .map_err(BackendError::Transport)?;
        match response.status {
            200 => parse_token(&response.body, token_type.as_str()).ok_or_else(|| BackendError::Service {
                status: 502,
                code: "bad_answer".into(),
                message: "The team token service sent a token this server can't use.".into(),
            }),
            401 => Err(self.revoked().await),
            status => {
                let message = service_message(status, &response.body);
                Err(BackendError::Service { status, code: message.code, message: message.message })
            }
        }
    }

    async fn team_service(
        &self,
        method: &str,
        path: &str,
        body: Option<&Value>,
    ) -> Result<(u16, Vec<u8>), BackendError> {
        if !team_path_allowed(path) {
            return Err(BackendError::NotAllowed);
        }
        let response = call_tokens(self.app, method, path, Some(&self.member_key), body, None, self.deadline)
            .await
            .map_err(BackendError::Transport)?;
        if response.status == 401 {
            return Err(self.revoked().await);
        }
        Ok((response.status, response.body))
    }

    async fn http(&self, request: OutboundRequest, limits: FetchLimits) -> Result<OutboundResponse, TransportError> {
        fetch(&Target::Internet, &request, self.deadline, limits).await
    }
}
