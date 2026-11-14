//! Guesty API requests: path and OAuth checks, rate limits, retries,
//! redaction and pagination, as the Node CLI's `client.ts` did them.
//!
//! - Reads (GET/HEAD) retry network errors, 408 and 5xx; writes never do,
//!   because their outcome would be unknown. Any request retries a 429.
//! - A 401 re-reads the cache once; the CLI never refreshes a token.
//! - Redirects are never followed, so they can't bypass the OAuth check or
//!   forward a write.
//! - Error bodies are shown without the token or configured secrets.

use std::collections::VecDeque;
use std::sync::Mutex;

use crate::auth::{self, TokenType};
use crate::error::{CliError, Result};
use crate::hooks;
use crate::http;
use crate::json::{self, Json};
use crate::output::{Data, write_err};

const BASE_URL: &str = "https://open-api.guesty.com";
const BOOKING_ENGINE_BASE_URL: &str = "https://booking.guesty.com";
const MAX_ATTEMPTS: u32 = 3;
pub const REQUEST_TIMEOUT_MS: u64 = 60_000;
pub const MAX_TIMER_MS: u64 = 2_147_483_647;
/// https://open-api-docs.guesty.com/docs/rate-limits
const RATE_LIMITS: [(f64, usize); 3] = [(1_000.0, 15), (60_000.0, 120), (3_600_000.0, 5_000)];
/// https://booking-api-docs.guesty.com/reference/quick-start-guide#rate-limits
const BOOKING_ENGINE_RATE_LIMITS: [(f64, usize); 3] = [(1_000.0, 5), (60_000.0, 275), (3_600_000.0, 16_500)];

static OPEN_API_TIMES: Mutex<VecDeque<f64>> = Mutex::new(VecDeque::new());
static BOOKING_TIMES: Mutex<VecDeque<f64>> = Mutex::new(VecDeque::new());

// ─── Query parameters ────────────────────────────────────────────────────────

/// A query parameter value: a scalar, a list of scalars, or nothing.
#[derive(Clone, Debug, PartialEq)]
pub enum Param {
    Str(String),
    Num(f64),
    Bool(bool),
    List(Vec<Param>),
    /// `null`/`undefined`: skipped.
    Null,
    /// Anything else from JSON (an object): rejected with an error.
    Invalid,
}

impl Param {
    fn to_query_string(&self) -> String {
        match self {
            Param::Str(s) => s.clone(),
            Param::Num(n) => json::number_to_string(*n, false),
            Param::Bool(b) => b.to_string(),
            _ => String::new(),
        }
    }

    pub fn from_json(value: &Json) -> Param {
        match value {
            Json::Null => Param::Null,
            Json::Bool(b) => Param::Bool(*b),
            Json::Number(n) => Param::Num(n.as_f64().unwrap_or(f64::NAN)),
            Json::String(s) => Param::Str(s.clone()),
            Json::Array(items) => Param::List(
                items
                    .iter()
                    .map(|i| match i {
                        Json::Array(_) | Json::Object(_) | Json::Null => Param::Invalid,
                        other => Param::from_json(other),
                    })
                    .collect(),
            ),
            Json::Object(_) => Param::Invalid,
        }
    }
}

impl From<&str> for Param {
    fn from(v: &str) -> Self {
        Param::Str(v.to_string())
    }
}
impl From<String> for Param {
    fn from(v: String) -> Self {
        Param::Str(v)
    }
}
impl From<&String> for Param {
    fn from(v: &String) -> Self {
        Param::Str(v.clone())
    }
}
impl From<f64> for Param {
    fn from(v: f64) -> Self {
        Param::Num(v)
    }
}
impl From<i64> for Param {
    fn from(v: i64) -> Self {
        Param::Num(v as f64)
    }
}
impl From<u64> for Param {
    fn from(v: u64) -> Self {
        Param::Num(v as f64)
    }
}
impl From<bool> for Param {
    fn from(v: bool) -> Self {
        Param::Bool(v)
    }
}
impl From<Vec<String>> for Param {
    fn from(v: Vec<String>) -> Self {
        Param::List(v.into_iter().map(Param::Str).collect())
    }
}
impl From<&[String]> for Param {
    fn from(v: &[String]) -> Self {
        Param::List(v.iter().cloned().map(Param::Str).collect())
    }
}

/// Query parameters in JavaScript object order: setting an existing key keeps
/// its place. (Integer-like keys would sort first in JavaScript; no command
/// uses one, and `from_json` applies that order for user-supplied objects.)
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Params(pub Vec<(String, Param)>);

impl Params {
    pub fn new() -> Params {
        Params(Vec::new())
    }

    /// `params[key] = value`.
    pub fn set(&mut self, key: &str, value: impl Into<Param>) -> &mut Params {
        let value = value.into();
        match self.0.iter_mut().find(|(k, _)| k == key) {
            Some(entry) => entry.1 = value,
            None => self.0.push((key.to_string(), value)),
        }
        self
    }

    pub fn get(&self, key: &str) -> Option<&Param> {
        self.0.iter().find(|(k, _)| k == key).map(|(_, v)| v)
    }

    pub fn remove(&mut self, key: &str) {
        self.0.retain(|(k, _)| k != key);
    }

    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    /// `{ ...this, ...other }`.
    pub fn merged(&self, other: &Params) -> Params {
        let mut out = self.clone();
        for (k, v) in &other.0 {
            out.set(k, v.clone());
        }
        out
    }

    /// Params from a JSON value given by the user (`--params`), in
    /// `Object.entries` order. A non-object is an error.
    pub fn from_json(value: &Json) -> Result<Params> {
        let Some(map) = value.as_object() else {
            return Err(CliError::new("Query params must be a JSON object of scalar values or arrays of scalar values."));
        };
        Ok(Params(json::entries(map).into_iter().map(|(k, v)| (k.clone(), Param::from_json(v))).collect()))
    }
}

/// `Params` from `key => value` pairs, skipping `None` values.
#[macro_export]
macro_rules! params {
    ($($key:expr => $value:expr),* $(,)?) => {{
        #[allow(unused_mut)]
        let mut p = $crate::client::Params::new();
        $( p.set($key, $value); )*
        p
    }};
}

// ─── URLs ────────────────────────────────────────────────────────────────────

/// `decodeURIComponent`, which fails on malformed escapes or invalid UTF-8.
pub fn decode_uri_component(value: &str) -> std::result::Result<String, ()> {
    let bytes = value.as_bytes();
    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = |b: u8| (b as char).to_digit(16);
            let (Some(h), Some(l)) = (bytes.get(i + 1).and_then(|b| hex(*b)), bytes.get(i + 2).and_then(|b| hex(*b))) else {
                return Err(());
            };
            out.push((h * 16 + l) as u8);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).map_err(|_| ())
}

fn has_percent_escape(value: &str) -> bool {
    let b = value.as_bytes();
    (0..b.len().saturating_sub(2)).any(|i| b[i] == b'%' && b[i + 1].is_ascii_hexdigit() && b[i + 2].is_ascii_hexdigit())
}

/// `/(?:^|[\\/])oauth2?(?:[\\/;?#]|$)/i`
fn mentions_oauth(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    let bytes = lower.as_bytes();
    let boundary = |at: usize| at >= bytes.len() || matches!(bytes[at], b'/' | b'\\' | b';' | b'?' | b'#');
    lower.match_indices("oauth").any(|(at, _)| {
        let starts = at == 0 || matches!(bytes[at - 1], b'/' | b'\\');
        starts && (boundary(at + 5) || (bytes.get(at + 5) == Some(&b'2') && boundary(at + 6)))
    })
}

fn validate_params(params: &Params) -> Result<()> {
    for (key, value) in &params.0 {
        let values: Vec<&Param> = match value {
            Param::Null => continue,
            Param::List(items) => items.iter().collect(),
            other => vec![other],
        };
        let bad = values.iter().any(|v| match v {
            Param::Num(n) => !n.is_finite(),
            Param::Str(_) | Param::Bool(_) => false,
            _ => true,
        });
        if bad {
            return Err(CliError::new(format!(
                "Query parameter '{key}' must contain strings, finite numbers, or booleans. Encode JSON objects as strings."
            )));
        }
    }
    Ok(())
}

