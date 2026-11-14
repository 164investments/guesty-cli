//! Cached Guesty tokens. Authentication is read-only: the CLI never requests
//! an OAuth token and never writes a cache. It reads a token from, in order,
//! this process's memory, `~/.guesty-cli/token.json` (Open API only, typed
//! tokens only), and then either the team token service or the
//! server-managed `guesty_tokens` table. A missing, expired, rejected or
//! malformed token fails with guidance and no token output.

use std::collections::{HashMap, HashSet};
use std::sync::Mutex;

use crate::env;
use crate::error::{CliError, Result};
use crate::hooks;
use crate::http;
use crate::json::{self, Json, json};
use crate::token_service::{self, CallError, TOKEN_SERVICE_KEY_ENV, TOKEN_SERVICE_URL_ENV};

const EXPIRY_BUFFER_MS: f64 = 5.0 * 60.0 * 1000.0;
const CACHE_TIMEOUT_MS: u64 = 10_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum TokenType {
    OpenApi,
    Beapi,
}

impl TokenType {
    pub fn as_str(self) -> &'static str {
        match self {
            TokenType::OpenApi => "openapi",
            TokenType::Beapi => "beapi",
        }
    }
}

#[derive(Clone, Debug)]
pub struct CachedToken {
    pub token_type: TokenType,
    pub access_token: String,
    pub expires_at: f64,
}

impl CachedToken {
    /// `{ access_token, expires_at, token_type }`, the order the Node CLI built it in.
    pub fn to_json(&self) -> Json {
        json!({
            "access_token": self.access_token,
            "expires_at": json::number(self.expires_at),
            "token_type": self.token_type.as_str(),
        })
    }
}

struct State {
    cached: HashMap<TokenType, CachedToken>,
    rejected: HashSet<String>,
}

static STATE: Mutex<Option<State>> = Mutex::new(None);

fn with_state<T>(f: impl FnOnce(&mut State) -> T) -> T {
    let mut guard = STATE.lock().unwrap_or_else(|e| e.into_inner());
    let state = guard.get_or_insert_with(|| State { cached: HashMap::new(), rejected: HashSet::new() });
    f(state)
}

fn is_rejected(token: &str) -> bool {
    with_state(|s| s.rejected.contains(token))
}

/// A token value that is usable for `token_type`: right type, a nonempty
/// string with no whitespace, not rejected, a finite expiry more than five
/// minutes away.
fn usable(value: &Json, token_type: TokenType) -> Option<CachedToken> {
    let object = value.as_object()?;
    if object.get("token_type")?.as_str()? != token_type.as_str() {
        return None;
    }
    let access = object.get("access_token")?.as_str()?;
    // JavaScript's /\s/ also matches these.
    if access.is_empty() || access.chars().any(|c| c.is_whitespace() || c == '\u{feff}') || is_rejected(access) {
        return None;
    }
    let expires = object.get("expires_at")?;
    let expires_at = expires.as_f64().filter(|_| expires.is_number())?;
    if !expires_at.is_finite() || expires_at <= hooks::now_ms() + EXPIRY_BUFFER_MS {
        return None;
    }
    Some(CachedToken { token_type, access_token: access.to_string(), expires_at })
}

fn set(name: &str) -> bool {
    std::env::var(name).is_ok_and(|v| !v.is_empty())
}

/// Either token-service variable selects the token service, so a partial
/// setup fails instead of silently reading an unrelated SUPABASE_URL project.
fn uses_token_service() -> bool {
    set(TOKEN_SERVICE_URL_ENV) || set(TOKEN_SERVICE_KEY_ENV)
}

/// With no token source at all, this is most likely a new install, so point to setup.
fn uses_shared_cache() -> bool {
    set("SUPABASE_URL") || set("SUPABASE_SERVICE_ROLE_KEY")
}

pub fn cache_guidance(token_type: TokenType) -> String {
    if uses_token_service() {
        return format!(
            "Check {TOKEN_SERVICE_URL_ENV} and {TOKEN_SERVICE_KEY_ENV}, or run guesty setup. The token service renews \
             the team's token; an admin can run guesty team status, and guesty team refresh{} replaces a token Guesty rejected.",
            if token_type == TokenType::Beapi { " --beapi" } else { "" }
        );
    }
    if !uses_shared_cache() {
        return "Run guesty setup to create a team or join one with an invite, so this CLI uses your team's shared token. \
                guesty init lists the other options."
            .into();
    }
    format!(
        "Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and have the designated server refresh workflow restore a valid {} token in the shared cache.",
        token_type.as_str()
    )
}

fn cache_unavailable(token_type: TokenType, reason: &str) -> CliError {
    CliError::new(format!(
        "No valid cached Guesty {} token is available: {reason}.\nCLI authentication is read-only and never requests OAuth tokens. {}",
        token_type.as_str(),
        cache_guidance(token_type)
    ))
}

fn read_local_openapi_token() -> Option<CachedToken> {
    let path = env::config_dir().join("token.json");
    hooks::trace("tokenRead", json!(path.to_string_lossy()));
    let text = std::fs::read_to_string(path).ok()?;
    let data = json::parse(&text).ok()?;
    // Legacy files without token_type cannot establish the token's API scope.
    usable(data.as_object()?.get("token")?, TokenType::OpenApi)
}

