//! The OAuth rules, as pure functions: redirect URIs (S1), PKCE, dynamic registration, client ID
//! metadata documents (S4, S11), the signed pending request, the `/mcp` Origin check (S10) and the
//! sign-in credential.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use url::Url;

use crate::crypto::{Keys, constant_time_eq, s256};

pub const MAX_REDIRECT_URIS: usize = 10;
pub const MAX_URI_LENGTH: usize = 2000;
pub const MAX_STATE_LENGTH: usize = 2048;
/// The sign-in page's pending request lasts 10 minutes.
pub const PENDING_TTL_MS: i64 = 10 * 60_000;

/// Client ID metadata documents are fetched only from these origins (S4). Any other app uses
/// dynamic client registration.
pub const CIMD_ORIGINS: &[&str] = &["https://claude.ai", "https://chatgpt.com"];
pub const CIMD_TIMEOUT_MS: i64 = 2_000;
pub const CIMD_MAX_BYTES: usize = 64 * 1024;

/// Browser origins `/mcp` accepts (S10), besides loopback http origins for local inspectors.
pub const MCP_ORIGINS: &[&str] = &["https://claude.ai", "https://chatgpt.com"];

fn is_loopback_host(host: &str) -> bool {
    matches!(host, "localhost" | "127.0.0.1" | "[::1]")
}

/// Schemes a private-use redirect URI can't have: ones a browser runs, reads or shows itself.
/// http and https keep their own rules.
const UNSAFE_SCHEMES: &[&str] =
    &["javascript", "data", "file", "blob", "vbscript", "about", "view-source", "filesystem", "http", "https"];

/// Whether `scheme` (as the URL parser lowercased it) is a private-use scheme a desktop app can
/// claim, such as `cursor` (RFC 8252 §7.1).
pub fn is_private_use_scheme(scheme: &str) -> bool {
    !scheme.is_empty() && !UNSAFE_SCHEMES.contains(&scheme)
}

/// Whether `uri` may be registered as a redirect URI: https anywhere, http on a loopback host
/// (RFC 8252 §7.3), and, when `private_schemes` is on (dynamic registration), a private-use
/// scheme such as `cursor://anysphere.cursor-mcp/oauth/callback` (RFC 8252 §7.1). No fragment and
/// no user info.
pub fn validate_redirect_uri(uri: &str, private_schemes: bool) -> Result<(), &'static str> {
    if uri.len() > MAX_URI_LENGTH {
        return Err("A redirect URI is too long.");
    }
    let parsed = Url::parse(uri).map_err(|_| "A redirect URI isn't a valid absolute URL.")?;
    if parsed.fragment().is_some() || uri.contains('#') {
        return Err("A redirect URI can't have a fragment.");
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("A redirect URI can't contain a user name or password.");
    }
    let host = parsed.host_str().unwrap_or_default();
    match parsed.scheme() {
        "https" if !host.is_empty() => Ok(()),
        "http" if is_loopback_host(host) => Ok(()),
        "http" => Err("An http redirect URI must use localhost, 127.0.0.1 or [::1]; anything else must use https."),
        scheme if private_schemes && is_private_use_scheme(scheme) => {
            // `app:/path` or `app://host/path`; not an opaque `app:anything`.
            if parsed.cannot_be_a_base() {
                return Err("A desktop app's redirect URI needs a path, such as myapp://callback or myapp:/callback.");
            }
            Ok(())
        }
        _ if private_schemes => {
            Err("Redirect URIs must use https, http on localhost, 127.0.0.1 or [::1], or a desktop app's own scheme.")
        }
        _ => Err("Redirect URIs must use https, or http on localhost, 127.0.0.1 or [::1]."),
    }
}

/// Whether `requested` matches `registered` (S1): exactly, or, for a registered loopback http URI,
/// with any port (RFC 8252 §8.4). Scheme, host, path and query stay exact, and the requested URI
/// must already be in canonical form, so it is the same string the browser will be sent to.
pub fn redirect_matches(registered: &str, requested: &str) -> bool {
    if registered == requested {
        return true;
    }
    let (Ok(reg), Ok(req)) = (Url::parse(registered), Url::parse(requested)) else {
        return false;
    };
    if reg.scheme() != "http" || !is_loopback_host(reg.host_str().unwrap_or_default()) {
        return false;
    }
    req.as_str() == requested
        && req.scheme() == "http"
        && req.host_str() == reg.host_str()
        && req.path() == reg.path()
        && req.query() == reg.query()
        && req.fragment().is_none()
        && req.username().is_empty()
        && req.password().is_none()
}

