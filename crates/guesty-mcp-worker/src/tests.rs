//! Unit tests for the OAuth rules, crypto, the store (on SQLite, the same SQL D1 runs) and the
//! MCP boundary.

use serde_json::{Value, json};

use crate::clock::Deadline;
use crate::config::Config;
use crate::crypto::{Keys, s256};
use crate::db::sqlite::{SqliteDb, block_on};
use crate::db::{Db, int, text};
use crate::html;
use crate::mcp::*;
use crate::oauth::*;
use crate::sql;
use crate::store::{self, CodeBinding, CodeExchange, NewGrant, Role, TokenError};
use crate::token_service::{client_network, parse_join, parse_token, service_message, team_path_allowed};
use crate::transport::{FetchLimits, OutboundRequest, OutboundResponse, TransportError};

const CLAUDE_CODE: &str = include_str!("../test/fixtures/claude-code-client-metadata.json");
const CHATGPT: &str = include_str!("../test/fixtures/chatgpt-client.json");
const SECRET: &str = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";
const RESOURCE: &str = "https://guesty-mcp.staykit.ai/mcp";

fn keys() -> Keys {
    Keys::from_secret(SECRET).unwrap()
}

// PKCE

#[test]
fn pkce_uses_s256() {
    // Expected value computed independently with Python: base64url(sha256(verifier)).
    let verifier = "dBjftJeZ4CVP-mJ92K9vGJuMqIvArMEbZ0j0iy1SH8w";
    let challenge = "e8GIjTrAxMGNnrIge-J0HnpqnVdZSHgbD3kClX2oUW0";
    assert_eq!(s256(verifier), challenge);
    assert!(pkce_matches(verifier, challenge));
    assert!(!pkce_matches("dBjftJeZ4CVP-mJ92K9vGJuMqIvArMEbZ0j0iy1SH8x", challenge));
    // Too short, too long, and characters outside the unreserved set.
    assert!(!valid_verifier("short"));
    assert!(!valid_verifier(&"a".repeat(129)));
    assert!(valid_verifier(&"a".repeat(128)));
    assert!(!valid_verifier(&format!("{}!", "a".repeat(50))));
}

#[test]
fn authorize_requires_an_s256_challenge() {
    let challenge = "e8GIjTrAxMGNnrIge-J0HnpqnVdZSHgbD3kClX2oUW0";
    assert_eq!(check_pkce(Some(challenge), Some("S256")).unwrap(), challenge);
    assert!(check_pkce(None, Some("S256")).is_err());
    assert!(check_pkce(Some(challenge), None).is_err(), "no method means plain, which isn't allowed");
    assert!(check_pkce(Some(challenge), Some("plain")).is_err());
    assert!(check_pkce(Some("too-short"), Some("S256")).is_err());
    assert!(check_pkce(Some(&format!("{}=", &challenge[..42])), Some("S256")).is_err());
}

// Redirect URIs (S1)

#[test]
fn registered_redirect_uris_are_https_or_loopback_http() {
    for ok in [
        "https://claude.ai/api/mcp/auth_callback",
        "https://chatgpt.com/connector_platform_oauth_redirect",
        "http://localhost/callback",
        "http://127.0.0.1:33418/",
        "http://[::1]/cb",
        "https://example.com/cb?x=1",
    ] {
        assert!(validate_redirect_uri(ok).is_ok(), "{ok}");
    }
    for bad in [
        "http://example.com/cb",
        "http://localhost.example.com/cb",
        "cursor://anysphere.cursor-retrieval/oauth/callback",
        "javascript:alert(1)",
        "https://example.com/cb#frag",
        "https://user:pass@example.com/cb",
        "/relative",
        "",
    ] {
        assert!(validate_redirect_uri(bad).is_err(), "{bad}");
    }
}

