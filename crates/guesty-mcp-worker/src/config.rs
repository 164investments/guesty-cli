//! The Worker's public address and the URLs and metadata documents derived from it.

use guesty_core::token_service::{HOSTED_TOKEN_SERVICE_URL, service_url};
use serde_json::{Value, json};

use crate::mcp::CALL_BUDGET_MS;

#[derive(Clone, Debug)]
pub struct Config {
    /// The Worker's origin, such as `https://guesty-mcp.staykit.ai`, without a trailing slash. It is
    /// also the authorization server's issuer identifier.
    pub public_url: String,
    /// Origins whose `/join/<code>` links are invites for the token service this Worker is bound to.
    pub token_service_origins: Vec<String>,
    /// The token service's public URL: the first of `token_service_origins` (the binding's own
    /// host is a placeholder). Invite links the service returns must point here.
    pub token_service_url: String,
    /// Each tool call's time (S8): 50 s, or less when `CALL_BUDGET_MS` lowers it (tests).
    pub call_budget_ms: i64,
    /// A lower cap on each Guesty request's timeout, from `GUESTY_TIMEOUT_MS` (tests). Unset in
    /// production, where a request has its own 60 s or what's left of the call.
    pub guesty_timeout_ms: Option<u64>,
    /// Tests only (`REPORT_WASM_MEMORY=1`): `/mcp` answers carry the wasm memory size, which only
    /// grows, so tests can check a call's peak stays well under the Worker's 128 MB.
    pub report_wasm_memory: bool,
}

impl Config {
    /// `public_url` must be an https origin, or http on a loopback host for local development.
    pub fn new(public_url: &str, token_service_origins: &str) -> Option<Config> {
        let parsed = url::Url::parse(public_url.trim()).ok()?;
        let loopback = matches!(parsed.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
        if !(parsed.scheme() == "https" || (parsed.scheme() == "http" && loopback))
            || parsed.path() != "/"
            || parsed.query().is_some()
            || parsed.fragment().is_some()
            || !parsed.username().is_empty()
        {
            return None;
        }
        let origins: Vec<String> = token_service_origins
            .split(',')
            .map(|o| o.trim().trim_end_matches('/').to_string())
            .filter(|o| !o.is_empty())
            .collect();
        let token_service_url = match origins.first() {
            Some(first) => service_url(first).ok()?,
            None => HOSTED_TOKEN_SERVICE_URL.to_string(),
        };
        Some(Config {
            public_url: parsed.origin().ascii_serialization(),
            token_service_origins: origins,
            token_service_url,
            call_budget_ms: CALL_BUDGET_MS,
            guesty_timeout_ms: None,
            report_wasm_memory: false,
        })
    }

    /// Lowers the call budget and the Guesty timeout for tests. Values that aren't positive
    /// integers, or that would raise a limit, are ignored.
    pub fn with_test_limits(mut self, call_budget_ms: Option<&str>, guesty_timeout_ms: Option<&str>) -> Config {
        let lower = |value: Option<&str>, max: u64| {
            value.and_then(|v| v.trim().parse::<u64>().ok()).filter(|v| (1..=max).contains(v))
        };
        if let Some(budget) = lower(call_budget_ms, CALL_BUDGET_MS as u64) {
            self.call_budget_ms = budget as i64;
        }
        self.guesty_timeout_ms = lower(guesty_timeout_ms, guesty_core::request::REQUEST_TIMEOUT_MS);
        self
    }

    /// What each tool call may use.
    pub fn hosted_settings(&self) -> crate::hosted::HostedSettings {
        let mut settings = crate::hosted::HostedSettings::new(self.token_service_url.clone());
        settings.limits.call_deadline_ms = Some(self.call_budget_ms as u64);
        settings.guesty_timeout_ms = self.guesty_timeout_ms;
        settings
    }

    pub fn issuer(&self) -> &str {
        &self.public_url
    }

    /// The protected resource: the MCP endpoint's canonical URI (RFC 8707).
    pub fn resource(&self) -> String {
        format!("{}/mcp", self.public_url)
    }

    pub fn resource_metadata_url(&self) -> String {
        format!("{}/.well-known/oauth-protected-resource/mcp", self.public_url)
    }

    /// RFC 9728.
    pub fn protected_resource_metadata(&self) -> Value {
        json!({
            "resource": self.resource(),
            "authorization_servers": [self.issuer()],
            "bearer_methods_supported": ["header"],
            "resource_name": "Guesty",
            "resource_documentation": format!("{}/", self.public_url),
        })
    }

    /// RFC 8414.
    pub fn authorization_server_metadata(&self) -> Value {
        let base = &self.public_url;
        json!({
            "issuer": self.issuer(),
            "authorization_endpoint": format!("{base}/authorize"),
            "token_endpoint": format!("{base}/token"),
            "registration_endpoint": format!("{base}/register"),
            "revocation_endpoint": format!("{base}/revoke"),
            "response_types_supported": ["code"],
            "response_modes_supported": ["query"],
            "grant_types_supported": ["authorization_code", "refresh_token"],
            "token_endpoint_auth_methods_supported": ["none"],
            "revocation_endpoint_auth_methods_supported": ["none"],
            "code_challenge_methods_supported": ["S256"],
            "authorization_response_iss_parameter_supported": true,
            "client_id_metadata_document_supported": true,
            "service_documentation": format!("{base}/"),
        })
    }
}
