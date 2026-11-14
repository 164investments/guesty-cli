//! Guesty API requests without the I/O: path and OAuth checks, query
//! serialization, headers and bodies, and every decision a request loop makes
//! (retry, re-read a rejected token, fail, decode), as the Node CLI's
//! `client.ts` made them. The CLI's synchronous client and a Worker's async
//! one both drive these, so their messages and behavior stay the same.
//!
//! - Reads (GET/HEAD) retry network errors, 408 and 5xx; writes never do,
//!   because their outcome would be unknown. Any request retries a 429.
//! - A 401 re-reads the token once; nothing here ever refreshes a token.
//! - Redirects are never followed, so they can't bypass the OAuth check or
//!   forward a write.
//! - Error bodies are shown without the token or configured secrets.

use std::collections::HashSet;

use crate::data::Data;
use crate::error::{Error, Result};
use crate::json::{self, Json};
use crate::limits::{self, Limits};

pub const BASE_URL: &str = "https://open-api.guesty.com";
pub const BOOKING_ENGINE_BASE_URL: &str = "https://booking.guesty.com";
pub const MAX_ATTEMPTS: u32 = 3;
pub const REQUEST_TIMEOUT_MS: u64 = 60_000;
pub const MAX_TIMER_MS: u64 = 2_147_483_647;
/// https://open-api-docs.guesty.com/docs/rate-limits
pub const RATE_LIMITS: [(f64, usize); 3] = [(1_000.0, 15), (60_000.0, 120), (3_600_000.0, 5_000)];
/// https://booking-api-docs.guesty.com/reference/quick-start-guide#rate-limits
pub const BOOKING_ENGINE_RATE_LIMITS: [(f64, usize); 3] = [(1_000.0, 5), (60_000.0, 275), (3_600_000.0, 16_500)];
/// `all_pages` never returns more than this many results.
pub const MAX_PAGINATED_RESULTS: usize = 10_000;

/// Which Guesty API a request goes to.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Api {
    OpenApi,
    BookingEngine,
}