#[test]
fn redirects_match_exactly_except_the_loopback_port() {
    assert!(redirect_matches("https://claude.ai/api/mcp/auth_callback", "https://claude.ai/api/mcp/auth_callback"));
    // https is exact: no port, path, case or query changes.
    assert!(!redirect_matches("https://claude.ai/cb", "https://claude.ai:8443/cb"));
    assert!(!redirect_matches("https://claude.ai/cb", "https://claude.ai/cb/"));
    assert!(!redirect_matches("https://claude.ai/cb", "https://CLAUDE.ai/cb"));
    assert!(!redirect_matches("https://claude.ai/cb", "https://claude.ai/cb?x=1"));
    // Loopback: any port, the rest exact (RFC 8252 §8.4), for each loopback host.
    for (registered, requested) in [
        ("http://localhost/callback", "http://localhost:54321/callback"),
        ("http://127.0.0.1/callback", "http://127.0.0.1:1/callback"),
        ("http://[::1]/callback", "http://[::1]:8080/callback"),
        ("http://127.0.0.1:33418/", "http://127.0.0.1:40000/"),
        ("http://localhost/callback", "http://localhost/callback"),
    ] {
        assert!(redirect_matches(registered, requested), "{registered} {requested}");
    }
    for (registered, requested) in [
        ("http://localhost/callback", "http://127.0.0.1:5000/callback"),
        ("http://localhost/callback", "http://localhost:5000/other"),
        ("http://localhost/callback", "http://localhost:5000/callback?x=1"),
        ("http://localhost/callback", "https://localhost:5000/callback"),
        ("http://localhost/callback", "http://localhost:5000/callback#x"),
        ("http://localhost/callback", "http://user@localhost:5000/callback"),
        ("http://localhost/callback", "http://localhost:5000/x/../callback"),
        ("http://localhost/callback", "http://LOCALHOST:5000/callback"),
        ("http://localhost/callback", "http://localhost:05000/callback"),
    ] {
        assert!(!redirect_matches(registered, requested), "{registered} {requested}");
    }
    let registered = vec!["http://localhost/callback".to_string(), "http://127.0.0.1/callback".to_string()];
    assert_eq!(find_redirect(&registered, "http://127.0.0.1:61000/callback"), Some("http://127.0.0.1/callback"));
    assert_eq!(find_redirect(&registered, "http://evil.example/callback"), None);
}

#[test]
fn authorization_responses_keep_the_redirects_query() {
    assert_eq!(
        redirect_with(
            "https://app.example/cb?x=1",
            &[("code", "a b"), ("state", "s&t"), ("iss", "https://guesty-mcp.staykit.ai")]
        ),
        "https://app.example/cb?x=1&code=a+b&state=s%26t&iss=https%3A%2F%2Fguesty-mcp.staykit.ai"
    );
    assert_eq!(
        redirect_with("http://127.0.0.1:5000/cb", &[("error", "access_denied")]),
        "http://127.0.0.1:5000/cb?error=access_denied"
    );
    assert_eq!(redirect_origin("http://127.0.0.1:5000/cb").as_deref(), Some("http://127.0.0.1:5000"));
    assert_eq!(redirect_host("http://127.0.0.1:5000/cb"), "127.0.0.1:5000");
}

#[test]
fn repeated_parameters_are_refused() {
    assert!(parse_form("a=1&b=2").is_ok());
    assert!(parse_form("a=1&a=2").is_err());
}

// Dynamic registration

#[test]
fn registration_accepts_public_clients_only() {
    let (name, uris) = parse_registration(&json!({
        "client_name": "  Cursor\u{202E}  ", "redirect_uris": ["http://127.0.0.1/callback"],
        "grant_types": ["authorization_code", "refresh_token"], "response_types": ["code"], "token_endpoint_auth_method": "none",
    }))
    .unwrap();
    assert_eq!(name.as_deref(), Some("Cursor"));
    assert_eq!(uris, vec!["http://127.0.0.1/callback"]);
    let error = parse_registration(
        &json!({ "redirect_uris": ["https://a.example/cb"], "token_endpoint_auth_method": "client_secret_basic" }),
    )
    .unwrap_err();
    assert_eq!(error.code, "invalid_client_metadata");
    assert_eq!(parse_registration(&json!({ "redirect_uris": [] })).unwrap_err().code, "invalid_redirect_uri");
    assert_eq!(
        parse_registration(&json!({ "redirect_uris": ["http://evil.example/cb"] })).unwrap_err().code,
        "invalid_redirect_uri"
    );
    assert_eq!(
        parse_registration(&json!({ "redirect_uris": "https://a.example/cb" })).unwrap_err().code,
        "invalid_client_metadata"
    );
    assert!(
        parse_registration(
            &json!({ "redirect_uris": ["https://a.example/cb"], "grant_types": ["client_credentials"] })
        )
        .is_err()
    );
    assert!(
        parse_registration(&json!({ "redirect_uris": ["https://a.example/cb"], "response_types": ["token"] })).is_err()
    );
    let many: Vec<String> = (0..11).map(|i| format!("https://a.example/{i}")).collect();
    assert!(parse_registration(&json!({ "redirect_uris": many })).is_err());
}

// Client ID metadata documents (S4, S11)

#[test]
fn metadata_documents_are_fetched_only_from_known_origins() {
    assert!(cimd_url("https://claude.ai/oauth/claude-code-client-metadata").is_some());
    assert!(cimd_url("https://chatgpt.com/oauth/client.json").is_some());
    for bad in [
        "https://evil.example/client.json",
        "https://claude.ai.evil.example/client.json",
        "https://sub.claude.ai/client.json",
        "http://claude.ai/client.json",
        "https://claude.ai:8443/client.json",
        "https://claude.ai/",
        "https://claude.ai",
        "https://user@claude.ai/client.json",
        "https://claude.ai/client.json#x",
        "https://CLAUDE.AI/client.json",
        "mcpc_abc",
    ] {
        assert!(cimd_url(bad).is_none(), "{bad}");
    }
}