/// The registered URI `requested` matches, if any. The URI bound to the code is `requested` itself.
pub fn find_redirect<'a>(registered: &'a [String], requested: &str) -> Option<&'a str> {
    if requested.contains('#') || requested.len() > MAX_URI_LENGTH {
        return None;
    }
    registered.iter().map(String::as_str).find(|r| redirect_matches(r, requested))
}

/// Where a redirect URI goes back to, as the sign-in page shows it: the host (with any port), or
/// for a private-use scheme, which any installed app can claim, "a desktop app (cursor://…)".
pub fn redirect_host(uri: &str) -> String {
    let Ok(parsed) = Url::parse(uri) else {
        return String::new();
    };
    if !matches!(parsed.scheme(), "http" | "https") {
        let separator = if uri[parsed.scheme().len()..].starts_with("://") { "://" } else { ":" };
        return format!("a desktop app ({}{separator}…)", parsed.scheme());
    }
    parsed
        .host_str()
        .map(|h| match parsed.port() {
            Some(port) => format!("{h}:{port}"),
            None => h.to_string(),
        })
        .unwrap_or_default()
}

/// The sign-in page's `form-action` source for where its redirect lands (browsers apply
/// form-action to the redirect that follows the post): the origin of an http(s) URI, or exactly
/// the scheme (`cursor:`) of a private-use one.
pub fn form_action_source(uri: &str) -> Option<String> {
    let parsed = Url::parse(uri).ok()?;
    if is_private_use_scheme(parsed.scheme()) {
        // The parser allows only ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ), so it can't break out
        // of the header.
        return Some(format!("{}:", parsed.scheme()));
    }
    let origin = parsed.origin();
    origin.is_tuple().then(|| origin.ascii_serialization())
}

fn is_base64url(value: &str) -> bool {
    value.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// An S256 challenge is base64url of 32 bytes: 43 characters.
pub fn valid_challenge(challenge: &str) -> bool {
    challenge.len() == 43 && is_base64url(challenge)
}

/// RFC 7636 §4.1: 43 to 128 unreserved characters.
pub fn valid_verifier(verifier: &str) -> bool {
    (43..=128).contains(&verifier.len())
        && verifier.bytes().all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'.' | b'_' | b'~'))
}

pub fn pkce_matches(verifier: &str, challenge: &str) -> bool {
    valid_verifier(verifier) && constant_time_eq(s256(verifier).as_bytes(), challenge.as_bytes())
}

/// What `/authorize` checks about PKCE: S256 only, with a well-formed challenge.
pub fn check_pkce(challenge: Option<&str>, method: Option<&str>) -> Result<String, &'static str> {
    let challenge = challenge.filter(|c| !c.is_empty()).ok_or("code_challenge is required (PKCE with S256).")?;
    match method {
        Some("S256") => {}
        None | Some("") => return Err("code_challenge_method must be S256."),
        Some(_) => return Err("Only the S256 code_challenge_method is supported."),
    }
    if !valid_challenge(challenge) {
        return Err("code_challenge must be 43 base64url characters.");
    }
    Ok(challenge.to_string())
}

/// `resource` on an authorization or token request (RFC 8707): absent, or this server's MCP URL.
pub fn resource_ok(given: Option<&str>, expected: &str) -> bool {
    match given {
        None => true,
        Some(value) => value == expected,
    }
}

/// Removes control, zero-width and text-direction characters and collapses spaces, so an app
/// name shows as plain text. At most `max` characters.
pub fn clean_text(value: &str, max: usize) -> String {
    let mut out = String::new();
    let mut space = false;
    for ch in value.chars() {
        let invisible = ch.is_control()
            || matches!(ch, '\u{200B}'..='\u{200F}' | '\u{202A}'..='\u{202E}' | '\u{2060}'..='\u{2069}' | '\u{FEFF}' | '\u{061C}' | '\u{180E}');
        if invisible {
            continue;
        }
        if ch.is_whitespace() {
            space = !out.is_empty();
            continue;
        }
        if space {
            out.push(' ');
            space = false;
        }
        out.push(ch);
    }
    out.chars().take(max).collect()
}