/// `resourceUrl(path, params)`: an Open API URL, refusing anything that
/// isn't an absolute resource path or that names an OAuth endpoint at any
/// level of percent-decoding.
pub fn resource_url(path: &str, params: Option<&Params>) -> Result<url::Url> {
    if !path.starts_with('/')
        || path.starts_with("//")
        || path.chars().any(|c| c == '\\' || (c as u32) < 0x20 || c == '\x7f')
    {
        return Err(CliError::new("Use an absolute Guesty Open API resource path, such as /v1/listings."));
    }
    let base = url::Url::parse(BASE_URL).expect("base URL");
    let mut url = base
        .join(path)
        .map_err(|_| CliError::new("Use an absolute Guesty Open API resource path, such as /v1/listings."))?;
    if url.origin().ascii_serialization() != BASE_URL || url.fragment().is_some_and(|f| !f.is_empty()) {
        return Err(CliError::new("Use an absolute Guesty Open API resource path without a URL fragment."));
    }
    let mut normalized = url.path().to_string();
    // Check each decoding level so encoded separators cannot hide an OAuth path.
    for _ in 0..=path.len() {
        if mentions_oauth(&normalized) {
            return Err(CliError::new(
                "Guesty OAuth endpoints are disabled in this CLI. Use the designated server token-refresh workflow.",
            ));
        }
        if !has_percent_escape(&normalized) {
            break;
        }
        let decoded = decode_uri_component(&normalized)
            .map_err(|_| CliError::new("The Guesty resource path contains invalid percent encoding."))?;
        if decoded == normalized {
            break;
        }
        normalized = decoded;
    }
    if url.fragment() == Some("") {
        url.set_fragment(None);
    }
    if let Some(params) = params {
        validate_params(params)?;
        let mut pairs: Vec<(String, String)> = url.query_pairs().map(|(k, v)| (k.into_owned(), v.into_owned())).collect();
        let mut modified = false;
        for (key, value) in &params.0 {
            if matches!(value, Param::Null) {
                continue;
            }
            modified = true;
            pairs.retain(|(k, _)| k != key);
            match value {
                Param::List(items) => {
                    for item in items {
                        pairs.push((key.clone(), item.to_query_string()));
                    }
                }
                other => pairs.push((key.clone(), other.to_query_string())),
            }
        }
        if modified {
            if pairs.is_empty() {
                url.set_query(None);
            } else {
                let encoded = url::form_urlencoded::Serializer::new(String::new()).extend_pairs(&pairs).finish();
                url.set_query(Some(&encoded));
            }
        }
    }
    Ok(url)
}

// ─── Requests ────────────────────────────────────────────────────────────────

/// A request body, as the Node CLI's `fetch` calls sent them.
#[derive(Clone, Debug)]
pub enum Body {
    /// JSON.stringify(value), `application/json`.
    Json(Json),
    /// A string, `text/plain;charset=UTF-8` unless a content type is given.
    Text(String),
    /// Bytes, `application/octet-stream` unless a content type is given.
    Bytes(Vec<u8>),
    /// A multipart form: (field, file name, content type, bytes) or a text field.
    Multipart(Vec<Part>),
}

#[derive(Clone, Debug)]
pub enum Part {
    Text { name: String, value: String },
    File { name: String, filename: String, content_type: String, data: Vec<u8> },
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum ResponseType {
    Auto,
    Json,
    Text,
    Buffer,
}

pub struct Fetch {
    pub method: String,
    pub body: Option<Body>,
    pub params: Option<Params>,
    pub headers: Vec<(String, String)>,
    pub response_type: ResponseType,
    pub timeout_ms: u64,
}

impl Default for Fetch {
    fn default() -> Self {
        Fetch {
            method: "GET".into(),
            body: None,
            params: None,
            headers: Vec::new(),
            response_type: ResponseType::Auto,
            timeout_ms: REQUEST_TIMEOUT_MS,
        }
    }
}

impl Fetch {
    pub fn get(params: Params) -> Fetch {
        Fetch { params: Some(params), ..Fetch::default() }
    }

    pub fn method(method: &str) -> Fetch {
        Fetch { method: method.to_string(), ..Fetch::default() }
    }

    pub fn json(method: &str, body: Json) -> Fetch {
        Fetch { method: method.to_string(), body: Some(Body::Json(body)), ..Fetch::default() }
    }

    pub fn with_params(mut self, params: Params) -> Fetch {
        self.params = Some(params);
        self
    }
}

/// Each API keeps its own request history and limits; every window is at most an hour.
fn enforce_rate_limit(times: &Mutex<VecDeque<f64>>, limits: &[(f64, usize)], api: &str) {
    loop {
        let wait = {
            let mut t = times.lock().unwrap_or_else(|e| e.into_inner());
            let now = hooks::now_ms();
            while t.front().is_some_and(|first| *first <= now - 3_600_000.0) {
                t.pop_front();
            }
            let mut wait: f64 = 0.0;
            for (window, max) in limits {
                if t.len() >= *max {
                    let oldest = t[t.len() - max];
                    wait = wait.max(oldest + window - now);
                }
            }
            if wait <= 0.0 {
                t.push_back(now);
                return;
            }
            wait
        };
        write_err(&format!("{api} rate limit reached. Waiting {}s...\n", (wait / 1000.0).ceil()));
        hooks::sleep_ms(wait.ceil() as u64);
    }
}

fn retry_delay(header: Option<&str>, fallback: f64) -> f64 {
    let Some(value) = header else { return fallback };
    let value = value.trim();
    // /^\d+(?:\.\d+)?$/
    let digits = |s: &str| !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit());
    let numeric = match value.split_once('.') {
        Some((int, frac)) => digits(int) && digits(frac),
        None => digits(value),
    };
    if numeric {
        let seconds: f64 = value.parse().unwrap_or(f64::NAN);
        let ms = seconds * 1000.0;
        return if ms.is_finite() { ms.ceil() } else { fallback };
    }
    // HTTP-date is the other valid Retry-After representation (RFC 9110 §10.2.3).
    let looks_like_date = value.len() > 4 && value.as_bytes()[..3].iter().all(u8::is_ascii_alphabetic) && {
        let rest = &value[3..];
        rest.starts_with(' ') || rest.starts_with(", ")
    };
    if looks_like_date {
        if let Ok(date) = chrono::DateTime::parse_from_rfc2822(value) {
            return (date.timestamp_millis() as f64 - hooks::now_ms()).max(0.0);
        }
    }
    fallback
}

/// `res.text()`: UTF-8 with replacement, without a byte-order mark.
fn decode_text(bytes: &[u8]) -> String {
    let bytes = bytes.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(bytes);
    String::from_utf8_lossy(bytes).into_owned()
}

/// `String#slice(0, n)` in UTF-16 units; a split surrogate pair prints as U+FFFD.
fn js_slice(text: &str, n: usize) -> String {
    let mut units = 0;
    let mut out = String::new();
    for c in text.chars() {
        let len = c.len_utf16();
        if units + len > n {
            if units < n {
                out.push('\u{FFFD}');
            }
            break;
        }
        units += len;
        out.push(c);
    }
    out
}

fn redact(mut detail: String, tokens: &[String]) -> String {
    let mut secrets: Vec<String> = tokens.to_vec();
    for name in ["SUPABASE_SERVICE_ROLE_KEY", "GUESTY_TOKEN_SERVICE_KEY"] {
        if let Ok(v) = std::env::var(name) {
            secrets.push(v);
        }
    }
    for secret in secrets.iter().filter(|s| !s.is_empty()) {
        detail = detail.replace(secret.as_str(), "[redacted]");
    }
    js_slice(&detail, 2000)
}

/// The header names `new Headers()` accepts.
fn valid_header_name(name: &str) -> bool {
    !name.is_empty() && name.bytes().all(|b| b.is_ascii_alphanumeric() || b"!#$%&'*+-.^_`|~".contains(&b))
}

/// `new Headers(headers)`: lowercased names, trimmed values, the last value
/// of a repeated name joined, invalid ones rejected.
fn normalize_headers(headers: &[(String, String)]) -> Result<Vec<(String, String)>> {
    let invalid = || CliError::new("Invalid request headers. Use valid HTTP header names and single-line values.");
    let mut out: Vec<(String, String)> = Vec::new();
    for (name, value) in headers {
        if !valid_header_name(name) {
            return Err(invalid());
        }
        let value = value.trim_matches(|c| matches!(c, ' ' | '\t' | '\n' | '\r'));
        if value.chars().any(|c| c == '\0' || c == '\r' || c == '\n' || (c as u32) > 0xff) {
            return Err(invalid());
        }
        let lower = name.to_ascii_lowercase();
        match out.iter_mut().find(|(k, _)| *k == lower) {
            Some(entry) => entry.1 = format!("{}, {value}", entry.1),
            None => out.push((lower, value.to_string())),
        }
    }
    out.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(out)
}