#[test]
fn published_metadata_documents_validate() {
    let claude: Value = serde_json::from_str(CLAUDE_CODE).unwrap();
    let info = validate_cimd("https://claude.ai/oauth/claude-code-client-metadata", &claude).unwrap();
    assert_eq!(info.client_name.as_deref(), Some("Claude Code"));
    assert_eq!(info.verified_origin.as_deref(), Some("https://claude.ai"));
    assert_eq!(info.redirect_uris, vec!["http://localhost/callback", "http://127.0.0.1/callback"]);
    // Claude Code listens on a random port.
    assert!(find_redirect(&info.redirect_uris, "http://localhost:49152/callback").is_some());

    let chatgpt: Value = serde_json::from_str(CHATGPT).unwrap();
    let info = validate_cimd("https://chatgpt.com/oauth/client.json", &chatgpt).unwrap();
    assert_eq!(info.client_name.as_deref(), Some("ChatGPT"));
    assert!(find_redirect(&info.redirect_uris, "https://chatgpt.com/connector_platform_oauth_redirect").is_some());
}

#[test]
fn auth_method_negotiation_accepts_none_among_the_methods() {
    let chatgpt: Value = serde_json::from_str(CHATGPT).unwrap();
    // ChatGPT prefers private_key_jwt in the singular field but lists none.
    assert_eq!(chatgpt["token_endpoint_auth_method"], "private_key_jwt");
    assert!(accepts_public_auth(&chatgpt));
    let claude: Value = serde_json::from_str(CLAUDE_CODE).unwrap();
    assert!(accepts_public_auth(&claude));
    assert!(accepts_public_auth(&json!({ "token_endpoint_auth_methods_supported": ["none"] })));
    assert!(!accepts_public_auth(&json!({ "token_endpoint_auth_method": "private_key_jwt" })));
    assert!(!accepts_public_auth(
        &json!({ "token_endpoint_auth_methods_supported": ["private_key_jwt", "client_secret_basic"] })
    ));
    assert!(!accepts_public_auth(&json!({})));
}

#[test]
fn metadata_documents_are_checked() {
    let id = "https://claude.ai/oauth/claude-code-client-metadata";
    let base: Value = serde_json::from_str(CLAUDE_CODE).unwrap();
    let with = |patch: Value| {
        let mut doc = base.clone();
        for (k, v) in patch.as_object().unwrap() {
            if v.is_null() {
                doc.as_object_mut().unwrap().remove(k);
            } else {
                doc[k] = v.clone();
            }
        }
        doc
    };
    assert!(validate_cimd(id, &with(json!({ "client_id": "https://claude.ai/other" }))).is_err(), "must name itself");
    assert!(validate_cimd("https://claude.ai/other", &base).is_err());
    assert!(validate_cimd(id, &with(json!({ "token_endpoint_auth_method": "client_secret_basic" }))).is_err());
    assert!(validate_cimd(id, &with(json!({ "client_secret": "x" }))).is_err());
    assert!(validate_cimd(id, &with(json!({ "redirect_uris": ["http://evil.example/cb"] }))).is_err());
    assert!(validate_cimd(id, &with(json!({ "redirect_uris": null }))).is_err());
    assert!(validate_cimd(id, &with(json!({ "grant_types": ["client_credentials"] }))).is_err());
    assert!(validate_cimd(id, &json!(["not", "an", "object"])).is_err());
    let named = validate_cimd(id, &with(json!({ "client_name": "<script>alert(1)</script>\u{200B}" }))).unwrap();
    assert_eq!(named.client_name.as_deref(), Some("<script>alert(1)</script>"));
}

// Origin (S10)

#[test]
fn mcp_accepts_known_and_loopback_origins_only() {
    for ok in [
        None,
        Some("https://claude.ai"),
        Some("https://chatgpt.com"),
        Some("http://localhost:6274"),
        Some("http://127.0.0.1"),
        Some("http://[::1]:3000"),
    ] {
        assert!(origin_allowed(ok), "{ok:?}");
    }
    for bad in [
        "https://evil.example",
        "null",
        "http://localhost.evil.example",
        "https://claude.ai.evil.example",
        "http://claude.ai",
        "https://localhost:6274",
        "http://localhost:6274/path",
        "",
    ] {
        assert!(!origin_allowed(Some(bad)), "{bad}");
    }
}

// Signed form field

