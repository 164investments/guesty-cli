//! The Worker's public address and the URLs and metadata documents derived from it.

use serde_json::{Value, json};

/// Supported MCP protocol versions, newest first.
pub const PROTOCOL_VERSIONS: &[&str] = &["2025-11-25", "2025-06-18", "2025-03-26"];

#[derive(Clone, Debug)]
pub struct Config {
    /// The Worker's origin, such as `https://guesty-mcp.staykit.ai`, without a trailing slash. It is
    /// also the authorization server's issuer identifier.
    pub public_url: String,
    /// Origins whose `/join/<code>` links are invites for the token service this Worker is bound to.
    pub token_service_origins: Vec<String>,
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
        let origins = token_service_origins
            .split(',')
            .map(|o| o.trim().trim_end_matches('/').to_string())
            .filter(|o| !o.is_empty())
            .collect();
        Some(Config { public_url: parsed.origin().ascii_serialization(), token_service_origins: origins })
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