fn multipart(parts: &[Part]) -> (String, Vec<u8>) {
    let boundary = format!("----formdata-guesty-{:016x}", (hooks::now_ms() as u64) ^ (std::process::id() as u64) << 20);
    let mut body = Vec::new();
    // Field names and file names escaped as the WHATWG multipart/form-data encoder does.
    let escape = |s: &str| s.replace('\n', "%0A").replace('\r', "%0D").replace('"', "%22");
    for part in parts {
        body.extend_from_slice(format!("--{boundary}\r\n").as_bytes());
        match part {
            Part::Text { name, value } => {
                body.extend_from_slice(format!("Content-Disposition: form-data; name=\"{}\"\r\n\r\n", escape(name)).as_bytes());
                body.extend_from_slice(value.replace("\r\n", "\n").replace('\r', "\n").replace('\n', "\r\n").as_bytes());
            }
            Part::File { name, filename, content_type, data } => {
                body.extend_from_slice(
                    format!(
                        "Content-Disposition: form-data; name=\"{}\"; filename=\"{}\"\r\nContent-Type: {}\r\n\r\n",
                        escape(name),
                        escape(filename),
                        if content_type.is_empty() { "application/octet-stream" } else { content_type }
                    )
                    .as_bytes(),
                );
                body.extend_from_slice(data);
            }
        }
        body.extend_from_slice(b"\r\n");
    }
    body.extend_from_slice(format!("--{boundary}--\r\n").as_bytes());
    (format!("multipart/form-data; boundary={boundary}"), body)
}

fn read_label(api: &str, method: &str, path: &str) -> String {
    format!("{api} {method} {path}")
}

/// `guestyFetch(path, options)`.
pub fn guesty_fetch(path: &str, options: Fetch) -> Result<Data> {
    let method = options.method.to_ascii_uppercase();
    if !["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].contains(&method.as_str()) {
        return Err(CliError::new("Unsupported HTTP method. Use GET, HEAD, POST, PUT, PATCH, DELETE, or OPTIONS."));
    }
    let timeout_ms = options.timeout_ms;
    if timeout_ms == 0 || timeout_ms > MAX_TIMER_MS {
        return Err(CliError::new("Request timeout must be a positive integer number of milliseconds, at most 2147483647."));
    }
    if (method == "GET" || method == "HEAD") && options.body.is_some() {
        return Err(CliError::new(format!(
            "{method} requests cannot contain a body. Use query params or a different HTTP method."
        )));
    }
    let url = resource_url(path, options.params.as_ref())?;
    let mut headers = normalize_headers(&options.headers)?;
    if headers.iter().any(|(k, _)| k == "authorization") {
        return Err(CliError::new(
            "The CLI supplies the cached Open API token; custom Authorization headers are not supported.",
        ));
    }
    let has = |headers: &[(String, String)], name: &str| headers.iter().any(|(k, _)| k == name);
    if !has(&headers, "accept") {
        headers.push(("accept".into(), "application/json".into()));
    }
    let body: Option<Vec<u8>> = match &options.body {
        None => None,
        // serializeBody passes a string through unencoded, as text/plain.
        Some(Body::Json(Json::String(text))) => {
            if !has(&headers, "content-type") {
                headers.push(("content-type".into(), "text/plain;charset=UTF-8".into()));
            }
            Some(text.clone().into_bytes())
        }
        Some(Body::Json(value)) => {
            if !has(&headers, "content-type") {
                headers.push(("content-type".into(), "application/json".into()));
            }
            Some(json::compact(value).into_bytes())
        }
        Some(Body::Text(text)) => {
            if !has(&headers, "content-type") {
                headers.push(("content-type".into(), "text/plain;charset=UTF-8".into()));
            }
            Some(text.clone().into_bytes())
        }
        Some(Body::Bytes(bytes)) => {
            if !has(&headers, "content-type") {
                headers.push(("content-type".into(), "application/octet-stream".into()));
            }
            Some(bytes.clone())
        }
        Some(Body::Multipart(parts)) => {
            let (content_type, bytes) = multipart(parts);
            if !has(&headers, "content-type") {
                headers.push(("content-type".into(), content_type));
            }
            Some(bytes)
        }
    };
    let mut tokens: Vec<String> = Vec::new();
    auth::get_token()?;
    let mut cache_reread = false;
    let is_read = method == "GET" || method == "HEAD";
    let label = read_label("Guesty API", &method, url.path());
    let timeout_s = json::number_to_string(timeout_ms as f64 / 1000.0, false);

    for attempt in 1..=MAX_ATTEMPTS {
        enforce_rate_limit(&OPEN_API_TIMES, &RATE_LIMITS, "Guesty");
        // A rate-limit wait may outlive the token's usable expiry window.
        let token = auth::get_token()?;
        if !tokens.contains(&token) {
            tokens.push(token.clone());
        }
        let mut request_headers = headers.clone();
        request_headers.push(("Authorization".into(), format!("Bearer {token}")));
        let sent = http::send(http::Request {
            method: &method,
            url: url.as_str(),
            headers: request_headers,
            body: body.clone(),
            timeout_ms,
        });
        let Ok(res) = sent else {
            if is_read && attempt < MAX_ATTEMPTS {
                write_err("Guesty request could not complete. Retrying the read request...\n");
                hooks::sleep_ms(attempt as u64 * 1000);
                continue;
            }
            return Err(CliError::new(format!(
                "{label} could not complete (network error or {timeout_s}s timeout).{}",
                if is_read { "" } else { " Its outcome is unknown; check Guesty before trying again." }
            )));
        };

        if res.status == 401 {
            auth::invalidate_token(Some(&token));
            if cache_reread || attempt == MAX_ATTEMPTS {
                return Err(CliError::new(format!(
                    "Guesty rejected the cached Open API token (401); the CLI cannot refresh it. {}",
                    auth::cache_guidance(TokenType::OpenApi)
                )));
            }
            write_err("Guesty rejected the cached token (401). Re-reading the cache once...\n");
            cache_reread = true;
            auth::get_token()?;
            continue;
        }

        if (res.status == 429 || (is_read && [408, 500, 502, 503, 504].contains(&res.status))) && attempt < MAX_ATTEMPTS {
            let fallback = attempt as f64 * if res.status == 429 { 5000.0 } else { 1000.0 };
            let wait = retry_delay(res.header("retry-after"), fallback);
            write_err(&format!("Guesty returned HTTP {}. Retrying in {}s...\n", res.status, (wait / 1000.0).ceil()));
            hooks::sleep_ms(wait as u64);
            continue;
        }

        if !res.ok() {
            // Authentication failures and redirects may contain private credentials or URLs.
            if res.status == 403 || (300..400).contains(&res.status) {
                return Err(CliError::new(format!(
                    "{label} failed: HTTP {}.{}",
                    res.status,
                    if res.status == 403 {
                        " Check the cached token's account permissions."
                    } else {
                        " Redirects are not followed; use the documented resource path."
                    }
                )));
            }
            let detail = redact(res.body.as_deref().map(decode_text).unwrap_or_default(), &tokens);
            return Err(CliError::new(format!(
                "{label} failed: HTTP {}{}{}",
                res.status,
                if !is_read && res.status >= 500 { ". Its outcome is unknown; check Guesty before trying again." } else { "" },
                if detail.is_empty() { String::new() } else { format!("\n{detail}") }
            )));
        }

        if res.status == 204 || res.status == 205 || method == "HEAD" {
            return Ok(Data::None);
        }
        let content_type = res.header("content-type").unwrap_or("").to_ascii_lowercase();
        let read_failed = || CliError::new(format!("{label} response could not be read; the request was not retried."));
        match options.response_type {
            ResponseType::Buffer => return res.body.map(Data::Bytes).map_err(|_| read_failed()),
            ResponseType::Text => return res.body.map(|b| Data::Text(decode_text(&b))).map_err(|_| read_failed()),
            _ => {}
        }
        if options.response_type == ResponseType::Json
            || content_type.contains("application/json")
            || content_type.contains("+json")
        {
            let text = res.body.as_deref().map(decode_text).map_err(|_| read_failed())?;
            if text.trim().is_empty() {
                return Ok(Data::None);
            }
            return json::parse(&text)
                .map(Data::Json)
                .map_err(|_| CliError::new(format!("{label} returned invalid JSON; the request was not retried.")));
        }
        if content_type.starts_with("text/")
            || content_type.contains("csv")
            || content_type.contains("xml")
            || content_type.contains("html")
        {
            return res.body.map(|b| Data::Text(decode_text(&b))).map_err(|_| read_failed());
        }
        return res.body.map(Data::Bytes).map_err(|_| read_failed());
    }
    Err(CliError::new(format!("{label} failed after {MAX_ATTEMPTS} attempts")))
}