#[test]
fn the_pending_request_is_signed_and_expires() {
    let keys = keys();
    let now = 1_700_000_000_000;
    let pending = Pending {
        client_id: "mcpc_x".into(),
        client_name: Some("App".into()),
        verified_origin: None,
        redirect_uri: "http://localhost:5000/cb".into(),
        state: Some("xyz".into()),
        code_challenge: "e8GIjTrAxMGNnrIge-J0HnpqnVdZSHgbD3kClX2oUW0".into(),
        resource: RESOURCE.into(),
        expires_at: now + PENDING_TTL_MS,
    };
    let field = pending.sign(&keys);
    assert_eq!(Pending::verify(&keys, &field, now).unwrap(), pending);
    assert_eq!(Pending::verify(&keys, &field, now + PENDING_TTL_MS), Err("expired"));
    // Changing any byte of the payload or the tag breaks it.
    let (payload, tag) = field.split_once('.').unwrap();
    let mut forged = pending.clone();
    forged.redirect_uri = "https://evil.example/cb".into();
    let forged_payload = keys.sign(&serde_json::to_vec(&forged).unwrap());
    let (forged_payload, _) = forged_payload.split_once('.').unwrap();
    assert_eq!(Pending::verify(&keys, &format!("{forged_payload}.{tag}"), now), Err("tampered"));
    let flipped = format!("{payload}.{}{}", if tag.starts_with('A') { 'B' } else { 'A' }, &tag[1..]);
    assert_eq!(Pending::verify(&keys, &flipped, now), Err("tampered"));
    assert_eq!(Pending::verify(&keys, "garbage", now), Err("tampered"));
    let other = Keys::from_secret("HxwdGhkYFxYVFBMSERAPDg0MCwoJCAcGBQQDAgEAAAE=").unwrap();
    assert_eq!(Pending::verify(&other, &field, now), Err("tampered"));
}

// Crypto

#[test]
fn sealing_and_hashing_use_separate_keys() {
    let keys = keys();
    let sealed = keys.seal("gts_secret", "grant:1:member_key");
    assert!(!sealed.contains("gts_secret"));
    assert_eq!(keys.unseal(&sealed, "grant:1:member_key").as_deref(), Some("gts_secret"));
    assert_eq!(keys.unseal(&sealed, "grant:2:member_key"), None, "bound to its row");
    assert_ne!(keys.seal("gts_secret", "c"), keys.seal("gts_secret", "c"), "random nonce");
    assert_ne!(keys.keyed_hash("access", "t"), keys.keyed_hash("refresh", "t"));
    assert_eq!(keys.keyed_hash("access", "t"), keys.keyed_hash("access", "t"));
    assert_eq!(keys.keyed_hash("access", "t").len(), 64);
    assert!(Keys::from_secret("too-short").is_err());
    assert!(Keys::from_secret("AAAA").is_err());
}

// Sign-in credential

#[test]
fn sign_in_reads_invites_links_and_access_keys() {
    let origins = vec!["https://guesty-tokens.staykit.ai".to_string()];
    let key = format!("gts_{}", "A1b2_-".repeat(7) + "Z");
    assert_eq!(key.len(), 47);
    assert_eq!(parse_credential(&format!("  {key}\n"), &origins), Ok(Credential::AccessKey(key.clone())));
    assert!(parse_credential(&key[..30], &origins).is_err());
    assert_eq!(parse_credential("ABCD-EFGH-JKMN", &origins), Ok(Credential::Invite("ABCD-EFGH-JKMN".into())));
    assert_eq!(
        parse_credential("guesty join abcd-efgh-jkmn", &origins),
        Ok(Credential::Invite("abcd-efgh-jkmn".into()))
    );
    assert_eq!(
        parse_credential("https://guesty-tokens.staykit.ai/join/ABCD-EFGH-JKMN", &origins),
        Ok(Credential::Invite("ABCD-EFGH-JKMN".into()))
    );
    assert_eq!(
        parse_credential("guesty join https://guesty-tokens.staykit.ai/join/ABCD-EFGH-JKMN/", &origins),
        Ok(Credential::Invite("ABCD-EFGH-JKMN".into()))
    );
    assert!(parse_credential("https://evil.example/join/ABCD-EFGH-JKMN", &origins).is_err());
    assert!(parse_credential("https://guesty-tokens.staykit.ai/v1/team", &origins).is_err());
    assert!(parse_credential("", &origins).is_err());
    assert!(parse_credential("<script>", &origins).is_err());
}

// Pages