/// An app as the sign-in page and the token endpoint see it.
#[derive(Clone, Debug, PartialEq)]
pub struct ClientInfo {
    pub client_id: String,
    /// As the app reported it; never verified.
    pub client_name: Option<String>,
    pub redirect_uris: Vec<String>,
    /// For a metadata-document client, the origin its document was fetched from.
    pub verified_origin: Option<String>,
}

#[derive(Debug, PartialEq)]
pub struct RegistrationError {
    pub code: &'static str,
    pub description: String,
}

fn reg_error(code: &'static str, description: impl Into<String>) -> RegistrationError {
    RegistrationError { code, description: description.into() }
}

fn string_list<'a>(value: Option<&'a Value>, field: &str) -> Result<Option<Vec<&'a str>>, RegistrationError> {
    match value {
        None | Some(Value::Null) => Ok(None),
        Some(Value::Array(items)) => items
            .iter()
            .map(|item| {
                item.as_str()
                    .ok_or_else(|| reg_error("invalid_client_metadata", format!("{field} must be a list of strings.")))
            })
            .collect::<Result<Vec<_>, _>>()
            .map(Some),
        Some(_) => Err(reg_error("invalid_client_metadata", format!("{field} must be a list of strings."))),
    }
}

fn redirect_list(doc: &Value, private_schemes: bool) -> Result<Vec<String>, RegistrationError> {
    let uris = string_list(doc.get("redirect_uris"), "redirect_uris")?.unwrap_or_default();
    if uris.is_empty() {
        return Err(reg_error("invalid_redirect_uri", "redirect_uris needs at least one URI."));
    }
    if uris.len() > MAX_REDIRECT_URIS {
        return Err(reg_error(
            "invalid_redirect_uri",
            format!("At most {MAX_REDIRECT_URIS} redirect URIs are allowed."),
        ));
    }
    for uri in &uris {
        validate_redirect_uri(uri, private_schemes).map_err(|message| reg_error("invalid_redirect_uri", message))?;
    }
    Ok(uris.into_iter().map(str::to_string).collect())
}

fn client_name(doc: &Value) -> Option<String> {
    doc.get("client_name").and_then(Value::as_str).map(|n| clean_text(n, 100)).filter(|n| !n.is_empty())
}

/// A dynamic client registration request (RFC 7591): public clients only. Desktop apps may use
/// their own URI scheme for redirects (Cursor's is `cursor://`).
pub fn parse_registration(doc: &Value) -> Result<(Option<String>, Vec<String>), RegistrationError> {
    if !doc.is_object() {
        return Err(reg_error("invalid_client_metadata", "The registration request must be a JSON object."));
    }
    let redirect_uris = redirect_list(doc, true)?;
    match doc.get("token_endpoint_auth_method") {
        None | Some(Value::Null) => {}
        Some(Value::String(method)) if method == "none" => {}
        Some(_) => {
            return Err(reg_error(
                "invalid_client_metadata",
                "Only public clients can register: token_endpoint_auth_method must be none.",
            ));
        }
    }
    if let Some(grants) = string_list(doc.get("grant_types"), "grant_types")?
        && grants.iter().any(|g| !matches!(*g, "authorization_code" | "refresh_token"))
    {
        return Err(reg_error(
            "invalid_client_metadata",
            "grant_types may only be authorization_code and refresh_token.",
        ));
    }
    if let Some(types) = string_list(doc.get("response_types"), "response_types")?
        && types.iter().any(|t| *t != "code")
    {
        return Err(reg_error("invalid_client_metadata", "response_types may only be code."));
    }
    Ok((client_name(doc), redirect_uris))
}

/// The URL to fetch for a client ID that is a metadata-document URL, if its origin is allowed (S4).
pub fn cimd_url(client_id: &str) -> Option<Url> {
    if client_id.len() > MAX_URI_LENGTH || !client_id.starts_with("https://") {
        return None;
    }
    let url = Url::parse(client_id).ok()?;
    // The ID is compared to the document's as a string, so it must be canonical.
    if url.as_str() != client_id
        || url.scheme() != "https"
        || url.port().is_some()
        || url.fragment().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() == "/"
    {
        return None;
    }
    let origin = url.origin().ascii_serialization();
    CIMD_ORIGINS.contains(&origin.as_str()).then_some(url)
}