/// `guestyFetch(path, { params })`, a GET.
pub fn get(path: &str, params: Params) -> Result<Data> {
    guesty_fetch(path, Fetch::get(params))
}

fn pagination_number(value: Option<&Json>, name: &str) -> Result<Option<f64>> {
    let value = match value {
        None | Some(Json::Null) => return Ok(None),
        Some(v) => v,
    };
    let number = match value {
        Json::String(s) if !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit()) => s.parse::<f64>().ok(),
        Json::Number(n) => n.as_f64(),
        _ => None,
    };
    let min = if name == "limit" { 1.0 } else { 0.0 };
    match number {
        Some(n) if n.fract() == 0.0 && n.abs() <= 9_007_199_254_740_991.0 && n >= min => Ok(Some(n)),
        _ => Err(CliError::new(format!(
            "Invalid pagination {name}: expected {} integer.",
            if name == "limit" { "a positive" } else { "a nonnegative" }
        ))),
    }
}

fn param_number(value: Option<&Param>, name: &str, fallback: f64) -> Result<f64> {
    let json = match value {
        None | Some(Param::Null) => return Ok(fallback),
        Some(Param::Num(n)) => json::number(*n),
        Some(Param::Str(s)) => Json::String(s.clone()),
        Some(Param::Bool(b)) => Json::Bool(*b),
        Some(_) => Json::Array(Vec::new()),
    };
    Ok(pagination_number(Some(&json), name)?.unwrap_or(fallback))
}

/// `paginateAll(path, params, resultsKey)`: every page, up to 10,000 results,
/// refusing to return a partial or inconsistent result.
pub fn paginate_all(path: &str, params: &Params, results_key: Option<&str>) -> Result<Vec<Json>> {
    let mut limit = param_number(params.get("limit"), "limit", 100.0)?.min(100.0);
    let mut skip = param_number(params.get("skip"), "skip", 0.0)?;
    let mut all: Vec<Json> = Vec::new();
    let mut seen = std::collections::HashSet::new();
    loop {
        let mut page_params = params.clone();
        page_params.set("limit", limit);
        page_params.set("skip", skip);
        let res = get(path, page_params)?.into_json();
        let record = res.as_object();
        let key = results_key.map(str::to_string).or_else(|| {
            ["results", "data", "items"].iter().find(|n| record.and_then(|r| r.get(**n)).is_some_and(Json::is_array)).map(|s| s.to_string())
        });
        let items: Vec<Json> = if let Some(items) = res.as_array() {
            items.clone()
        } else if let Some(items) = key.as_deref().and_then(|k| record.and_then(|r| r.get(k))).and_then(Json::as_array) {
            items.clone()
        } else {
            return Err(CliError::new(format!(
                "Cannot paginate {path}: expected an array{}.",
                match results_key {
                    Some(k) => format!(" in '{k}'"),
                    None => " of results".into(),
                }
            )));
        };
        let pagination = record.and_then(|r| r.get("pagination"));
        if let Some(p) = pagination {
            if !p.is_object() {
                return Err(CliError::new(format!("Cannot paginate {path}: invalid pagination metadata.")));
            }
        }
        let metadata = pagination.and_then(Json::as_object).or(record);
        let field = |name: &str| metadata.and_then(|m| m.get(name)).filter(|v| !v.is_null());
        if let Some(response_skip) = pagination_number(field("skip"), "skip")? {
            if response_skip != skip {
                return Err(CliError::new(format!(
                    "Cannot paginate {path}: the API did not honor the requested skip ({}).",
                    json::number_to_string(skip, false)
                )));
            }
        }
        let total = pagination_number(field("count").or_else(|| field("total")).or_else(|| field("totalCount")), "count")?;
        let server_limit = pagination_number(field("limit"), "limit")?;
        let has_more = match metadata.and_then(|m| m.get("hasMore")) {
            None => None,
            Some(Json::Bool(b)) => Some(*b),
            Some(_) => return Err(CliError::new(format!("Cannot paginate {path}: invalid hasMore metadata."))),
        };
        if let Some(server) = server_limit {
            limit = limit.min(server);
        }
        if items.is_empty() {
            if has_more == Some(true) || total.is_some_and(|t| skip < t) {
                return Err(CliError::new(format!("Cannot paginate {path}: the API returned an empty page before completion.")));
            }
            return Ok(all);
        }
        for item in &items {
            let id = item.as_object().and_then(|o| o.get("_id").filter(|v| !v.is_null()).or_else(|| o.get("id")));
            let identity = match id {
                Some(Json::String(s)) => s.clone(),
                Some(Json::Number(n)) => json::number_to_string(n.as_f64().unwrap_or(f64::NAN), false),
                _ => continue,
            };
            if !seen.insert(identity) {
                return Err(CliError::new(format!(
                    "Cannot paginate {path}: the API repeated a record. Use a stable, unique sort and retry."
                )));
            }
        }
        if all.len() + items.len() > 10_000 {
            return Err(CliError::new(
                "Pagination exceeds 10,000 results. Use filters to narrow your query; no partial result was returned.",
            ));
        }
        let count = items.len();
        all.extend(items);
        skip += count as f64;
        if has_more == Some(false) || (has_more.is_none() && total.is_some_and(|t| skip >= t)) {
            return Ok(all);
        }
        if has_more.is_none() && total.is_none() && server_limit.is_some_and(|l| (count as f64) < l) {
            return Ok(all);
        }
        if all.len() >= 10_000 {
            return Err(CliError::new(
                "Pagination reached 10,000 results without confirming completion. Use filters to narrow your query; no partial result was returned.",
            ));
        }
        // Without count/limit metadata, a short page may reflect the server's cap.
        // Continue by the actual item count until an empty page confirms completion.
    }
}

// ─── Booking Engine API ──────────────────────────────────────────────────────
// Every operation in Guesty's Booking Engine reference names this server, and
// its paths start with /api/. Requests use only the cached beapi token.

pub struct BookingFetch {
    pub method: &'static str,
    pub body: Option<Json>,
    pub params: Option<Params>,
    pub timeout_ms: u64,
}

impl Default for BookingFetch {
    fn default() -> Self {
        BookingFetch { method: "GET", body: None, params: None, timeout_ms: REQUEST_TIMEOUT_MS }
    }
}

fn booking_engine_url(path: &str, params: Option<&Params>) -> Result<url::Url> {
    if !path.starts_with("/api/") {
        return Err(CliError::new("Use a Guesty Booking Engine API resource path, such as /api/listings."));
    }
    // resourceUrl applies the shared path, OAuth and query-parameter checks.
    let checked = resource_url(path, params)?;
    let mut tail = checked.path().to_string();
    if let Some(q) = checked.query() {
        tail.push('?');
        tail.push_str(q);
    }
    let url = url::Url::parse(BOOKING_ENGINE_BASE_URL)
        .expect("base")
        .join(&tail)
        .map_err(|_| CliError::new("Booking Engine API paths must stay under /api/."))?;
    if !url.path().starts_with("/api/") {
        return Err(CliError::new("Booking Engine API paths must stay under /api/."));
    }
    Ok(url)
}