#[test]
fn the_consent_page_escapes_everything_and_says_what_approval_allows() {
    let page = html::consent(
        &html::Consent {
            app_name: Some("<img src=x onerror=alert(1)>\"'"),
            verified_origin: None,
            redirect_host: "evil\"><script>.example",
            request_field: "a\"b",
            error: Some("<b>bad</b>"),
        },
        "n0nce",
    );
    assert!(!page.contains("<img"));
    assert!(!page.contains("<script>"));
    assert!(!page.contains("<b>bad"));
    assert!(page.contains("&lt;img src=x onerror=alert(1)&gt;&quot;&#39;"));
    assert!(page.contains("value=\"a&quot;b\""));
    assert!(page.contains("not verified"));
    assert!(page.contains("read everything in your team"));
    assert!(page.contains("confirm"));
    assert!(page.contains("invite teammates"));
    assert!(page.contains("name=\"read_only\""));
    assert!(!page.contains("<script"));
    let verified = html::consent(
        &html::Consent {
            app_name: Some("Claude Code"),
            verified_origin: Some("https://claude.ai"),
            redirect_host: "localhost:5000",
            request_field: "x",
            error: None,
        },
        "n",
    );
    assert!(verified.contains("published by <strong>https://claude.ai</strong>"));
    let csp = html::csp("n0nce", Some("http://localhost:5000"));
    assert!(csp.contains("frame-ancestors 'none'"));
    assert!(csp.contains("form-action 'self' http://localhost:5000"));
    assert!(csp.contains("default-src 'none'"));
    assert!(!csp.contains("unsafe"));
}

// Token-service answers