/// Whether a client ID is a metadata-document URL at all (allowed or not).
pub fn is_url_client_id(client_id: &str) -> bool {
    client_id.starts_with("https://") || client_id.starts_with("http://")
}

/// S11: a document is acceptable when `none` is among its token endpoint auth methods, whether
/// they come from the plural `token_endpoint_auth_methods_supported` or the singular
/// `token_endpoint_auth_method`, and whatever the singular field prefers.
pub fn accepts_public_auth(doc: &Value) -> bool {
    let plural = doc
        .get("token_endpoint_auth_methods_supported")
        .and_then(Value::as_array)
        .map(|methods| methods.iter().any(|m| m.as_str() == Some("none")))
        .unwrap_or(false);
    let singular = doc.get("token_endpoint_auth_method").and_then(Value::as_str) == Some("none");
    plural || singular
}

/// Validates a fetched client ID metadata document.
pub fn validate_cimd(client_id: &str, doc: &Value) -> Result<ClientInfo, &'static str> {
    if !doc.is_object() {
        return Err("The app's client metadata isn't a JSON object.");
    }
    if doc.get("client_id").and_then(Value::as_str) != Some(client_id) {
        return Err("The app's client metadata names a different client ID.");
    }
    if doc.get("client_secret").is_some() || doc.get("client_secret_expires_at").is_some() {
        return Err("The app's client metadata contains a client secret.");
    }
    if !accepts_public_auth(doc) {
        return Err("The app's client metadata doesn't allow the none token endpoint auth method.");
    }
    let redirect_uris =
        redirect_list(doc, false).map_err(|_| "The app's client metadata has missing or invalid redirect URIs.")?;
    if let Some(Value::Array(grants)) = doc.get("grant_types")
        && !grants.iter().any(|g| g.as_str() == Some("authorization_code"))
    {
        return Err("The app's client metadata doesn't use the authorization_code grant.");
    }
    if let Some(Value::Array(types)) = doc.get("response_types")
        && !types.iter().any(|t| t.as_str() == Some("code"))
    {
        return Err("The app's client metadata doesn't use the code response type.");
    }
    let origin = Url::parse(client_id).map(|u| u.origin().ascii_serialization()).ok();
    Ok(ClientInfo {
        client_id: client_id.to_string(),
        client_name: client_name(doc),
        redirect_uris,
        verified_origin: origin,
    })
}

/// S10: `/mcp` accepts no `Origin` (server-side clients), the known client origins, and loopback
/// http origins with any port.
pub fn origin_allowed(origin: Option<&str>) -> bool {
    let Some(origin) = origin else {
        return true;
    };
    if MCP_ORIGINS.contains(&origin) {
        return true;
    }
    let Ok(parsed) = Url::parse(origin) else {
        return false;
    };
    parsed.scheme() == "http"
        && is_loopback_host(parsed.host_str().unwrap_or_default())
        && parsed.path() == "/"
        && parsed.query().is_none()
        && parsed.origin().ascii_serialization() == origin
}

/// The authorization request the sign-in page carries in a signed field, so the Worker keeps no
/// session and sets no cookie.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Pending {
    #[serde(rename = "c")]
    pub client_id: String,
    #[serde(rename = "n", default, skip_serializing_if = "Option::is_none")]
    pub client_name: Option<String>,
    #[serde(rename = "o", default, skip_serializing_if = "Option::is_none")]
    pub verified_origin: Option<String>,
    #[serde(rename = "r")]
    pub redirect_uri: String,
    #[serde(rename = "s", default, skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
    #[serde(rename = "p")]
    pub code_challenge: String,
    #[serde(rename = "x")]
    pub resource: String,
    #[serde(rename = "e")]
    pub expires_at: i64,
}

impl Pending {
    pub fn sign(&self, keys: &Keys) -> String {
        keys.sign(&serde_json::to_vec(self).expect("serializable"))
    }