fn read_shared_token(token_type: TokenType) -> Result<CachedToken> {
    let url = std::env::var("SUPABASE_URL").unwrap_or_default();
    let key = std::env::var("SUPABASE_SERVICE_ROLE_KEY").unwrap_or_default();
    if url.is_empty() || key.is_empty() {
        return Err(cache_unavailable(
            token_type,
            if uses_shared_cache() { "shared-cache configuration is incomplete" } else { "this CLI isn't connected to a team yet" },
        ));
    }
    let target = format!(
        "{}/rest/v1/guesty_tokens?select=access_token,expires_at,token_type&token_type=eq.{}&order=created_at.desc&limit=1",
        url.strip_suffix('/').unwrap_or(&url),
        token_type.as_str()
    );
    let failed = || cache_unavailable(token_type, "the shared-cache request could not complete");
    // fetch() rejects a relative or malformed URL before sending anything.
    if url::Url::parse(&target).is_err() {
        return Err(failed());
    }
    let response = http::send(http::Request {
        method: "GET",
        url: &target,
        headers: vec![
            ("apikey".into(), key.clone()),
            ("Authorization".into(), format!("Bearer {key}")),
            ("Accept".into(), "application/json".into()),
        ],
        body: None,
        timeout_ms: CACHE_TIMEOUT_MS,
    })
    .map_err(|_| failed())?;
    // redirect: "error"
    if (300..400).contains(&response.status) && response.header("location").is_some() {
        return Err(failed());
    }
    if !response.ok() {
        return Err(cache_unavailable(token_type, &format!("the shared cache returned HTTP {}", response.status)));
    }
    let rows = response
        .text()
        .ok()
        .and_then(|t| json::parse(&t).ok())
        .ok_or_else(|| cache_unavailable(token_type, "the shared cache returned invalid JSON"))?;
    let first = rows.as_array().and_then(|r| r.first()).cloned().unwrap_or(Json::Null);
    usable(&first, token_type).ok_or_else(|| {
        cache_unavailable(token_type, "the cached row is missing, expired, rejected, or has invalid token metadata")
    })
}

/// The team token service (server/) requests tokens; the CLI only reads them.
fn read_service_token(token_type: TokenType) -> Result<CachedToken> {
    let url = std::env::var(TOKEN_SERVICE_URL_ENV).unwrap_or_default();
    let key = std::env::var(TOKEN_SERVICE_KEY_ENV).unwrap_or_default();
    if url.is_empty() || key.is_empty() {
        return Err(cache_unavailable(token_type, "token-service configuration is incomplete"));
    }
    let base = token_service::service_url(&url)
        .map_err(|e| cache_unavailable(token_type, e.message().trim_end_matches('.')))?;
    let body = json!({ "token_type": token_type.as_str() });
    let mut attempt = 1;
    let token = loop {
        match token_service::call(&base, "POST", "/v1/token", Some(&key), Some(&body), None) {
            Ok(token) => break token,
            Err(CallError::Other(e)) => return Err(e),
            Err(CallError::Service(e)) => {
                // Another member's request is renewing the token right now.
                if e.code.as_deref() == Some("refreshing") && attempt == 1 {
                    attempt += 1;
                    hooks::sleep_ms(2_000);
                    continue;
                }
                let reason = if e.status == 401 {
                    "the token service rejected the access key (HTTP 401)".to_string()
                } else if e.status == 0 {
                    "the token service request could not complete".to_string()
                } else {
                    e.message.trim_end_matches('.').to_string()
                };
                return Err(cache_unavailable(token_type, &reason));
            }
        }
    };
    usable(&token, token_type)
        .ok_or_else(|| cache_unavailable(token_type, "the token service returned a missing, expired, rejected, or invalid token"))
}

/// Marks a token rejected for this process. A 401 invalidates only this
/// process's copy, never the shared or disk cache.
pub fn invalidate_token(rejected: Option<&str>) {
    with_state(|s| {
        let current = s.cached.get(&TokenType::OpenApi).map(|t| t.access_token.clone());
        let Some(rejected) = rejected.map(str::to_string).or(current.clone()) else { return };
        s.rejected.insert(rejected.clone());
        // A concurrent request may already have installed a different cached token.
        if current.as_deref() == Some(rejected.as_str()) {
            s.cached.remove(&TokenType::OpenApi);
        }
    });
}

pub fn get_cached_token(token_type: TokenType) -> Result<CachedToken> {
    let memory = with_state(|s| s.cached.get(&token_type).cloned());
    if let Some(token) = memory {
        if let Some(valid) = usable(&token.to_json(), token_type) {
            return Ok(valid);
        }
    }
    let disk = if token_type == TokenType::OpenApi { read_local_openapi_token() } else { None };
    let token = match disk {
        Some(t) => t,
        None if uses_token_service() => read_service_token(token_type)?,
        None => read_shared_token(token_type)?,
    };
    with_state(|s| s.cached.insert(token_type, token.clone()));
    Ok(token)
}

pub fn get_token() -> Result<String> {
    Ok(get_cached_token(TokenType::OpenApi)?.access_token)
}