#[test]
fn token_service_answers_are_validated() {
    let key = format!("gts_{}", "a".repeat(43));
    let joined = parse_join(
        201,
        json!({ "key": key, "label": "Sam", "role": "member", "team": { "name": "Acme" } }).to_string().as_bytes(),
    )
    .unwrap();
    assert_eq!(joined.role, Role::Member);
    assert_eq!(joined.team_name.as_deref(), Some("Acme"));
    assert!(parse_join(201, json!({ "key": "gts_short", "role": "member" }).to_string().as_bytes()).is_err());
    assert!(parse_join(201, json!({ "key": key, "role": "owner" }).to_string().as_bytes()).is_err());
    let error =
        parse_join(404, br#"{"error":"invite_not_found","message":"That invite code isn't valid."}"#).unwrap_err();
    assert_eq!(
        (error.status, error.code.as_str(), error.message.as_str()),
        (404, "invite_not_found", "That invite code isn't valid.")
    );
    assert!(service_message(500, b"<html>").message.contains("HTTP 500"));
    let token =
        parse_token(br#"{"access_token":"tok","token_type":"openapi","expires_at":1800000000000}"#, "openapi").unwrap();
    assert_eq!(token.expires_at, 1_800_000_000_000);
    assert!(!format!("{token:?}").contains("tok\""));
    assert!(parse_token(br#"{"access_token":"tok","token_type":"beapi","expires_at":1}"#, "openapi").is_none());
    assert!(team_path_allowed("/v1/team"));
    assert!(team_path_allowed("/v1/team/invites"));
    assert!(!team_path_allowed("/v1/teams"));
    assert!(!team_path_allowed("/v1/token"));
    assert!(!team_path_allowed("/v1/team/../token"));
}

#[test]
fn rate_limits_count_ipv6_by_64() {
    assert_eq!(client_network("203.0.113.9"), "203.0.113.9");
    assert_eq!(client_network("2001:db8:0:12::1"), "2001:db8:0:12::/64");
    assert_eq!(client_network("2001:0db8:0000:0012:abcd:0:0:1"), "2001:db8:0:12::/64");
    assert_eq!(client_network("::1"), "0:0:0:0::/64");
}

// Store (S5) on SQLite

const VERIFIER: &str = "dBjftJeZ4CVP-mJ92K9vGJuMqIvArMEbZ0j0iy1SH8w";
const CHALLENGE: &str = "e8GIjTrAxMGNnrIge-J0HnpqnVdZSHgbD3kClX2oUW0";
const NOW: i64 = 1_800_000_000_000;
const REDIRECT: &str = "http://localhost:5000/callback";

fn member_key() -> String {
    format!("gts_{}", "m".repeat(43))
}

fn grant(db: &SqliteDb, client: &str, read_only: bool) -> String {
    let key = member_key();
    block_on(store::create_grant(
        db,
        &keys(),
        &NewGrant {
            client_id: client,
            team_name: Some("Acme"),
            key_label: Some("Sam"),
            role: Role::Member,
            read_only,
            member_key: &key,
        },
        &CodeBinding { redirect_uri: REDIRECT, resource: RESOURCE, code_challenge: CHALLENGE },
        NOW,
    ))
    .unwrap()
}

fn exchange<'a>(code: &'a str, client: &'a str) -> CodeExchange<'a> {
    CodeExchange { code, client_id: client, redirect_uri: REDIRECT, verifier: VERIFIER, resource: RESOURCE }
}

fn live(db: &SqliteDb, access_token: &str, at: i64) -> Option<store::Grant> {
    block_on(store::grant_for_access_token(db, &keys(), access_token, at)).unwrap()
}

#[test]
fn a_code_is_exchanged_once_and_its_grant_is_usable() {
    let db = SqliteDb::migrated();
    let code = grant(&db, "client-a", false);
    let issued = block_on(store::exchange_code(&db, &keys(), &exchange(&code, "client-a"), NOW + 1000)).unwrap();
    assert_eq!(issued.expires_in, 3600);
    let found = live(&db, &issued.access_token, NOW + 2000).unwrap();
    assert_eq!(found.member_key(&keys()), Some(member_key()));
    assert_eq!(found.team_name.as_deref(), Some("Acme"));
    // Nothing secret is stored in the clear.
    let dump = format!(
        "{:?}",
        block_on(db.batch(vec![
            sql!("SELECT * FROM grants"),
            sql!("SELECT * FROM codes"),
            sql!("SELECT * FROM access_tokens"),
            sql!("SELECT * FROM refresh_tokens")
        ]))
        .unwrap()
    );
    for secret in [&code, &issued.access_token, &issued.refresh_token, &member_key()] {
        assert!(!dump.contains(secret.as_str()));
    }
    // A second use fails and revokes the grant, so the first tokens stop working.
    let again = block_on(store::exchange_code(&db, &keys(), &exchange(&code, "client-a"), NOW + 3000));
    assert_eq!(again.unwrap_err(), TokenError::InvalidGrant("This authorization code was already used."));
    assert!(live(&db, &issued.access_token, NOW + 4000).is_none());
    assert!(block_on(store::refresh(&db, &keys(), &issued.refresh_token, "client-a", NOW + 5000)).is_err());
}

#[test]
#[allow(clippy::type_complexity)]
fn a_code_is_bound_to_client_redirect_resource_verifier_and_time() {
    let cases: Vec<(&str, Box<dyn Fn(&str) -> CodeExchange<'_>>, i64)> = vec![
        ("other client", Box::new(|c| CodeExchange { client_id: "client-b", ..exchange(c, "client-a") }), NOW + 1000),
        (
            "other redirect",
            Box::new(|c| CodeExchange { redirect_uri: "http://localhost:5001/callback", ..exchange(c, "client-a") }),
            NOW + 1000,
        ),
        (
            "other resource",
            Box::new(|c| CodeExchange { resource: "https://evil.example/mcp", ..exchange(c, "client-a") }),
            NOW + 1000,
        ),
        (
            "wrong verifier",
            Box::new(|c| CodeExchange { verifier: "x".repeat(43).leak(), ..exchange(c, "client-a") }),
            NOW + 1000,
        ),
        ("expired", Box::new(|c| exchange(c, "client-a")), NOW + store::CODE_TTL_MS),
        ("unknown", Box::new(|_| exchange("gmc_unknown", "client-a")), NOW + 1000),
    ];
    for (name, make, at) in cases {
        let db = SqliteDb::migrated();
        let code = grant(&db, "client-a", false);
        let result = block_on(store::exchange_code(&db, &keys(), &make(&code), at));
        assert!(matches!(result, Err(TokenError::InvalidGrant(_))), "{name}");
        // The code is spent either way: the real client can't use it afterwards.
        if name != "unknown" {
            assert!(
                block_on(store::exchange_code(&db, &keys(), &exchange(&code, "client-a"), NOW + 1000)).is_err(),
                "{name}"
            );
        }
    }
}

#[test]
fn refresh_tokens_rotate_and_reuse_revokes_the_grant() {
    let db = SqliteDb::migrated();
    let code = grant(&db, "client-a", true);
    let first = block_on(store::exchange_code(&db, &keys(), &exchange(&code, "client-a"), NOW)).unwrap();
    let second = block_on(store::refresh(&db, &keys(), &first.refresh_token, "client-a", NOW + 1000)).unwrap();
    assert_ne!(second.refresh_token, first.refresh_token);
    assert!(second.grant.read_only, "read-only survives a refresh");
    let third = block_on(store::refresh(&db, &keys(), &second.refresh_token, "client-a", NOW + 2000)).unwrap();
    assert!(third.grant.read_only);
    assert!(live(&db, &third.access_token, NOW + 3000).unwrap().read_only);
    // Presenting a spent refresh token revokes everything issued since.
    let reuse = block_on(store::refresh(&db, &keys(), &first.refresh_token, "client-a", NOW + 4000));
    assert!(matches!(reuse, Err(TokenError::InvalidGrant(_))));
    assert!(live(&db, &third.access_token, NOW + 5000).is_none());
    assert!(block_on(store::refresh(&db, &keys(), &third.refresh_token, "client-a", NOW + 6000)).is_err());
    let row = block_on(db.first(sql!("SELECT revoke_reason, sealed_key FROM grants"))).unwrap().unwrap();
    assert_eq!(text(&row, "revoke_reason").as_deref(), Some("refresh_reuse"));
    assert_eq!(text(&row, "sealed_key").as_deref(), Some(""), "a revoked grant keeps no key");
}

#[test]
fn a_refresh_token_from_another_client_revokes_and_expired_ones_fail() {
    let db = SqliteDb::migrated();
    let code = grant(&db, "client-a", false);
    let first = block_on(store::exchange_code(&db, &keys(), &exchange(&code, "client-a"), NOW)).unwrap();
    assert!(block_on(store::refresh(&db, &keys(), &first.refresh_token, "client-b", NOW + 1000)).is_err());
    assert!(live(&db, &first.access_token, NOW + 2000).is_none());

    let db = SqliteDb::migrated();
    let code = grant(&db, "client-a", false);
    let first = block_on(store::exchange_code(&db, &keys(), &exchange(&code, "client-a"), NOW)).unwrap();
    let late = NOW + store::REFRESH_TTL_MS + 1;
    assert!(block_on(store::refresh(&db, &keys(), &first.refresh_token, "client-a", late)).is_err());
    // Access tokens last an hour.
    assert!(live(&db, &first.access_token, NOW + store::ACCESS_TTL_MS - 1).is_some());
    assert!(live(&db, &first.access_token, NOW + store::ACCESS_TTL_MS).is_none());
}

#[test]
fn revoking_a_token_revokes_its_grant_but_not_another_clients() {
    let db = SqliteDb::migrated();
    let code = grant(&db, "client-a", false);
    let first = block_on(store::exchange_code(&db, &keys(), &exchange(&code, "client-a"), NOW)).unwrap();
    block_on(store::revoke_token(&db, &keys(), &first.access_token, Some("client-b"), NOW + 1)).unwrap();
    assert!(live(&db, &first.access_token, NOW + 2).is_some(), "another client can't revoke it");
    block_on(store::revoke_token(&db, &keys(), &first.refresh_token, Some("client-a"), NOW + 3)).unwrap();
    assert!(live(&db, &first.access_token, NOW + 4).is_none());
    block_on(store::revoke_token(&db, &keys(), "gma_unknown", Some("client-a"), NOW + 5)).unwrap();
}

#[test]
fn housekeeping_removes_abandoned_sign_ins() {
    let db = SqliteDb::migrated();
    grant(&db, "client-a", false);
    let count = |db: &SqliteDb| {
        int(&block_on(db.first(sql!("SELECT COUNT(*) AS n FROM grants"))).unwrap().unwrap(), "n").unwrap()
    };
    assert_eq!(count(&db), 1);
    // The next sign-in, two hours later, removes the one whose code was never exchanged.
    let key = member_key();
    block_on(store::create_grant(
        &db,
        &keys(),
        &NewGrant {
            client_id: "client-a",
            team_name: None,
            key_label: None,
            role: Role::Admin,
            read_only: false,
            member_key: &key,
        },
        &CodeBinding { redirect_uri: REDIRECT, resource: RESOURCE, code_challenge: CHALLENGE },
        NOW + 2 * 60 * 60_000,
    ))
    .unwrap();
    assert_eq!(count(&db), 1);
}

#[test]
fn registered_clients_are_stored() {
    let db = SqliteDb::migrated();
    let id = block_on(store::register_client(&db, Some("App"), &["https://a.example/cb".into()], NOW)).unwrap();
    assert!(id.starts_with("mcpc_"));
    let client = block_on(store::get_client(&db, &id)).unwrap().unwrap();
    assert_eq!(client.redirect_uris, vec!["https://a.example/cb"]);
    assert!(block_on(store::get_client(&db, "mcpc_unknown")).unwrap().is_none());
}

// MCP boundary

#[test]
fn messages_are_classified() {
    assert!(
        matches!(classify(br#"{"jsonrpc":"2.0","id":1,"method":"ping"}"#), Message::Request(r) if r.method == "ping")
    );
    assert_eq!(classify(br#"{"jsonrpc":"2.0","method":"notifications/initialized"}"#), Message::Accepted);
    assert_eq!(classify(br#"{"jsonrpc":"2.0","id":1,"result":{}}"#), Message::Accepted);
    for bad in [
        &b"[{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"ping\"}]"[..],
        b"not json",
        b"{\"id\":1,\"method\":\"ping\"}",
        b"{\"jsonrpc\":\"2.0\",\"id\":{},\"method\":\"x\"}",
    ] {
        assert!(matches!(classify(bad), Message::Invalid(_)));
    }
    let deep = format!("{}{}", "[".repeat(200), "]".repeat(200));
    assert!(matches!(classify(deep.as_bytes()), Message::Invalid(e) if e["error"]["code"] == -32700));
    assert!(header_version_ok(None));
    assert!(header_version_ok(Some("2025-11-25")));
    assert!(header_version_ok(Some("2025-06-18")));
    assert!(!header_version_ok(Some("2024-11-05")));
    assert_eq!(negotiate_version(Some("2025-06-18")), "2025-06-18");
    assert_eq!(negotiate_version(Some("1999-01-01")), "2025-11-25");
}

struct FakeBackend {
    grant: GrantInfo,
    answer: fn() -> Result<TeamToken, BackendError>,
}

impl HostedBackend for FakeBackend {
    fn grant(&self) -> &GrantInfo {
        &self.grant
    }
    fn deadline(&self) -> Deadline {
        Deadline::after(0, CALL_BUDGET_MS)
    }
    async fn guesty_token(&self, _: TokenType) -> Result<TeamToken, BackendError> {
        (self.answer)()
    }
    async fn team_service(&self, _: &str, _: &str, _: Option<&Value>) -> Result<(u16, Value), BackendError> {
        Err(BackendError::NotAllowed)
    }
    async fn http(&self, _: OutboundRequest, _: FetchLimits) -> Result<OutboundResponse, TransportError> {
        Err(TransportError::Network)
    }
}

#[test]
fn the_stub_handler_answers_and_a_revoked_key_is_unauthorized() {
    let grant = GrantInfo {
        grant_id: "g".into(),
        client_id: "c".into(),
        team_name: None,
        key_label: None,
        role: Role::Member,
        read_only: true,
    };
    let ok = FakeBackend { grant: grant.clone(), answer: || Ok(TeamToken { access_token: "t".into(), expires_at: 0 }) };
    let request = |method: &str, params: Value| JsonRpcRequest { id: json!(7), method: method.into(), params };
    let McpOutcome::Response(init) =
        block_on(StubHandler.handle(&ok, &request("initialize", json!({ "protocolVersion": "2025-06-18" }))))
    else {
        panic!()
    };
    assert_eq!(init["result"]["protocolVersion"], "2025-06-18");
    assert_eq!(init["id"], 7);
    let McpOutcome::Response(call) =
        block_on(StubHandler.handle(&ok, &request("tools/call", json!({ "name": "key_check" }))))
    else {
        panic!()
    };
    assert_eq!(call["result"]["structuredContent"]["read_only"], true);
    let revoked = FakeBackend { grant, answer: || Err(BackendError::Revoked) };
    assert_eq!(
        block_on(StubHandler.handle(&revoked, &request("tools/call", json!({ "name": "key_check" })))),
        McpOutcome::Unauthorized
    );
    let McpOutcome::Response(missing) = block_on(StubHandler.handle(&ok, &request("nope", Value::Null))) else {
        panic!()
    };
    assert_eq!(missing["error"]["code"], -32601);
}

#[test]
fn deadlines_bound_each_fetch() {
    let deadline = Deadline::after(1_000, CALL_BUDGET_MS);
    assert_eq!(deadline.fetch_timeout(1_000, 2_000), Some(2_000));
    assert_eq!(deadline.fetch_timeout(50_000, 2_000), Some(1_000));
    assert_eq!(deadline.fetch_timeout(51_000, 2_000), None);
    assert!(deadline.fits(1_000, 10_000, 30_000));
    assert!(!deadline.fits(30_000, 10_000, 15_000));
}

#[test]
fn config_derives_the_urls() {
    let config =
        Config::new("https://guesty-mcp.staykit.ai/", "https://guesty-tokens.staykit.ai/, https://other.example")
            .unwrap();
    assert_eq!(config.issuer(), "https://guesty-mcp.staykit.ai");
    assert_eq!(config.resource(), RESOURCE);
    assert_eq!(config.token_service_origins, vec!["https://guesty-tokens.staykit.ai", "https://other.example"]);
    let metadata = config.authorization_server_metadata();
    assert_eq!(metadata["authorization_response_iss_parameter_supported"], true);
    assert_eq!(metadata["token_endpoint_auth_methods_supported"], json!(["none"]));
    assert_eq!(metadata["code_challenge_methods_supported"], json!(["S256"]));
    assert_eq!(config.protected_resource_metadata()["resource"], RESOURCE);
    assert!(Config::new("http://example.com", "").is_none());
    assert!(Config::new("https://example.com/path", "").is_none());
    assert!(Config::new("http://localhost:8787", "").is_some());
}