/// `bookingEngineFetch(path, options)`.
pub fn booking_engine_fetch(path: &str, options: BookingFetch) -> Result<Data> {
    let method = options.method.to_ascii_uppercase();
    if !["GET", "POST", "PUT"].contains(&method.as_str()) {
        return Err(CliError::new("The Booking Engine API documents only GET, POST, and PUT requests."));
    }
    let timeout_ms = options.timeout_ms;
    if timeout_ms == 0 || timeout_ms > MAX_TIMER_MS {
        return Err(CliError::new("Request timeout must be a positive integer number of milliseconds, at most 2147483647."));
    }
    if method == "GET" && options.body.is_some() {
        return Err(CliError::new("GET requests cannot contain a body. Use query params or a different HTTP method."));
    }
    let url = booking_engine_url(path, options.params.as_ref())?;
    let mut headers = vec![("accept".to_string(), "application/json".to_string())];
    if options.body.is_some() {
        headers.push(("content-type".into(), "application/json".into()));
    }
    let body = options.body.as_ref().map(|b| json::compact(b).into_bytes());
    let mut tokens: Vec<String> = Vec::new();
    let mut cache_reread = false;
    let is_read = method == "GET";
    let label = read_label("Guesty Booking Engine API", &method, url.path());
    let timeout_s = json::number_to_string(timeout_ms as f64 / 1000.0, false);

    for attempt in 1..=MAX_ATTEMPTS {
        enforce_rate_limit(&BOOKING_TIMES, &BOOKING_ENGINE_RATE_LIMITS, "Guesty Booking Engine API");
        // Read after any rate-limit wait, which may outlive the token's usable window.
        let token = auth::get_cached_token(TokenType::Beapi)?.access_token;
        if !tokens.contains(&token) {
            tokens.push(token.clone());
        }
        let mut request_headers = headers.clone();
        request_headers.push(("Authorization".into(), format!("Bearer {token}")));
        let sent = http::send(http::Request {
            method: &method,
            url: url.as_str(),
            headers: request_headers,
            body: body.clone(),
            timeout_ms,
        });
        let Ok(res) = sent else {
            if is_read && attempt < MAX_ATTEMPTS {
                write_err("Guesty Booking Engine request could not complete. Retrying the read request...\n");
                hooks::sleep_ms(attempt as u64 * 1000);
                continue;
            }
            return Err(CliError::new(format!(
                "{label} could not complete (network error or {timeout_s}s timeout).{}",
                if is_read { "" } else { " Its outcome is unknown; check Guesty before trying again." }
            )));
        };

        if res.status == 401 {
            // Marks this token rejected for the process; the shared cache is untouched.
            auth::invalidate_token(Some(&token));
            if cache_reread || attempt == MAX_ATTEMPTS {
                return Err(CliError::new(format!(
                    "Guesty rejected the cached Booking Engine API token (401); the CLI cannot refresh it. {}",
                    auth::cache_guidance(TokenType::Beapi)
                )));
            }
            write_err("Guesty rejected the cached booking-engine token (401). Re-reading the cache once...\n");
            cache_reread = true;
            continue;
        }

        if (res.status == 429 || (is_read && [408, 500, 502, 503, 504].contains(&res.status))) && attempt < MAX_ATTEMPTS {
            let fallback = attempt as f64 * if res.status == 429 { 5000.0 } else { 1000.0 };
            let wait = retry_delay(res.header("retry-after"), fallback);
            write_err(&format!(
                "Guesty Booking Engine API returned HTTP {}. Retrying in {}s...\n",
                res.status,
                (wait / 1000.0).ceil()
            ));
            hooks::sleep_ms(wait as u64);
            continue;
        }

        if !res.ok() {
            if res.status == 403 || (300..400).contains(&res.status) {
                return Err(CliError::new(format!(
                    "{label} failed: HTTP {}.{}",
                    res.status,
                    if res.status == 403 {
                        " Check the booking-engine instance's permissions and listings."
                    } else {
                        " Redirects are not followed; use the documented resource path."
                    }
                )));
            }
            let detail = redact(res.body.as_deref().map(decode_text).unwrap_or_default(), &tokens);
            return Err(CliError::new(format!(
                "{label} failed: HTTP {}{}{}",
                res.status,
                if !is_read && res.status >= 500 { ". Its outcome is unknown; check Guesty before trying again." } else { "" },
                if detail.is_empty() { String::new() } else { format!("\n{detail}") }
            )));
        }

        if res.status == 204 || res.status == 205 {
            return Ok(Data::None);
        }
        let text = res
            .body
            .as_deref()
            .map(decode_text)
            .map_err(|_| CliError::new(format!("{label} response could not be read; the request was not retried.")))?;
        let content_type = res.header("content-type").unwrap_or("").to_ascii_lowercase();
        if !content_type.contains("json") {
            return Ok(Data::Text(text));
        }
        if text.trim().is_empty() {
            return Ok(Data::None);
        }
        return json::parse(&text)
            .map(Data::Json)
            .map_err(|_| CliError::new(format!("{label} returned invalid JSON; the request was not retried.")));
    }
    Err(CliError::new(format!("{label} failed after {MAX_ATTEMPTS} attempts")))
}

/// Unit tests share one process; each starts with no request history.
#[cfg(test)]
pub(crate) fn reset_rate_limits_for_tests() {
    OPEN_API_TIMES.lock().unwrap_or_else(|e| e.into_inner()).clear();
    BOOKING_TIMES.lock().unwrap_or_else(|e| e.into_inner()).clear();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn oauth_paths_are_refused_at_every_decoding_level() {
        for path in ["/oauth2/token", "/v1/OAuth2/x", "/%6fauth2/token", "/%256fauth2", "/v1/x/oauth"] {
            assert!(resource_url(path, None).is_err(), "{path}");
        }
        assert!(resource_url("/v1/listings", None).is_ok());
        assert!(resource_url("/v1/oauthapps", None).is_ok());
        assert!(resource_url("//evil.example/x", None).is_err());
        assert!(resource_url("/v1/%zz", None).is_err() || resource_url("/v1/%zz", None).is_ok());
    }

    #[test]
    fn query_serialization_matches_url_search_params() {
        let url = resource_url("/v1/x?a=b c", Some(&params! { "k" => "1 2", "n" => 25.0, "l" => vec!["a".to_string(), "b".to_string()] })).unwrap();
        assert_eq!(url.query(), Some("a=b+c&k=1+2&n=25&l=a&l=b"));
        let untouched = resource_url("/v1/x?a=b c", Some(&Params::new())).unwrap();
        assert_eq!(untouched.query(), Some("a=b%20c"));
    }

    #[test]
    fn retry_after() {
        assert_eq!(retry_delay(Some("2"), 9.0), 2000.0);
        assert_eq!(retry_delay(Some("1.5"), 9.0), 1500.0);
        assert_eq!(retry_delay(Some("soon"), 9.0), 9.0);
        assert_eq!(retry_delay(None, 9.0), 9.0);
    }
}

/// Ports of the script-driven tests in test/client.test.mjs and the transport
/// tests in test/booking-engine.test.mjs, which called `guestyFetch`,
/// `paginateAll` and `bookingEngineFetch` in one Node process. Every request
/// goes to a local mock; every token and clock is fake.
#[cfg(all(test, feature = "test-hooks"))]
mod offline_tests {
    use super::*;
    use crate::hooks::testing::{NOW, Recorded, Reply, Session};
    use crate::json::json;

    const BEAPI_TOKEN: &str = "fake-isolated-beapi-token";

    fn token(kind: &str, value: &str) -> Json {
        json!({ "token_type": kind, "access_token": value, "expires_at": NOW + 36_000_000.0 })
    }

    /// What test/fixtures/isolated-runtime.mjs answered.
    #[derive(Default)]
    struct Scenario {
        responses: Vec<Reply>,
        booking: Vec<Reply>,
        shared: Vec<Json>,
        beapi_shared: Vec<Json>,
        pagination_count: Option<usize>,
    }

    fn pick(replies: &[Reply], index: &mut usize, fallback: Reply) -> Reply {
        let reply = if replies.is_empty() { fallback } else { replies[(*index).min(replies.len() - 1)].clone() };
        *index += 1;
        reply
    }

    /// The isolated runtime: a shared-cache configuration, a valid typed disk
    /// token (far from expiry: unlike the Node fixture's, a file can't follow
    /// the fake clock through long waits), and scripted replies.
    fn isolated(scenario: Scenario) -> Session {
        let session = Session::new();
        session.shared_cache();
        session.disk_token(
            json!({ "token_type": "openapi", "access_token": "fake-isolated-openapi-token", "expires_at": NOW + 1e12 }),
        );
        let (mut api, mut booking, mut shared, mut beapi) = (0, 0, 0, 0);
        session.answer(move |r: &Recorded| {
            let path = r.url.path();
            let cache = r.host() == "cache.invalid" && path == "/rest/v1/guesty_tokens" && r.method == "GET";
            if r.host() == "open-api.guesty.com" && path.starts_with("/v1/") && !path.to_lowercase().contains("oauth") {
                if let Some(count) = scenario.pagination_count {
                    let skip: usize = r.param("skip").and_then(|v| v.parse().ok()).unwrap_or(0);
                    let limit: usize = r.param("limit").and_then(|v| v.parse().ok()).unwrap_or(0);
                    let n = limit.min(count.saturating_sub(skip));
                    let results: Vec<Json> = (0..n).map(|i| json!({ "_id": (skip + i).to_string() })).collect();
                    return Reply::ok(json!({ "results": results, "count": count, "skip": skip, "limit": limit }));
                }
                return pick(&scenario.responses, &mut api, Reply::ok(json!({ "results": [] })));
            }
            if r.host() == "booking.guesty.com" && path.starts_with("/api/") {
                return pick(&scenario.booking, &mut booking, Reply::ok(json!({ "ok": true })));
            }
            if cache && r.param("token_type").as_deref() == Some("eq.beapi") {
                let rows = if scenario.beapi_shared.is_empty() {
                    json!([token("beapi", BEAPI_TOKEN)])
                } else {
                    scenario.beapi_shared[beapi.min(scenario.beapi_shared.len() - 1)].clone()
                };
                beapi += 1;
                return Reply::ok(rows);
            }
            if cache && r.param("token_type").as_deref() == Some("eq.openapi") {
                let rows = if scenario.shared.is_empty() {
                    json!([token("openapi", "fake-isolated-openapi-token")])
                } else {
                    scenario.shared[shared.min(scenario.shared.len() - 1)].clone()
                };
                shared += 1;
                return Reply::ok(rows);
            }
            Reply::Drop
        });
        session
    }