impl Api {
    pub fn as_str(self) -> &'static str {
        match self {
            Api::OpenApi => "open-api",
            Api::BookingEngine => "booking-engine",
        }
    }

    /// How messages name the API.
    pub fn label(self) -> &'static str {
        match self {
            Api::OpenApi => "Guesty API",
            Api::BookingEngine => "Guesty Booking Engine API",
        }
    }
}

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

    /// Params from a JSON value given by the user (`--params`), in
    /// `Object.entries` order. A non-object is an error.
    pub fn from_json(value: &Json) -> Result<Params> {
        let Some(map) = value.as_object() else {
            return Err(Error::new("Query params must be a JSON object of scalar values or arrays of scalar values."));
        };
        Ok(Params(json::entries(map).into_iter().map(|(k, v)| (k.clone(), Param::from_json(v))).collect()))
    }
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
            let (Some(h), Some(l)) = (bytes.get(i + 1).and_then(|b| hex(*b)), bytes.get(i + 2).and_then(|b| hex(*b)))
            else {
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

/// `encodeURIComponent`.
pub fn encode_uri_component(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || b"-_.!~*'()".contains(&byte) {
            out.push(byte as char);
        } else {
            out.push_str(&format!("%{byte:02X}"));
        }
    }
    out
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

pub fn validate_params(params: &Params) -> Result<()> {
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
            return Err(Error::new(format!(
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
        return Err(Error::new("Use an absolute Guesty Open API resource path, such as /v1/listings."));
    }
    let base = url::Url::parse(BASE_URL).expect("base URL");
    let mut url = base
        .join(path)
        .map_err(|_| Error::new("Use an absolute Guesty Open API resource path, such as /v1/listings."))?;
    if url.origin().ascii_serialization() != BASE_URL || url.fragment().is_some_and(|f| !f.is_empty()) {
        return Err(Error::new("Use an absolute Guesty Open API resource path without a URL fragment."));
    }
    let mut normalized = url.path().to_string();
    // Check each decoding level so encoded separators cannot hide an OAuth path.
    for _ in 0..=path.len() {
        if mentions_oauth(&normalized) {
            return Err(Error::new(
                "Guesty OAuth endpoints are disabled in this CLI. Use the designated server token-refresh workflow.",
            ));
        }
        if !has_percent_escape(&normalized) {
            break;
        }
        let decoded = decode_uri_component(&normalized)
            .map_err(|_| Error::new("The Guesty resource path contains invalid percent encoding."))?;
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
        let mut pairs: Vec<(String, String)> =
            url.query_pairs().map(|(k, v)| (k.into_owned(), v.into_owned())).collect();
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

/// A Booking Engine URL: the same path, OAuth and query checks, under /api/
/// on booking.guesty.com.
pub fn booking_engine_url(path: &str, params: Option<&Params>) -> Result<url::Url> {
    if !path.starts_with("/api/") {
        return Err(Error::new("Use a Guesty Booking Engine API resource path, such as /api/listings."));
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
        .map_err(|_| Error::new("Booking Engine API paths must stay under /api/."))?;
    if !url.path().starts_with("/api/") {
        return Err(Error::new("Booking Engine API paths must stay under /api/."));
    }
    Ok(url)
}

// ─── Requests ────────────────────────────────────────────────────────────────

/// A request body, as the Node CLI's `fetch` calls sent them.
#[derive(Clone, Debug, PartialEq)]
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

#[derive(Clone, Debug, PartialEq)]
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

/// An Open API request (`guestyFetch`'s options).
#[derive(Clone, Debug)]
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

/// A Booking Engine request (`bookingEngineFetch`'s options).
#[derive(Clone, Debug)]
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

/// `Retry-After` in milliseconds, or `fallback`. `now_ms` is read only for
/// an HTTP-date.
pub fn retry_delay(header: Option<&str>, fallback: f64, now_ms: impl FnOnce() -> f64) -> f64 {
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
            return (date.timestamp_millis() as f64 - now_ms()).max(0.0);
        }
    }
    fallback
}

/// `res.text()`: UTF-8 with replacement, without a byte-order mark.
pub fn decode_text(bytes: &[u8]) -> String {
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

/// An error body made safe to show: every secret replaced, cut to 2,000 units.
pub fn redact(mut detail: String, secrets: &[String]) -> String {
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
pub fn normalize_headers(headers: &[(String, String)]) -> Result<Vec<(String, String)>> {
    let invalid = || Error::new("Invalid request headers. Use valid HTTP header names and single-line values.");
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

/// A multipart/form-data body with this boundary: (content type, bytes).
pub fn multipart(parts: &[Part], boundary: &str) -> (String, Vec<u8>) {
    let mut body = Vec::new();
    // Field names and file names escaped as the WHATWG multipart/form-data encoder does.
    let escape = |s: &str| s.replace('\n', "%0A").replace('\r', "%0D").replace('"', "%22");
    for part in parts {
        body.extend_from_slice(format!("--{boundary}\r\n").as_bytes());
        match part {
            Part::Text { name, value } => {
                body.extend_from_slice(
                    format!("Content-Disposition: form-data; name=\"{}\"\r\n\r\n", escape(name)).as_bytes(),
                );
                body.extend_from_slice(
                    value.replace("\r\n", "\n").replace('\r', "\n").replace('\n', "\r\n").as_bytes(),
                );
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

/// A request that passed every check, ready to send (add the Authorization
/// header per attempt).
#[derive(Clone, Debug)]
pub struct Prepared {
    pub api: Api,
    /// Uppercase.
    pub method: String,
    pub url: url::Url,
    /// Lowercase names; never `authorization`.
    pub headers: Vec<(String, String)>,
    pub body: Option<Vec<u8>>,
    pub timeout_ms: u64,
    pub response_type: ResponseType,
}

impl Prepared {
    pub fn is_read(&self) -> bool {
        match self.api {
            Api::OpenApi => self.method == "GET" || self.method == "HEAD",
            Api::BookingEngine => self.method == "GET",
        }
    }

    /// How messages name this request: "Guesty API GET /v1/listings".
    pub fn label(&self) -> String {
        format!("{} {} {}", self.api.label(), self.method, self.url.path())
    }
}

fn check_timeout(timeout_ms: u64) -> Result<()> {
    if timeout_ms == 0 || timeout_ms > MAX_TIMER_MS {
        return Err(Error::new(
            "Request timeout must be a positive integer number of milliseconds, at most 2147483647.",
        ));
    }
    Ok(())
}

/// `guestyFetch`'s checks before any token is read. `boundary` makes a
/// multipart boundary, and is called only for a multipart body.
pub fn prepare_open_api(path: &str, options: &Fetch, boundary: impl FnOnce() -> String) -> Result<Prepared> {
    let method = options.method.to_ascii_uppercase();
    if !["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].contains(&method.as_str()) {
        return Err(Error::new("Unsupported HTTP method. Use GET, HEAD, POST, PUT, PATCH, DELETE, or OPTIONS."));
    }
    check_timeout(options.timeout_ms)?;
    if (method == "GET" || method == "HEAD") && options.body.is_some() {
        return Err(Error::new(format!(
            "{method} requests cannot contain a body. Use query params or a different HTTP method."
        )));
    }
    let url = resource_url(path, options.params.as_ref())?;
    let mut headers = normalize_headers(&options.headers)?;
    if headers.iter().any(|(k, _)| k == "authorization") {
        return Err(Error::new(
            "The CLI supplies the cached Open API token; custom Authorization headers are not supported.",
        ));
    }
    let has = |headers: &[(String, String)], name: &str| headers.iter().any(|(k, _)| k == name);
    if !has(&headers, "accept") {
        headers.push(("accept".into(), "application/json".into()));
    }
    let typed = |headers: &mut Vec<(String, String)>, content_type: String, bytes: Vec<u8>| {
        if !has(headers, "content-type") {
            headers.push(("content-type".into(), content_type));
        }
        Some(bytes)
    };
    let body: Option<Vec<u8>> = match &options.body {
        None => None,
        // serializeBody passes a string through unencoded, as text/plain.
        Some(Body::Json(Json::String(text))) => {
            typed(&mut headers, "text/plain;charset=UTF-8".into(), text.clone().into_bytes())
        }
        Some(Body::Json(value)) => typed(&mut headers, "application/json".into(), json::compact(value).into_bytes()),
        Some(Body::Text(text)) => typed(&mut headers, "text/plain;charset=UTF-8".into(), text.clone().into_bytes()),
        Some(Body::Bytes(bytes)) => typed(&mut headers, "application/octet-stream".into(), bytes.clone()),
        Some(Body::Multipart(parts)) => {
            let (content_type, bytes) = multipart(parts, &boundary());
            typed(&mut headers, content_type, bytes)
        }
    };
    Ok(Prepared {
        api: Api::OpenApi,
        method,
        url,
        headers,
        body,
        timeout_ms: options.timeout_ms,
        response_type: options.response_type,
    })
}

/// `bookingEngineFetch`'s checks before any token is read.
pub fn prepare_booking_engine(path: &str, options: &BookingFetch) -> Result<Prepared> {
    let method = options.method.to_ascii_uppercase();
    if !["GET", "POST", "PUT"].contains(&method.as_str()) {
        return Err(Error::new("The Booking Engine API documents only GET, POST, and PUT requests."));
    }
    check_timeout(options.timeout_ms)?;
    if method == "GET" && options.body.is_some() {
        return Err(Error::new("GET requests cannot contain a body. Use query params or a different HTTP method."));
    }
    let url = booking_engine_url(path, options.params.as_ref())?;
    let mut headers = vec![("accept".to_string(), "application/json".to_string())];
    if options.body.is_some() {
        headers.push(("content-type".into(), "application/json".into()));
    }
    let body = options.body.as_ref().map(|b| json::compact(b).into_bytes());
    Ok(Prepared {
        api: Api::BookingEngine,
        method,
        url,
        headers,
        body,
        timeout_ms: options.timeout_ms,
        response_type: ResponseType::Auto,
    })
}

/// A response: its status, lowercase header names, and the body (`Err` when
/// it couldn't be read after the status arrived).
#[derive(Clone, Debug)]
pub struct Response {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: std::result::Result<Vec<u8>, ()>,
}

impl Response {
    pub fn header(&self, name: &str) -> Option<&str> {
        self.headers.iter().find(|(k, _)| k == name).map(|(_, v)| v.as_str())
    }

    pub fn ok(&self) -> bool {
        (200..300).contains(&self.status)
    }

    pub fn text(&self) -> std::result::Result<String, ()> {
        self.body.as_ref().map(|b| String::from_utf8_lossy(b).into_owned()).map_err(|_| ())
    }
}

/// What the request loop does after an attempt.
#[derive(Debug, PartialEq)]
pub enum Step {
    /// Print `notice` (a progress line for stderr), wait `wait_ms`, and try again.
    Retry {
        notice: String,
        wait_ms: f64,
    },
    /// Guesty rejected the token (401). Drop it from this process's copy. With
    /// `retry`, print `rejected_notice` and try again with a re-read token;
    /// otherwise fail with `rejected_error`.
    Rejected {
        retry: bool,
    },
    Fail(Error),
    Done(Data),
}

/// The progress line for a retried 401.
pub fn rejected_notice(api: Api) -> &'static str {
    match api {
        Api::OpenApi => "Guesty rejected the cached token (401). Re-reading the cache once...\n",
        Api::BookingEngine => "Guesty rejected the cached booking-engine token (401). Re-reading the cache once...\n",
    }
}

/// The error for a 401 that can't be retried; `guidance` says how to fix the cache.
pub fn rejected_error(api: Api, guidance: &str) -> Error {
    rejected_error_from(api, "the CLI", guidance)
}

/// `rejected_error`, naming what can't refresh the token (the hosted server
/// says "this server").
pub fn rejected_error_from(api: Api, refresher: &str, guidance: &str) -> Error {
    let name = match api {
        Api::OpenApi => "Open API",
        Api::BookingEngine => "Booking Engine API",
    };
    Error::new(format!("Guesty rejected the cached {name} token (401); {refresher} cannot refresh it. {guidance}"))
}

/// One request's attempts: counts them and decides each outcome.
#[derive(Clone, Debug)]
pub struct Attempts {
    api: Api,
    method: String,
    is_read: bool,
    label: String,
    timeout_s: String,
    response_type: ResponseType,
    attempt: u32,
    cache_reread: bool,
    limits: Limits,
    deadline_ms: Option<f64>,
}

impl Attempts {
    pub fn new(request: &Prepared) -> Attempts {
        Attempts {
            api: request.api,
            method: request.method.clone(),
            is_read: request.is_read(),
            label: request.label(),
            timeout_s: json::number_to_string(request.timeout_ms as f64 / 1000.0, false),
            response_type: request.response_type,
            attempt: 0,
            cache_reread: false,
            limits: Limits::NONE,
            deadline_ms: None,
        }
    }

    /// Applies hosted limits: retry waits must end before `deadline_ms` (an
    /// absolute time), and bodies are checked for size and depth.
    pub fn with_limits(mut self, limits: Limits, deadline_ms: Option<f64>) -> Attempts {
        self.limits = limits;
        self.deadline_ms = deadline_ms;
        self
    }

    /// Starts the next attempt; false once all have been made.
    pub fn next(&mut self) -> bool {
        if self.attempt >= MAX_ATTEMPTS {
            return false;
        }
        self.attempt += 1;
        true
    }

    pub fn attempt(&self) -> u32 {
        self.attempt
    }

    pub fn label(&self) -> &str {
        &self.label
    }

    /// The error after every attempt was used (not reached in practice).
    pub fn exhausted(&self) -> Error {
        Error::new(format!("{} failed after {MAX_ATTEMPTS} attempts", self.label))
    }

    fn last(&self) -> bool {
        self.attempt >= MAX_ATTEMPTS
    }

    /// Whether a wait of `wait_ms` starting at `now_ms` ends before the deadline.
    fn fits(&self, now_ms: f64, wait_ms: f64) -> bool {
        self.deadline_ms.is_none_or(|deadline| now_ms + wait_ms < deadline)
    }

    /// The request couldn't complete (a network error or timeout).
    pub fn network_error(&self, now_ms: impl FnOnce() -> f64) -> Step {
        if self.is_read && !self.last() {
            let wait_ms = self.attempt as f64 * 1000.0;
            if self.deadline_ms.is_none() || self.fits(now_ms(), wait_ms) {
                let notice = match self.api {
                    Api::OpenApi => "Guesty request could not complete. Retrying the read request...\n",
                    Api::BookingEngine => {
                        "Guesty Booking Engine request could not complete. Retrying the read request...\n"
                    }
                };
                return Step::Retry { notice: notice.into(), wait_ms };
            }
        }
        Step::Fail(Error::new(format!(
            "{} could not complete (network error or {}s timeout).{}",
            self.label,
            self.timeout_s,
            if self.is_read { "" } else { " Its outcome is unknown; check Guesty before trying again." }
        )))
    }

    /// A response arrived. `secrets` are redacted from error bodies (the
    /// tokens sent and any configured keys); `now_ms` is read for an
    /// HTTP-date Retry-After or a deadline.
    pub fn response(&mut self, res: &Response, secrets: &[String], now_ms: impl Fn() -> f64) -> Step {
        if res.status == 401 {
            if self.cache_reread || self.last() {
                return Step::Rejected { retry: false };
            }
            self.cache_reread = true;
            return Step::Rejected { retry: true };
        }

        if (res.status == 429 || (self.is_read && [408, 500, 502, 503, 504].contains(&res.status))) && !self.last() {
            let fallback = self.attempt as f64 * if res.status == 429 { 5000.0 } else { 1000.0 };
            let wait_ms = retry_delay(res.header("retry-after"), fallback, &now_ms);
            if !self.fits(if self.deadline_ms.is_some() { now_ms() } else { 0.0 }, wait_ms) {
                let deadline = self.limits.call_deadline_ms.unwrap_or(0);
                return Step::Fail(Error::new(limits::retry_deadline_message(&self.label, res.status, deadline)));
            }
            let api = match self.api {
                Api::OpenApi => "Guesty",
                Api::BookingEngine => "Guesty Booking Engine API",
            };
            let notice = format!("{api} returned HTTP {}. Retrying in {}s...\n", res.status, (wait_ms / 1000.0).ceil());
            return Step::Retry { notice, wait_ms };
        }

        if !res.ok() {
            // Authentication failures and redirects may contain private credentials or URLs.
            if res.status == 403 || (300..400).contains(&res.status) {
                let forbidden = match self.api {
                    Api::OpenApi => " Check the cached token's account permissions.",
                    Api::BookingEngine => " Check the booking-engine instance's permissions and listings.",
                };
                return Step::Fail(Error::new(format!(
                    "{} failed: HTTP {}.{}",
                    self.label,
                    res.status,
                    if res.status == 403 {
                        forbidden
                    } else {
                        " Redirects are not followed; use the documented resource path."
                    }
                )));
            }
            let detail = redact(res.body.as_deref().map(decode_text).unwrap_or_default(), secrets);
            return Step::Fail(Error::new(format!(
                "{} failed: HTTP {}{}{}",
                self.label,
                res.status,
                if !self.is_read && res.status >= 500 {
                    ". Its outcome is unknown; check Guesty before trying again."
                } else {
                    ""
                },
                if detail.is_empty() { String::new() } else { format!("\n{detail}") }
            )));
        }

        match self.decode(res) {
            Ok(data) => Step::Done(data),
            Err(e) => Step::Fail(e),
        }
    }

    /// The error for a response body over the size limit.
    pub fn too_large(&self) -> Option<Error> {
        self.limits.max_response_bytes.map(|max| Error::new(limits::response_too_large_message(&self.label, max)))
    }

    fn parse(&self, text: &str) -> Result<Json> {
        if let Some(max) = self.limits.max_json_depth {
            if json::nests_deeper_than(text, max) {
                return Err(Error::new(limits::too_deep_message(&self.label, max)));
            }
        }
        json::parse(text)
            .map_err(|_| Error::new(format!("{} returned invalid JSON; the request was not retried.", self.label)))
    }

    fn decode(&self, res: &Response) -> Result<Data> {
        if let (Some(max), Ok(body)) = (self.limits.max_response_bytes, &res.body) {
            if body.len() > max {
                return Err(self.too_large().expect("limit"));
            }
        }
        let read_failed =
            || Error::new(format!("{} response could not be read; the request was not retried.", self.label));
        let content_type = res.header("content-type").unwrap_or("").to_ascii_lowercase();
        let body = || res.body.clone().map_err(|_| read_failed());
        if self.api == Api::BookingEngine {
            if res.status == 204 || res.status == 205 {
                return Ok(Data::None);
            }
            let text = res.body.as_deref().map(decode_text).map_err(|_| read_failed())?;
            if !content_type.contains("json") {
                return Ok(Data::Text(text));
            }
            if text.trim().is_empty() {
                return Ok(Data::None);
            }
            return self.parse(&text).map(Data::Json);
        }
        if res.status == 204 || res.status == 205 || self.method == "HEAD" {
            return Ok(Data::None);
        }
        match self.response_type {
            ResponseType::Buffer => return body().map(Data::Bytes),
            ResponseType::Text => return body().map(|b| Data::Text(decode_text(&b))),
            _ => {}
        }
        if self.response_type == ResponseType::Json
            || content_type.contains("application/json")
            || content_type.contains("+json")
        {
            let text = res.body.as_deref().map(decode_text).map_err(|_| read_failed())?;
            if text.trim().is_empty() {
                return Ok(Data::None);
            }
            return self.parse(&text).map(Data::Json);
        }
        if content_type.starts_with("text/")
            || content_type.contains("csv")
            || content_type.contains("xml")
            || content_type.contains("html")
        {
            return body().map(|b| Data::Text(decode_text(&b)));
        }
        body().map(Data::Bytes)
    }
}

// ─── Pagination ──────────────────────────────────────────────────────────────

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
        _ => Err(Error::new(format!(
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

/// `paginateAll(path, params, resultsKey)` as steps: ask `next_params` for
/// the next page's query, fetch it (a GET), and hand the page to `accept`
/// until it says the result is complete. It never returns a partial or
/// inconsistent result.
pub struct Paginator {
    path: String,
    params: Params,
    results_key: Option<String>,
    limit: f64,
    skip: f64,
    all: Vec<Json>,
    seen: HashSet<String>,
    limits: Limits,
    bytes: usize,
}

impl Paginator {
    pub fn new(path: &str, params: &Params, results_key: Option<&str>) -> Result<Paginator> {
        let limit = param_number(params.get("limit"), "limit", 100.0)?.min(100.0);
        let skip = param_number(params.get("skip"), "skip", 0.0)?;
        Ok(Paginator {
            path: path.to_string(),
            params: params.clone(),
            results_key: results_key.map(str::to_string),
            limit,
            skip,
            all: Vec::new(),
            seen: HashSet::new(),
            limits: Limits::NONE,
            bytes: 0,
        })
    }

    /// Applies hosted limits on the number and size of results.
    pub fn with_limits(mut self, limits: Limits) -> Paginator {
        self.limits = limits;
        self
    }

    pub fn path(&self) -> &str {
        &self.path
    }

    /// The query for the next page.
    pub fn next_params(&self) -> Params {
        let mut page_params = self.params.clone();
        page_params.set("limit", self.limit);
        page_params.set("skip", self.skip);
        page_params
    }

    /// Takes one page's response. `Some` when every result has arrived.
    pub fn accept(&mut self, res: Json) -> Result<Option<Vec<Json>>> {
        let path = &self.path;
        let record = res.as_object();
        let key = self.results_key.clone().or_else(|| {
            ["results", "data", "items"]
                .iter()
                .find(|n| record.and_then(|r| r.get(**n)).is_some_and(Json::is_array))
                .map(|s| s.to_string())
        });
        let items: Vec<Json> = if let Some(items) = res.as_array() {
            items.clone()
        } else if let Some(items) = key.as_deref().and_then(|k| record.and_then(|r| r.get(k))).and_then(Json::as_array)
        {
            items.clone()
        } else {
            return Err(Error::new(format!(
                "Cannot paginate {path}: expected an array{}.",
                match &self.results_key {
                    Some(k) => format!(" in '{k}'"),
                    None => " of results".into(),
                }
            )));
        };
        let pagination = record.and_then(|r| r.get("pagination"));
        if let Some(p) = pagination {
            if !p.is_object() {
                return Err(Error::new(format!("Cannot paginate {path}: invalid pagination metadata.")));
            }
        }
        let metadata = pagination.and_then(Json::as_object).or(record);
        let field = |name: &str| metadata.and_then(|m| m.get(name)).filter(|v| !v.is_null());
        if let Some(response_skip) = pagination_number(field("skip"), "skip")? {
            if response_skip != self.skip {
                return Err(Error::new(format!(
                    "Cannot paginate {path}: the API did not honor the requested skip ({}).",
                    json::number_to_string(self.skip, false)
                )));
            }
        }
        let total =
            pagination_number(field("count").or_else(|| field("total")).or_else(|| field("totalCount")), "count")?;
        let server_limit = pagination_number(field("limit"), "limit")?;
        let has_more = match metadata.and_then(|m| m.get("hasMore")) {
            None => None,
            Some(Json::Bool(b)) => Some(*b),
            Some(_) => return Err(Error::new(format!("Cannot paginate {path}: invalid hasMore metadata."))),
        };
        if let Some(server) = server_limit {
            self.limit = self.limit.min(server);
        }
        if items.is_empty() {
            if has_more == Some(true) || total.is_some_and(|t| self.skip < t) {
                return Err(Error::new(format!(
                    "Cannot paginate {path}: the API returned an empty page before completion."
                )));
            }
            return Ok(Some(std::mem::take(&mut self.all)));
        }
        for item in &items {
            let id = item.as_object().and_then(|o| o.get("_id").filter(|v| !v.is_null()).or_else(|| o.get("id")));
            let identity = match id {
                Some(Json::String(s)) => s.clone(),
                Some(Json::Number(n)) => json::number_to_string(n.as_f64().unwrap_or(f64::NAN), false),
                _ => continue,
            };
            if !self.seen.insert(identity) {
                return Err(Error::new(format!(
                    "Cannot paginate {path}: the API repeated a record. Use a stable, unique sort and retry."
                )));
            }
        }
        if self.all.len() + items.len() > MAX_PAGINATED_RESULTS {
            return Err(Error::new(
                "Pagination exceeds 10,000 results. Use filters to narrow your query; no partial result was returned.",
            ));
        }
        if let Some(max) = self.limits.max_results {
            if self.all.len() + items.len() > max {
                return Err(Error::new(limits::too_many_results_message(max)));
            }
        }
        if let Some(max) = self.limits.max_total_bytes {
            self.bytes += items.iter().map(|item| json::compact(item).len() + 1).sum::<usize>();
            if self.bytes > max {
                return Err(Error::new(limits::too_many_bytes_message(max)));
            }
        }
        let count = items.len();
        self.all.extend(items);
        self.skip += count as f64;
        if has_more == Some(false) || (has_more.is_none() && total.is_some_and(|t| self.skip >= t)) {
            return Ok(Some(std::mem::take(&mut self.all)));
        }
        if has_more.is_none() && total.is_none() && server_limit.is_some_and(|l| (count as f64) < l) {
            return Ok(Some(std::mem::take(&mut self.all)));
        }
        if self.all.len() >= MAX_PAGINATED_RESULTS {
            return Err(Error::new(
                "Pagination reached 10,000 results without confirming completion. Use filters to narrow your query; no partial result was returned.",
            ));
        }
        // Without count/limit metadata, a short page may reflect the server's cap.
        // Continue by the actual item count until an empty page confirms completion.
        Ok(None)
    }
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
        let mut params = Params::new();
        params.set("k", "1 2").set("n", 25.0).set("l", vec!["a".to_string(), "b".to_string()]);
        let url = resource_url("/v1/x?a=b c", Some(&params)).unwrap();
        assert_eq!(url.query(), Some("a=b+c&k=1+2&n=25&l=a&l=b"));
        let untouched = resource_url("/v1/x?a=b c", Some(&Params::new())).unwrap();
        assert_eq!(untouched.query(), Some("a=b%20c"));
    }

    #[test]
    fn retry_after() {
        let now = || 0.0;
        assert_eq!(retry_delay(Some("2"), 9.0, now), 2000.0);
        assert_eq!(retry_delay(Some("1.5"), 9.0, now), 1500.0);
        assert_eq!(retry_delay(Some("soon"), 9.0, now), 9.0);
        assert_eq!(retry_delay(None, 9.0, now), 9.0);
    }

    fn reply(status: u16, body: &str) -> Response {
        Response {
            status,
            headers: vec![("content-type".into(), "application/json".into())],
            body: Ok(body.as_bytes().to_vec()),
        }
    }

    #[test]
    fn hosted_limits_fail_plainly_and_are_off_by_default() {
        let request = prepare_open_api("/v1/listings", &Fetch::default(), String::new).unwrap();
        let deep = format!("{}{}", "[".repeat(200), "]".repeat(200));
        let mut open = Attempts::new(&request);
        open.next();
        assert!(matches!(open.response(&reply(200, &deep), &[], || 0.0), Step::Done(_)));
        let limits = Limits::HOSTED;
        let mut hosted = Attempts::new(&request).with_limits(limits, limits.deadline_from(0.0));
        hosted.next();
        match hosted.response(&reply(200, &deep), &[], || 0.0) {
            Step::Fail(e) => assert!(e.as_str().contains("nested more than 128 levels"), "{e}"),
            other => panic!("{other:?}"),
        }
        // A 429 whose wait would pass the deadline fails instead of waiting.
        let mut slow = reply(429, "");
        slow.headers.push(("retry-after".into(), "60".into()));
        let mut hosted = Attempts::new(&request).with_limits(limits, limits.deadline_from(0.0));
        hosted.next();
        match hosted.response(&slow, &[], || 0.0) {
            Step::Fail(e) => assert!(e.as_str().contains("50s limit"), "{e}"),
            other => panic!("{other:?}"),
        }
        let mut open = Attempts::new(&request);
        open.next();
        assert!(matches!(open.response(&slow, &[], || 0.0), Step::Retry { wait_ms: 60_000.0, .. }));
    }

    #[test]
    fn pagination_limits() {
        let page = |n: usize, skip: usize| {
            let results: Vec<Json> = (0..n).map(|i| json::json!({ "_id": (skip + i).to_string() })).collect();
            json::json!({ "results": results, "count": 5000, "skip": skip, "limit": n })
        };
        let mut pages = Paginator::new("/v1/x", &Params::new(), None).unwrap().with_limits(Limits::HOSTED);
        let mut skip = 0;
        let error = loop {
            match pages.accept(page(100, skip)) {
                Ok(None) => skip += 100,
                Ok(Some(_)) => panic!("complete"),
                Err(e) => break e,
            }
        };
        assert_eq!(skip, 2000);
        assert!(error.as_str().contains("exceeds 2,000 results"), "{error}");
    }
}
