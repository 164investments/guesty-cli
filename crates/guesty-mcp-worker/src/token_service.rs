//! Reading the team token service's answers. The calls themselves go through the `TOKENS`
//! service binding (`app::tokens`); this half is pure so it is tested natively.
//!
//! Everything a service returns is validated before use: keys must look like access keys, and
//! messages are cleaned and shortened before they are shown.

use serde_json::Value;

use crate::mcp::TeamToken;
use crate::oauth::{clean_text, is_access_key};
use crate::store::Role;

/// Requests through a service binding need an absolute URL; the host is ignored.
pub const SERVICE_BASE: &str = "https://guesty-token-service";

#[derive(Debug, PartialEq)]
pub struct ServiceMessage {
    pub status: u16,
    pub code: String,
    pub message: String,
}

/// The `{ error, message }` body the token service sends with a failure.
pub fn service_message(status: u16, body: &[u8]) -> ServiceMessage {
    let parsed: Value = serde_json::from_slice(body).unwrap_or(Value::Null);
    let code =
        parsed.get("error").and_then(Value::as_str).map(|c| clean_text(c, 60)).unwrap_or_else(|| "unavailable".into());
    let message = parsed
        .get("message")
        .and_then(Value::as_str)
        .map(|m| clean_text(m, 300))
        .filter(|m| !m.is_empty())
        .unwrap_or_else(|| format!("The team token service answered HTTP {status}. Try again in a minute."));
    ServiceMessage { status, code, message }
}

#[derive(Debug, PartialEq)]
pub struct Joined {
    pub key: String,
    pub label: Option<String>,
    pub role: Role,
    pub team_name: Option<String>,
}

/// `POST /v1/join`'s answer. A 201 must carry a well-formed key and role.
pub fn parse_join(status: u16, body: &[u8]) -> Result<Joined, ServiceMessage> {
    if status != 201 {
        return Err(service_message(status, body));
    }
    let parsed: Value = serde_json::from_slice(body).unwrap_or(Value::Null);
    let key = parsed.get("key").and_then(Value::as_str).filter(|k| is_access_key(k));
    let role = parsed.get("role").and_then(Value::as_str).and_then(Role::parse);
    match (key, role) {
        (Some(key), Some(role)) => Ok(Joined {
            key: key.to_string(),
            label: parsed.get("label").and_then(Value::as_str).map(|l| clean_text(l, 100)),
            role,
            team_name: parsed.pointer("/team/name").and_then(Value::as_str).map(|n| clean_text(n, 100)),
        }),
        _ => Err(ServiceMessage {
            status: 502,
            code: "bad_answer".into(),
            message: "The team token service sent an answer this server can't use.".into(),
        }),
    }
}

/// `POST /v1/token`'s answer: `{ access_token, token_type, expires_at }`.
pub fn parse_token(body: &[u8], token_type: &str) -> Option<TeamToken> {
    let parsed: Value = serde_json::from_slice(body).ok()?;
    let access_token = parsed.get("access_token")?.as_str()?.to_string();
    if access_token.is_empty() || parsed.get("token_type")?.as_str()? != token_type {
        return None;
    }
    let expires_at = parsed.get("expires_at")?.as_f64()? as i64;
    Some(TeamToken { access_token, expires_at })
}

/// The team endpoints the tools may call: `/v1/team` and below (not `/v1/teams`).
pub fn team_path_allowed(path: &str) -> bool {
    (path == "/v1/team" || path.starts_with("/v1/team/"))
        && !path.contains("..")
        && !path.contains('?')
        && !path.contains('#')
}

/// The client network a rate limit counts: an IPv4 address, or an IPv6 /64 (one user usually
/// controls a whole /64), as the token service counts it.
pub fn client_network(ip: &str) -> String {
    let ip = ip.trim();
    if !ip.contains(':') {
        return ip.to_string();
    }
    let lower = ip.to_ascii_lowercase();
    let (head, tail) = match lower.split_once("::") {
        Some((h, t)) => (h.to_string(), Some(t.to_string())),
        None => (lower.clone(), None),
    };
    let left: Vec<&str> = if head.is_empty() { vec![] } else { head.split(':').collect() };
    let groups: Vec<String> = match &tail {
        None => left.iter().map(|g| g.to_string()).collect(),
        Some(tail) => {
            let right: Vec<&str> = if tail.is_empty() { vec![] } else { tail.split(':').collect() };
            let fill = 8usize.saturating_sub(left.len() + right.len());
            left.iter()
                .map(|g| g.to_string())
                .chain(std::iter::repeat_n("0".to_string(), fill))
                .chain(right.iter().map(|g| g.to_string()))
                .collect()
        }
    };
    let prefix: Vec<String> = groups
        .iter()
        .take(4)
        .map(|g| {
            let trimmed = g.trim_start_matches('0');
            if trimmed.is_empty() { "0".to_string() } else { trimmed.to_string() }
        })
        .collect();
    format!("{}::/64", prefix.join(":"))
}