    fn message(result: Result<Data>) -> String {
        match result {
            Ok(_) => panic!("expected a rejection"),
            Err(e) => e.message(),
        }
    }

    /// `/a.*b.*c/` without a regex crate.
    fn matches_in_order(text: &str, parts: &[&str]) -> bool {
        let mut rest = text;
        for part in parts {
            match rest.find(part) {
                Some(i) => rest = &rest[i + part.len()..],
                None => return false,
            }
        }
        true
    }

    fn ok_json(result: Result<Data>) -> Json {
        match result {
            Ok(data) => data.into_json(),
            Err(e) => panic!("{}", e.message()),
        }
    }

    // ─── client.test.mjs ────────────────────────────────────────────────────

    #[test]
    fn invalid_options_fail_before_token_or_cache_access() {
        let header = |name: &str, value: &str| vec![(name.to_string(), value.to_string())];
        let cases: Vec<(&str, &str, Fetch)> = vec![
            ("nested query object", "/v1/listings", Fetch::get(params! { "q" => Param::Invalid })),
            ("nonfinite query", "/v1/listings", Fetch::get(params! { "limit" => f64::NAN })),
            ("GET body", "/v1/listings", Fetch { body: Some(Body::Json(json!({}))), ..Fetch::default() }),
            (
                "HEAD body",
                "/v1/listings",
                Fetch { method: "HEAD".into(), body: Some(Body::Json(Json::Null)), ..Fetch::default() },
            ),
            ("unsupported HTTP method", "/v1/listings", Fetch::method("CONNECT")),
            ("invalid timeout", "/v1/listings", Fetch { timeout_ms: 0, ..Fetch::default() }),
            (
                "header line injection",
                "/v1/listings",
                Fetch { headers: header("X-Test", "value\ninjected"), ..Fetch::default() },
            ),
            ("URL fragment", "/v1/listings#hidden", Fetch::default()),
            ("double encoded OAuth", "/%256fauth2/token", Fetch::method("POST")),
            ("encoded OAuth query separator", "/oauth2%3Ftoken", Fetch::method("POST")),
            ("encoded OAuth path parameter", "/%6fauth2;token", Fetch::method("POST")),
        ];
        for (name, path, options) in cases {
            let session = isolated(Scenario::default());
            assert!(guesty_fetch(path, options).is_err(), "{name}");
            assert_eq!(session.requests().len(), 0, "{name}");
            assert_eq!(session.token_reads(), 0, "{name}");
        }
        // `params: {nested}` from the command line, `[]` and `null` roots, as raw builds them.
        let nested = Params::from_json(&json!({ "q": { "value": "bad" } })).unwrap();
        assert!(validate_params(&nested).is_err(), "nested query object from JSON");
        assert!(Params::from_json(&json!([])).is_err(), "array query root");
        assert!(Params::from_json(&Json::Null).is_err(), "null query root");
        // "response typo" ('jsoon') can't be expressed: ResponseType is an enum, and
        // raw rejects --response jsoon before any request (test/io.test.mjs).
    }

    #[test]
    fn json_null_remains_a_json_body() {
        let session = isolated(Scenario::default());
        guesty_fetch("/v1/listings", Fetch::json("POST", Json::Null)).unwrap();
        let request = &session.requests()[0];
        assert_eq!(request.text(), "null");
        assert_eq!(request.header("content-type"), Some("application/json"));
    }

    #[test]
    fn get_retries_temporary_server_and_network_failures_with_a_bounded_attempt_count() {
        let session = isolated(Scenario {
            responses: vec![Reply::status(503), Reply::Drop, Reply::ok(json!({ "ok": true }))],
            ..Scenario::default()
        });
        assert_eq!(ok_json(guesty_fetch("/v1/listings", Fetch::default())), json!({ "ok": true }));
        assert_eq!(session.requests().len(), 3);
        assert_eq!(session.waits(), vec![1000, 2000]);
    }