    /// The pending request in a signed field, if the field is untouched and less than 10 minutes old.
    pub fn verify(keys: &Keys, field: &str, now_ms: i64) -> Result<Pending, &'static str> {
        let payload = keys.verify(field).ok_or("tampered")?;
        let pending: Pending = serde_json::from_slice(&payload).map_err(|_| "tampered")?;
        if pending.expires_at <= now_ms {
            return Err("expired");
        }
        Ok(pending)
    }
}

/// What the person pasted on the sign-in page.
#[derive(Debug, PartialEq)]
pub enum Credential {
    /// An existing member access key, `gts_` and 43 base64url characters.
    AccessKey(String),
    /// An invite code, as typed (the token service normalizes it).
    Invite(String),
}

pub fn is_access_key(value: &str) -> bool {
    value.len() == 47 && value.starts_with("gts_") && is_base64url(&value[4..])
}

/// Reads an invite code, an invite link (`https://<token service>/join/<code>`), the
/// `guesty join …` command an invite prints, or an access key.
pub fn parse_credential(input: &str, token_service_origins: &[String]) -> Result<Credential, &'static str> {
    let mut value = input.trim().trim_matches(|c| c == '"' || c == '\'' || c == '`').trim();
    if value.get(..12).is_some_and(|prefix| prefix.eq_ignore_ascii_case("guesty join ")) {
        value = value[12..].trim();
    }
    if value.is_empty() {
        return Err("Paste your invite code, invite link or access key.");
    }
    if value.len() > 500 {
        return Err("That's too long to be an invite or an access key.");
    }
    if is_access_key(value) {
        return Ok(Credential::AccessKey(value.to_string()));
    }
    if value.starts_with("gts_") {
        return Err("That access key isn't complete. Copy the whole key, gts_ and 43 more characters.");
    }
    if value.starts_with("http://") || value.starts_with("https://") {
        let url = Url::parse(value).map_err(|_| "That link isn't valid. Copy the whole invite link.")?;
        let origin = url.origin().ascii_serialization();
        if !token_service_origins.contains(&origin) {
            return Err("That link isn't an invite from the team token service this server uses.");
        }
        let segments: Vec<&str> =
            url.path_segments().map(|s| s.filter(|p| !p.is_empty()).collect()).unwrap_or_default();
        return match segments.as_slice() {
            ["join", code] => {
                let decoded: String = url::form_urlencoded::parse(format!("c={code}").as_bytes())
                    .next()
                    .map(|(_, v)| v.into_owned())
                    .unwrap_or_default();
                invite_code(&decoded)
            }
            _ => Err("That link isn't an invite link. Invite links end in /join/ and a code."),
        };
    }
    invite_code(value)
}

fn invite_code(value: &str) -> Result<Credential, &'static str> {
    let ok = !value.is_empty()
        && value.len() <= 40
        && value.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == ' ');
    if ok {
        Ok(Credential::Invite(value.to_string()))
    } else {
        Err("That isn't an invite code. Invite codes look like ABCD-EFGH-JKMN.")
    }
}

/// Appends authorization-response parameters to a redirect URI that may already have a query.
pub fn redirect_with(redirect_uri: &str, params: &[(&str, &str)]) -> String {
    let mut serializer = url::form_urlencoded::Serializer::new(String::new());
    for (name, value) in params {
        serializer.append_pair(name, value);
    }
    let query = serializer.finish();
    let separator = if redirect_uri.contains('?') { '&' } else { '?' };
    format!("{redirect_uri}{separator}{query}")
}

/// Reads `application/x-www-form-urlencoded` (or a query string). A parameter sent twice is an
/// error (RFC 6749 §3.1).
pub fn parse_form(body: &str) -> Result<Vec<(String, String)>, &'static str> {
    let mut seen: Vec<(String, String)> = Vec::new();
    for (name, value) in url::form_urlencoded::parse(body.as_bytes()) {
        if seen.iter().any(|(n, _)| *n == name) {
            return Err("A parameter was sent more than once.");
        }
        seen.push((name.into_owned(), value.into_owned()));
    }
    Ok(seen)
}

pub fn form_value<'a>(form: &'a [(String, String)], name: &str) -> Option<&'a str> {
    form.iter().find(|(n, _)| n == name).map(|(_, v)| v.as_str())
}