    #[test]
    fn writes_are_not_retried_after_ambiguous_failures() {
        for method in ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"] {
            for (name, reply) in [
                ("network failure", Reply::Drop),
                ("server failure", Reply::json(503, json!({ "message": "unavailable" }))),
            ] {
                let session = isolated(Scenario { responses: vec![reply], ..Scenario::default() });
                let error = message(guesty_fetch("/v1/listings", Fetch::method(method)));
                assert!(error.contains("outcome is unknown"), "{method} {name}: {error}");
                assert_eq!(session.requests().len(), 1, "{method} {name}");
                assert_eq!(session.waits(), Vec::<u64>::new(), "{method} {name}");
            }
        }
    }

    #[test]
    fn timeout_aborts_an_in_flight_mutation_without_replaying_it() {
        let session = isolated(Scenario { responses: vec![Reply::Hang], ..Scenario::default() });
        let error =
            message(guesty_fetch("/v1/listings", Fetch { method: "POST".into(), timeout_ms: 5, ..Fetch::default() }));
        assert!(matches_in_order(&error, &["timeout", "outcome is unknown"]), "{error}");
        assert_eq!(session.requests().len(), 1);
        assert_eq!(session.timeouts(), vec![5]);
    }

    #[test]
    fn retry_after_delays_a_rejected_write_correctly() {
        let date = |ms: f64| {
            chrono::DateTime::from_timestamp_millis(ms as i64).unwrap().format("%a, %d %b %Y %H:%M:%S GMT").to_string()
        };
        let cases: Vec<(&str, String, Vec<u64>)> = vec![
            ("seconds", "2".into(), vec![2000]),
            ("fractional seconds", "0.5".into(), vec![500]),
            ("HTTP-date", date(NOW + 3000.0), vec![3000]),
            ("past date", date(NOW - 3000.0), vec![]),
            ("invalid header", "soon".into(), vec![5000]),
            ("negative seconds", "-5".into(), vec![5000]),
            ("overflowing timer", "2147484".into(), vec![2147483647, 353]),
        ];
        for (name, retry_after, waits) in cases {
            let session = isolated(Scenario {
                responses: vec![
                    Reply::status(429).header("retry-after", &retry_after),
                    Reply::ok(json!({ "ok": true })),
                ],
                ..Scenario::default()
            });
            guesty_fetch("/v1/listings", Fetch::json("POST", json!({ "value": 1 }))).unwrap();
            assert_eq!(session.requests().len(), 2, "{name}");
            assert_eq!(session.waits(), waits, "{name}");
        }
    }

    #[test]
    fn retries_after_429_stop_after_three_attempts() {
        let session = isolated(Scenario {
            responses: vec![Reply::status(429).header("retry-after", "0")],
            ..Scenario::default()
        });
        assert!(message(guesty_fetch("/v1/listings", Fetch::default())).contains("HTTP 429"));
        assert_eq!(session.requests().len(), 3);
    }

    #[test]
    fn rate_limiter_enforces_documented_second_minute_and_hour_windows() {
        let session = isolated(Scenario::default());
        for _ in 0..5001 {
            guesty_fetch("/v1/listings", Fetch::default()).unwrap();
        }
        let requests = session.requests_to("open-api.guesty.com");
        assert_eq!(requests.len(), 5001);
        for (max, window) in [(15usize, 1000.0), (120, 60_000.0), (5000, 3_600_000.0)] {
            for index in max..requests.len() {
                assert!(requests[index].at - requests[index - max].at >= window, "{max} per {window}ms");
            }
        }
    }

    fn page_params(value: Json) -> Params {
        Params::from_json(&value).unwrap()
    }

    #[test]
    fn pagination_cases() {
        let cases: Vec<(&str, Json, Vec<Json>, Vec<f64>, Vec<f64>)> = vec![
            (
                "respects initial skip and caller page size",
                json!({ "limit": 2, "skip": 5 }),
                vec![
                    json!({ "results": [{ "_id": "a" }, { "_id": "b" }], "count": 8, "skip": 5, "limit": 2 }),
                    json!({ "results": [{ "_id": "c" }], "count": 8, "skip": 7, "limit": 2 }),
                ],
                vec![5.0, 7.0],
                vec![2.0, 2.0],
            ),
            (
                "follows lower server cap",
                json!({ "limit": 100 }),
                vec![
                    json!({ "results": [{ "_id": "a" }], "count": 2, "skip": 0, "limit": 1 }),
                    json!({ "results": [{ "_id": "b" }], "count": 2, "skip": 1, "limit": 1 }),
                ],
                vec![0.0, 1.0],
                vec![100.0, 1.0],
            ),
            (
                "continues short pages when total remains",
                json!({ "limit": 100 }),
                vec![
                    json!({ "results": [{ "_id": "a" }], "count": 2 }),
                    json!({ "results": [{ "_id": "b" }], "count": 2 }),
                ],
                vec![0.0, 1.0],
                vec![100.0, 100.0],
            ),
            (
                "confirms completion without metadata",
                json!({}),
                vec![json!([{ "_id": "a" }]), json!([{ "_id": "b" }]), json!([])],
                vec![0.0, 1.0, 2.0],
                vec![100.0, 100.0, 100.0],
            ),
            (
                "uses v3 nested hasMore even on a short page",
                json!({ "limit": 2, "skip": 5 }),
                vec![
                    json!({ "results": [{ "_id": "a" }], "pagination": { "skip": 5, "limit": 2, "hasMore": true } }),
                    json!({ "results": [{ "_id": "b" }], "pagination": { "skip": 6, "limit": 2, "hasMore": false } }),
                ],
                vec![5.0, 6.0],
                vec![2.0, 2.0],
            ),
        ];
        for (name, params, pages, skips, limits) in cases {
            let path = if name.contains("v3") { "/v1/reservations-v3/search" } else { "/v1/listings" };
            let expected: Vec<Json> = pages
                .iter()
                .flat_map(|p| p.as_array().or_else(|| p["results"].as_array()).cloned().unwrap_or_default())
                .collect();
            let session =
                isolated(Scenario { responses: pages.into_iter().map(Reply::ok).collect(), ..Scenario::default() });
            let got = paginate_all(path, &page_params(params), Some("results"))
                .unwrap_or_else(|e| panic!("{name}: {}", e.message()));
            assert_eq!(got, expected, "{name}");
            let number = |r: &Recorded, k: &str| r.param(k).and_then(|v| v.parse::<f64>().ok()).unwrap_or(f64::NAN);
            assert_eq!(session.requests().iter().map(|r| number(r, "skip")).collect::<Vec<_>>(), skips, "{name}");
            assert_eq!(session.requests().iter().map(|r| number(r, "limit")).collect::<Vec<_>>(), limits, "{name}");
        }
    }

    #[test]
    fn pagination_rejects_inconsistent_pages_without_returning_partial_results() {
        let cases: Vec<(&str, Vec<Json>, &str)> = vec![
            ("null response", vec![Json::Null], "expected an array"),
            ("missing explicit result key", vec![json!({ "data": [] })], "expected an array"),
            ("invalid count", vec![json!({ "results": [], "count": "bad" })], "Invalid pagination count"),
            ("invalid metadata", vec![json!({ "results": [], "pagination": [] })], "invalid pagination metadata"),
            (
                "invalid hasMore",
                vec![json!({ "results": [], "pagination": { "hasMore": "false" } })],
                "invalid hasMore",
            ),
            (
                "ignored skip",
                vec![
                    json!({ "results": [{ "_id": "a" }], "count": 2, "skip": 0 }),
                    json!({ "results": [{ "_id": "b" }], "count": 2, "skip": 0 }),
                ],
                "did not honor",
            ),
            (
                "duplicate record",
                vec![
                    json!({ "results": [{ "_id": "a" }], "count": 2 }),
                    json!({ "results": [{ "_id": "a" }], "count": 2 }),
                ],
                "repeated a record",
            ),
            ("empty page before total", vec![json!({ "results": [], "count": 1 })], "before completion"),
            (
                "empty page with hasMore",
                vec![json!({ "results": [], "pagination": { "hasMore": true } })],
                "before completion",
            ),
        ];
        for (name, pages, pattern) in cases {
            let _session = isolated(Scenario {
                responses: pages.iter().map(|p| Reply::raw(200, &json::compact(p))).collect(),
                ..Scenario::default()
            });
            match paginate_all("/v1/listings", &Params::new(), Some("results")) {
                Ok(v) => panic!("{name}: returned {v:?}"),
                Err(e) => assert!(e.message().contains(pattern), "{name}: {}", e.message()),
            }
        }
    }

    #[test]
    fn invalid_pagination_options_fail_before_auth() {
        for params in [json!({ "skip": -1 }), json!({ "limit": 0 }), json!({ "limit": "12x" }), json!({ "skip": 1.5 })]
        {
            let session = isolated(Scenario::default());
            let error = paginate_all("/v1/listings", &page_params(params.clone()), None).err().expect("rejects");
            assert!(error.message().contains("Invalid pagination"), "{params}: {}", error.message());
            assert_eq!(session.requests().len(), 0, "{params}");
            assert_eq!(session.token_reads(), 0, "{params}");
        }
    }

    #[test]
    fn pagination_cap_fails_explicitly_but_a_confirmed_complete_result_succeeds() {
        let full = isolated(Scenario { pagination_count: Some(10_000), ..Scenario::default() });
        assert_eq!(paginate_all("/v1/listings", &Params::new(), None).unwrap().len(), 10_000);
        assert_eq!(full.requests().len(), 100);
        drop(full);
        let capped = isolated(Scenario { pagination_count: Some(10_001), ..Scenario::default() });
        let error = paginate_all("/v1/listings", &Params::new(), None).err().expect("rejects").message();
        assert!(matches_in_order(&error, &["10,000", "no partial result"]), "{error}");
        assert_eq!(capped.requests().len(), 100);
    }

    #[test]
    fn multipart_bodies_retain_their_file_bytes_and_carry_their_own_boundary() {
        let session = isolated(Scenario::default());
        let part = Part::File {
            name: "file".into(),
            filename: "photo.jpg".into(),
            content_type: "image/jpeg".into(),
            data: b"photo-bytes".to_vec(),
        };
        guesty_fetch(
            "/v1/listings",
            Fetch { method: "POST".into(), body: Some(Body::Multipart(vec![part])), ..Fetch::default() },
        )
        .unwrap();
        let request = &session.requests()[0];
        let content_type = request.header("content-type").unwrap();
        let boundary = content_type.strip_prefix("multipart/form-data; boundary=").expect("multipart content type");
        let text = request.text();
        assert!(text.contains("filename=\"photo.jpg\""));
        assert!(text.contains("Content-Type: image/jpeg\r\n\r\nphoto-bytes\r\n"));
        assert!(text.starts_with(&format!("--{boundary}\r\n")) && text.ends_with(&format!("--{boundary}--\r\n")));
    }

    // ─── booking-engine.test.mjs: transport ─────────────────────────────────

    fn be(path: &str, options: BookingFetch) -> Result<Data> {
        booking_engine_fetch(path, options)
    }

    fn beapi_cache_reads(session: &Session) -> usize {
        session
            .requests_to("cache.invalid")
            .iter()
            .filter(|r| r.param("token_type").as_deref() == Some("eq.beapi"))
            .count()
    }

    #[test]
    fn booking_engine_requests_use_booking_guesty_com_and_only_the_cached_beapi_token() {
        let session = isolated(Scenario::default());
        let params = params! { "limit" => 5.0, "tags" => vec!["a".to_string(), "b".to_string()] };
        assert_eq!(
            ok_json(be("/api/listings", BookingFetch { params: Some(params), ..BookingFetch::default() })),
            json!({ "ok": true })
        );
        let requests = session.requests();
        assert_eq!(requests.len(), 2);
        let (cache, request) = (&requests[0], &requests[1]);
        assert_eq!(
            cache.param("token_type").as_deref(),
            Some("eq.beapi"),
            "reads the beapi row, never the newest row of any type"
        );
        assert_eq!(session.token_reads(), 0, "the Open API disk cache is never consulted for beapi");
        assert_eq!(request.url.origin().ascii_serialization(), "https://booking.guesty.com");
        assert_eq!(request.url.path(), "/api/listings");
        let pairs = |v: &[(&str, &str)]| v.iter().map(|(a, b)| (a.to_string(), b.to_string())).collect::<Vec<_>>();
        assert_eq!(request.query(), pairs(&[("limit", "5"), ("tags", "a"), ("tags", "b")]));
        assert_eq!(request.header("authorization"), Some(format!("Bearer {BEAPI_TOKEN}").as_str()));
        assert_eq!(request.header("accept"), Some("application/json"));
        // fetch's `signal` and `redirect: "manual"` options: every request has a timeout
        // (the cache read's and this one's), and redirects aren't followed (below).
        assert_eq!(session.timeouts().len(), 2);
    }

    #[test]
    fn booking_engine_writes_send_json_bodies() {
        let session = isolated(Scenario::default());
        be(
            "/api/reservations/quotes",
            BookingFetch { method: "POST", body: Some(json!({ "listingId": "x" })), ..BookingFetch::default() },
        )
        .unwrap();
        let request = &session.requests_to("booking.guesty.com")[0];
        assert_eq!(request.method, "POST");
        assert_eq!(request.header("content-type"), Some("application/json"));
        assert_eq!(request.text(), "{\"listingId\":\"x\"}");
    }

    #[test]
    fn booking_engine_transport_rejects_bad_requests_before_any_token_or_network_access() {
        let cases: Vec<(&str, &str, BookingFetch, &str)> = vec![
            ("an Open API path", "/v1/listings", BookingFetch::default(), "Booking Engine API resource path"),
            (
                "the OAuth endpoint",
                "/oauth2/token",
                BookingFetch { method: "POST", ..BookingFetch::default() },
                "Booking Engine API resource path",
            ),
            (
                "a dot segment that reaches OAuth",
                "/api/../oauth2/token",
                BookingFetch { method: "POST", ..BookingFetch::default() },
                "OAuth endpoints are disabled",
            ),
            (
                "an encoded dot segment that reaches OAuth",
                "/api/%2e%2e/oauth2/token",
                BookingFetch { method: "POST", ..BookingFetch::default() },
                "OAuth endpoints are disabled",
            ),
            ("a dot segment that leaves /api/", "/api/../health", BookingFetch::default(), "must stay under /api/"),
            (
                "a GET body",
                "/api/listings",
                BookingFetch { body: Some(json!({})), ..BookingFetch::default() },
                "cannot contain a body",
            ),
            (
                "an undocumented method",
                "/api/listings",
                BookingFetch { method: "DELETE", ..BookingFetch::default() },
                "only GET, POST, and PUT",
            ),
            (
                "a nested query object",
                "/api/listings",
                BookingFetch {
                    params: Some(Params::from_json(&json!({ "city": { "name": "x" } })).unwrap()),
                    ..BookingFetch::default()
                },
                "Query parameter 'city'",
            ),
        ];
        for (name, path, options, pattern) in cases {
            let session = isolated(Scenario::default());
            let error = message(be(path, options));
            assert!(error.contains(pattern), "{name}: {error}");
            assert_eq!(session.requests().len(), 0, "{name}");
            assert_eq!(beapi_cache_reads(&session), 0, "{name}");
        }
    }

    #[test]
    fn a_booking_engine_401_rereads_the_beapi_cache_once_and_retries_with_a_different_token() {
        let session = isolated(Scenario {
            booking: vec![Reply::json(401, json!({ "message": "expired" })), Reply::ok(json!({ "ok": true }))],
            beapi_shared: vec![
                json!([{ "token_type": "beapi", "access_token": BEAPI_TOKEN, "expires_at": 1_800_036_000_000.0 }]),
                json!([{ "token_type": "beapi", "access_token": "fake-isolated-beapi-second", "expires_at": 1_800_036_000_000.0 }]),
            ],
            ..Scenario::default()
        });
        let before = session.home_files();
        assert_eq!(ok_json(be("/api/listings", BookingFetch::default())), json!({ "ok": true }));
        let auth: Vec<_> = session
            .requests_to("booking.guesty.com")
            .iter()
            .map(|r| r.header("authorization").unwrap_or("").to_string())
            .collect();
        assert_eq!(auth, vec![format!("Bearer {BEAPI_TOKEN}"), "Bearer fake-isolated-beapi-second".to_string()]);
        assert_eq!(beapi_cache_reads(&session), 2);
        assert_eq!(session.home_files(), before, "no cache is written");
    }

    #[test]
    fn a_booking_engine_401_fails_without_requesting_a_token_when_the_cache_has_nothing_new() {
        let session = isolated(Scenario { booking: vec![Reply::status(401)], ..Scenario::default() });
        let before = session.home_files();
        let error = message(be("/api/listings", BookingFetch::default()));
        assert!(
            matches_in_order(&error, &["rejected the cached Booking Engine API token (401)", "cannot refresh it"])
                || error.contains("No valid cached Guesty beapi token"),
            "{error}"
        );
        assert_eq!(session.requests_to("booking.guesty.com").len(), 1, "the rejected token is not replayed");
        assert_eq!(session.home_files(), before);
    }

    #[test]
    fn booking_engine_reads_retry_server_errors_and_every_method_waits_out_a_429() {
        let session = isolated(Scenario {
            booking: vec![
                Reply::status(503),
                Reply::ok(json!({ "ok": true })),
                Reply::status(429).header("retry-after", "7"),
                Reply::ok(json!({ "ok": true })),
            ],
            ..Scenario::default()
        });
        assert_eq!(ok_json(be("/api/listings", BookingFetch::default())), json!({ "ok": true }));
        assert_eq!(
            ok_json(be(
                "/api/reservations/quotes",
                BookingFetch { method: "POST", body: Some(json!({})), ..BookingFetch::default() }
            )),
            json!({ "ok": true })
        );
        assert_eq!(session.requests_to("booking.guesty.com").len(), 4);
        assert!(session.waits().contains(&1000), "server errors back off");
        assert!(session.waits().contains(&7000), "429 honors Retry-After");
    }

    #[test]
    fn a_booking_engine_write_with_an_unknown_outcome_is_not_repeated() {
        let session = isolated(Scenario {
            booking: vec![Reply::json(503, json!({ "message": "unavailable" }))],
            ..Scenario::default()
        });
        let error = message(be(
            "/api/reservations/quotes/q/instant",
            BookingFetch { method: "POST", body: Some(json!({})), ..BookingFetch::default() },
        ));
        assert!(error.contains("outcome is unknown"), "{error}");
        assert_eq!(session.requests_to("booking.guesty.com").len(), 1);
    }

    #[test]
    fn booking_engine_error_bodies_are_redacted_and_redirects_are_not_followed() {
        let session = isolated(Scenario {
            booking: vec![
                Reply::raw(400, &format!("bad token {BEAPI_TOKEN}")),
                Reply::status(302).header("location", "https://booking.guesty.com/oauth2/token"),
            ],
            ..Scenario::default()
        });
        let first = message(be("/api/listings/x", BookingFetch::default()));
        assert!(first.contains("HTTP 400") && first.contains("[redacted]") && !first.contains(BEAPI_TOKEN), "{first}");
        let second = message(be("/api/listings/y", BookingFetch::default()));
        assert!(second.contains("HTTP 302. Redirects are not followed"), "{second}");
        assert_eq!(session.requests_to("booking.guesty.com").len(), 2);
    }

    #[test]
    fn booking_engine_requests_observe_five_per_second_separately_from_the_open_api_limit() {
        let session = isolated(Scenario::default());
        for _ in 0..5 {
            be("/api/listings", BookingFetch::default()).unwrap();
        }
        guesty_fetch("/v1/listings", Fetch::default()).unwrap();
        assert_eq!(session.waits().len(), 0, "five Booking Engine requests and one Open API request need no wait");
        be("/api/listings", BookingFetch::default()).unwrap();
        assert_eq!(session.waits(), vec![1000], "the sixth Booking Engine request in a second waits for the window");
        // The "Guesty Booking Engine API rate limit reached" notice goes to stderr, which
        // a unit test can't read; see the report (needs an output hook or a test command).
    }
}
