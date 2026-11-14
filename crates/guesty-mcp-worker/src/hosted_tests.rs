//! The hosted request loop and handler over a scripted [`HostedBackend`]: every Guesty answer,
//! token-service answer and the clock come from the script, so nothing leaves the process.

use std::cell::{Cell, RefCell};
use std::collections::VecDeque;

use guesty_core::json::{self, Json, json};
use guesty_core::mcp::catalog::{self, Api};
use guesty_core::mcp::{Backend, Call, hosted_instructions, local_instructions, tools};
use guesty_core::request::{BookingFetch, Fetch, Params};
use serde_json::Value;

use crate::clock::Deadline;
use crate::db::sqlite::block_on;
use crate::hosted::*;
use crate::mcp::*;
use crate::store::Role;
use crate::transport::{FetchLimits, OutboundRequest, OutboundResponse, TransportError};

const MEMBER_KEY: &str = "gts_MEMBERKEYMEMBERKEYMEMBERKEYMEMBERKEYMEMBERK";
const SERVICE: &str = "https://guesty-tokens.staykit.ai";

type Reply = Result<OutboundResponse, TransportError>;
type TeamReply = Result<(u16, Vec<u8>), BackendError>;

struct Fake {
    grant: GrantInfo,
    clock: Cell<i64>,
    /// The request's own deadline (the Worker's, from when the request arrived).
    deadline: Deadline,
    /// Milliseconds each Guesty request takes.
    latency: i64,
    tokens: RefCell<VecDeque<Result<TeamToken, BackendError>>>,
    token_reads: RefCell<Vec<TokenType>>,
    replies: RefCell<VecDeque<Reply>>,
    /// Answers every request once the script runs out.
    fallback: Option<fn(&OutboundRequest) -> Reply>,
    sent: RefCell<Vec<(OutboundRequest, FetchLimits)>>,
    slept: RefCell<Vec<i64>>,
    team: RefCell<VecDeque<TeamReply>>,
    team_calls: RefCell<Vec<String>>,
}

impl Fake {
    fn new(replies: Vec<Reply>) -> Fake {
        Fake {
            grant: GrantInfo {
                grant_id: "g".into(),
                client_id: "c".into(),
                team_name: Some("Acme".into()),
                key_label: Some("Sam".into()),
                role: Role::Member,
                read_only: false,
            },
            clock: Cell::new(1_000_000),
            deadline: Deadline::after(1_000_000, CALL_BUDGET_MS),
            latency: 10,
            tokens: RefCell::new(VecDeque::new()),
            token_reads: RefCell::new(Vec::new()),
            replies: RefCell::new(replies.into()),
            fallback: None,
            sent: RefCell::new(Vec::new()),
            slept: RefCell::new(Vec::new()),
            team: RefCell::new(VecDeque::new()),
            team_calls: RefCell::new(Vec::new()),
        }
    }

    fn tokens(self, tokens: Vec<Result<TeamToken, BackendError>>) -> Fake {
        *self.tokens.borrow_mut() = tokens.into();
        self
    }

    fn sent_count(&self) -> usize {
        self.sent.borrow().len()
    }

    fn authorization(&self, index: usize) -> String {
        let sent = self.sent.borrow();
        sent[index].0.headers.iter().find(|(n, _)| n == "authorization").map(|(_, v)| v.clone()).unwrap_or_default()
    }
}

fn token(value: &str) -> Result<TeamToken, BackendError> {
    Ok(TeamToken { access_token: value.into(), expires_at: 0 })
}

impl HostedBackend for Fake {
    fn grant(&self) -> &GrantInfo {
        &self.grant
    }
    fn deadline(&self) -> Deadline {
        self.deadline
    }
    fn member_key(&self) -> &str {
        MEMBER_KEY
    }
    fn now_ms(&self) -> i64 {
        self.clock.get()
    }
    async fn sleep(&self, ms: i64) {
        self.slept.borrow_mut().push(ms);
        self.clock.set(self.clock.get() + ms);
    }
    async fn guesty_token(&self, token_type: TokenType) -> Result<TeamToken, BackendError> {
        self.token_reads.borrow_mut().push(token_type);
        self.tokens
            .borrow_mut()
            .pop_front()
            .unwrap_or_else(|| token(if token_type == TokenType::OpenApi { "open-token-1" } else { "be-token-1" }))
    }
    async fn team_service(&self, method: &str, path: &str, body: Option<&Value>) -> TeamReply {
        self.team_calls
            .borrow_mut()
            .push(format!("{method} {path} {}", body.map(|b| b.to_string()).unwrap_or_default()));
        self.team.borrow_mut().pop_front().unwrap_or(Err(BackendError::NotAllowed))
    }
    async fn http(&self, request: OutboundRequest, limits: FetchLimits) -> Result<OutboundResponse, TransportError> {
        self.clock.set(self.clock.get() + self.latency);
        let reply = match self.replies.borrow_mut().pop_front() {
            Some(reply) => reply,
            None => match self.fallback {
                Some(answer) => answer(&request),
                None => panic!("no reply scripted for request {}", self.sent.borrow().len() + 1),
            },
        };
        self.sent.borrow_mut().push((request, limits));
        reply
    }
}

fn response(status: u16, headers: &[(&str, &str)], body: &str) -> Reply {
    let mut all: Vec<(String, String)> = vec![("content-type".into(), "application/json".into())];
    all.extend(headers.iter().map(|(n, v)| (n.to_string(), v.to_string())));
    Ok(OutboundResponse { status, headers: all, body: body.as_bytes().to_vec() })
}

fn settings() -> HostedSettings {
    HostedSettings::new(SERVICE.into())
}

fn hosted_call(backend: &Fake) -> Call {
    let limits = settings().limits;
    Call { deadline_ms: limits.deadline_from(backend.clock.get() as f64), limits }
}

fn get(backend: &Fake, path: &str) -> guesty_core::Result<Json> {
    let settings = settings();
    let hosted = Hosted::new(backend, &settings);
    block_on(hosted.open_api(path, Fetch::get(Params::new()), &hosted_call(backend))).map(|d| d.into_json())
}

fn post(backend: &Fake, path: &str) -> guesty_core::Result<Json> {
    let settings = settings();
    let hosted = Hosted::new(backend, &settings);
    block_on(hosted.open_api(path, Fetch::json("POST", json!({ "a": 1 })), &hosted_call(backend)))
        .map(|d| d.into_json())
}

fn message(result: guesty_core::Result<Json>) -> String {
    result.expect_err("an error").into_message()
}

#[test]
fn a_read_sends_the_teams_token_with_the_hosted_limits() {
    let fake = Fake::new(vec![response(200, &[], r#"{"results":[{"_id":"l1"}]}"#)]);
    assert_eq!(get(&fake, "/v1/listings").unwrap(), json!({ "results": [{ "_id": "l1" }] }));
    let sent = fake.sent.borrow();
    let (request, limits) = &sent[0];
    assert_eq!(request.method, "GET");
    assert_eq!(request.url, "https://open-api.guesty.com/v1/listings");
    assert_eq!(fake.authorization(0), "Bearer open-token-1");
    assert!(request.headers.contains(&("accept".into(), "application/json".into())));
    assert!(limits.redirect_as_response);
    assert_eq!(limits.max_body_bytes, 16 * 1024 * 1024);
    // The request's own 60 s, cut to the call's 50 s.
    assert_eq!(limits.timeout_ms, 50_000);
    assert_eq!(*fake.token_reads.borrow(), [TokenType::OpenApi]);
}

#[test]
fn a_guesty_redirect_gets_the_cores_message_and_is_never_followed() {
    let fake = Fake::new(vec![response(302, &[("location", "https://evil.example/x")], "")]);
    assert_eq!(
        message(get(&fake, "/v1/listings")),
        "Guesty API GET /v1/listings failed: HTTP 302. Redirects are not followed; use the documented resource path."
    );
    assert_eq!(fake.sent_count(), 1);
    // A transport that reports the redirect as an error gets the same message.
    let fake = Fake::new(vec![Err(TransportError::Redirect { status: 307 })]);
    assert!(message(get(&fake, "/v1/listings")).contains("HTTP 307. Redirects are not followed"));
}

#[test]
fn reads_retry_timeouts_and_5xx_and_writes_never_do() {
    let fake =
        Fake::new(vec![Err(TransportError::Timeout), Err(TransportError::Network), Err(TransportError::Timeout)]);
    assert_eq!(
        message(get(&fake, "/v1/listings")),
        "Guesty API GET /v1/listings could not complete (network error or 60s timeout)."
    );
    assert_eq!(fake.sent_count(), 3);
    assert_eq!(*fake.slept.borrow(), [1000, 2000]);
    // Every attempt re-reads the token (S2).
    assert_eq!(fake.token_reads.borrow().len(), 3);

    let fake = Fake::new(vec![Err(TransportError::Timeout)]);
    assert_eq!(
        message(post(&fake, "/v1/reservations")),
        "Guesty API POST /v1/reservations could not complete (network error or 60s timeout). Its outcome is unknown; check Guesty before trying again."
    );
    assert_eq!(fake.sent_count(), 1);

    let fake = Fake::new(vec![response(503, &[], ""), response(200, &[], r#"{"ok":true}"#)]);
    assert_eq!(get(&fake, "/v1/listings").unwrap(), json!({ "ok": true }));
    assert_eq!(*fake.slept.borrow(), [1000]);

    let fake = Fake::new(vec![response(500, &[], r#"{"message":"boom"}"#)]);
    let error = message(post(&fake, "/v1/reservations"));
    assert!(error.starts_with("Guesty API POST /v1/reservations failed: HTTP 500. Its outcome is unknown"), "{error}");
    assert_eq!(fake.sent_count(), 1);
}

#[test]
fn a_429_waits_out_retry_after_if_it_fits_the_call() {
    let fake = Fake::new(vec![response(429, &[("retry-after", "2")], ""), response(200, &[], "[]")]);
    assert_eq!(get(&fake, "/v1/listings").unwrap(), json!([]));
    assert_eq!(*fake.slept.borrow(), [2000]);
    // A write retries a 429 too: Guesty didn't run it.
    let fake = Fake::new(vec![response(429, &[], ""), response(201, &[], r#"{"id":1}"#)]);
    assert_eq!(post(&fake, "/v1/reservations").unwrap(), json!({ "id": 1 }));
    assert_eq!(*fake.slept.borrow(), [5000]);
    // A wait past the deadline fails at once.
    let fake = Fake::new(vec![response(429, &[("retry-after", "120")], "")]);
    assert_eq!(
        message(get(&fake, "/v1/listings")),
        "Guesty API GET /v1/listings failed: HTTP 429. Waiting to retry would pass this tool call's 50s limit; try again shortly."
    );
    assert!(fake.slept.borrow().is_empty());
}

#[test]
fn a_401_rereads_the_token_once_and_the_same_token_fails_with_hosted_guidance() {
    let fake = Fake::new(vec![response(401, &[], "")]);
    assert_eq!(
        message(get(&fake, "/v1/listings")),
        format!("Guesty rejected the cached Open API token (401); the CLI cannot refresh it. {REJECTED_GUIDANCE}")
    );
    assert_eq!(fake.sent_count(), 1, "the rejected token isn't sent again");
    assert_eq!(fake.token_reads.borrow().len(), 2);

    let fake = Fake::new(vec![response(401, &[], ""), response(200, &[], r#"{"ok":1}"#)])
        .tokens(vec![token("open-token-1"), token("open-token-2")]);
    assert_eq!(get(&fake, "/v1/listings").unwrap(), json!({ "ok": 1 }));
    assert_eq!(
        (fake.authorization(0), fake.authorization(1)),
        ("Bearer open-token-1".into(), "Bearer open-token-2".into())
    );

    // A second 401 with a new token is final.
    let fake = Fake::new(vec![response(401, &[], ""), response(401, &[], "")])
        .tokens(vec![token("open-token-1"), token("open-token-2")]);
    assert!(message(get(&fake, "/v1/listings")).contains("(401); the CLI cannot refresh it. The team's shared token"));
    assert_eq!(fake.sent_count(), 2);
}

#[test]
fn error_bodies_lose_the_tokens_sent_and_the_member_key() {
    let body = format!(r#"{{"error":"bad","echo":"Bearer open-token-1 {MEMBER_KEY}"}}"#);
    let fake = Fake::new(vec![response(400, &[], &body)]);
    let error = message(get(&fake, "/v1/listings"));
    assert!(error.contains("HTTP 400\n"), "{error}");
    assert!(error.contains("Bearer [redacted] [redacted]"), "{error}");
    assert!(!error.contains("open-token-1") && !error.contains(MEMBER_KEY), "{error}");
}

#[test]
fn a_response_over_16_mb_is_refused() {
    let fake = Fake::new(vec![Err(TransportError::BodyTooLarge { limit: 16 * 1024 * 1024 })]);
    assert_eq!(
        message(get(&fake, "/v1/listings")),
        "Guesty API GET /v1/listings returned more than 16 MB, the most this server reads. Ask for less with query parameters such as fields, limit or filters."
    );
}

#[test]
fn the_deadline_bounds_every_request() {
    // Nothing left: not sent.
    let fake = Fake::new(vec![Err(TransportError::DeadlineExceeded)]);
    assert!(message(get(&fake, "/v1/listings")).starts_with("This tool call ran out of time: it has 50s"));
    // A read the deadline cut off says so, not "60s timeout".
    let mut fake = Fake::new(vec![Err(TransportError::Timeout)]);
    fake.latency = 50_000;
    assert!(message(get(&fake, "/v1/listings")).starts_with("This tool call ran out of time"));
    // The request's own deadline, a moment earlier than the call's, counts the same.
    let mut fake = Fake::new(vec![Err(TransportError::Timeout)]);
    fake.deadline = Deadline::after(fake.clock.get(), 20_000);
    fake.latency = 20_000;
    let error = message(get(&fake, "/v1/listings"));
    assert!(error.starts_with("This tool call ran out of time"), "{error}");
    assert_eq!(fake.sent.borrow()[0].1.timeout_ms, 20_000);
    // A write the deadline cut off keeps "its outcome is unknown".
    let mut fake = Fake::new(vec![Err(TransportError::Timeout)]);
    fake.latency = 50_000;
    assert!(message(post(&fake, "/v1/reservations")).contains("Its outcome is unknown"));
    // A slow token lookup leaves less for the fetch.
    let fake = Fake::new(vec![response(200, &[], "{}")]);
    let settings = settings();
    let hosted = Hosted::new(&fake, &settings);
    let call = Call { deadline_ms: Some(fake.clock.get() as f64 + 1_234.0), ..hosted_call(&fake) };
    block_on(hosted.open_api("/v1/listings", Fetch::default(), &call)).unwrap();
    assert_eq!(fake.sent.borrow()[0].1.timeout_ms, 1_234);
    // The test cap lowers each request's timeout.
    let fake = Fake::new(vec![response(200, &[], "{}")]);
    let capped = HostedSettings { guesty_timeout_ms: Some(700), ..settings.clone() };
    block_on(Hosted::new(&fake, &capped).open_api("/v1/listings", Fetch::default(), &hosted_call(&fake))).unwrap();
    assert_eq!(fake.sent.borrow()[0].1.timeout_ms, 700);
}

#[test]
fn booking_engine_calls_use_the_beapi_token() {
    let fake = Fake::new(vec![response(200, &[], r#"{"results":[]}"#)]);
    let settings = settings();
    let hosted = Hosted::new(&fake, &settings);
    let fetch = BookingFetch { method: "GET", ..BookingFetch::default() };
    block_on(hosted.booking_engine("/api/listings", fetch, &hosted_call(&fake))).unwrap();
    assert_eq!(*fake.token_reads.borrow(), [TokenType::BookingEngine]);
    assert_eq!(fake.sent.borrow()[0].0.url, "https://booking.guesty.com/api/listings");
    assert_eq!(fake.authorization(0), "Bearer be-token-1");
}

#[test]
fn one_call_makes_at_most_50_requests() {
    let mut fake = Fake::new(Vec::new());
    fake.fallback = Some(|_| response(200, &[], "{}"));
    let settings = settings();
    let hosted = Hosted::new(&fake, &settings);
    let call = hosted_call(&fake);
    for _ in 0..25 {
        block_on(hosted.open_api("/v1/listings", Fetch::default(), &call)).unwrap();
    }
    assert_eq!(hosted.requests(), MAX_SUBREQUESTS);
    let error = block_on(hosted.open_api("/v1/listings", Fetch::default(), &call)).unwrap_err();
    assert_eq!(error.into_message(), too_many_requests_message());
    assert_eq!(fake.sent_count(), 25);
}

// The handler: the core's server with the hosted options.

fn rpc(handler: &CoreHandler, fake: &Fake, method: &str, params: Value) -> Result<String, McpOutcome> {
    match block_on(handler.handle(fake, &JsonRpcRequest { id: json!(7), method: method.into(), params })) {
        McpOutcome::Response(text) => Ok(text),
        other => Err(other),
    }
}

fn tool(handler: &CoreHandler, fake: &Fake, name: &str, arguments: Value) -> Json {
    let text = rpc(handler, fake, "tools/call", json!({ "name": name, "arguments": arguments })).expect("a reply");
    json::parse(&text).unwrap()["result"].clone()
}

fn text(result: &Json) -> &str {
    result["content"][0]["text"].as_str().unwrap_or("")
}

#[test]
fn initialize_is_the_cores_with_the_hosted_title_and_instructions() {
    let handler = CoreHandler { settings: settings() };
    let fake = Fake::new(Vec::new());
    let init =
        json::parse(&rpc(&handler, &fake, "initialize", json!({ "protocolVersion": "2025-06-18" })).unwrap()).unwrap();
    assert_eq!(init["result"]["protocolVersion"], "2025-06-18");
    assert_eq!(
        init["result"]["serverInfo"],
        json!({ "name": "guesty-cli", "title": "Guesty", "version": guesty_core::VERSION })
    );
    assert_eq!(init["result"]["instructions"], hosted_instructions(false));
    let hosted = hosted_instructions(false);
    assert!(hosted.contains("If a call says the sign-in ended, ask the user to reconnect this server in their app."));
    assert!(!hosted.contains("guesty setup"));
    // Only the reconnect sentence differs from the CLI's.
    let local = local_instructions(false);
    let differing: Vec<(&str, &str)> = hosted.lines().zip(local.lines()).filter(|(a, b)| a != b).collect();
    assert_eq!(differing.len(), 1, "{differing:?}");
    let mut reader = Fake::new(Vec::new());
    reader.grant.read_only = true;
    let init = json::parse(&rpc(&handler, &reader, "initialize", json!({})).unwrap()).unwrap();
    assert_eq!(init["result"]["instructions"], hosted_instructions(true));
    assert!(hosted_instructions(true).contains("This server is read-only"));
    // tools/list is the core's, byte for byte.
    let list = rpc(&handler, &fake, "tools/list", Value::Null).unwrap();
    assert_eq!(list, format!("{{\"jsonrpc\":\"2.0\",\"id\":7,\"result\":{{\"tools\":{}}}}}", json::compact(&tools())));
    assert!(!list.contains("key_check"));
}

#[test]
fn a_revoked_key_anywhere_makes_the_request_unauthorized() {
    let handler = CoreHandler { settings: settings() };
    let fake = Fake::new(Vec::new()).tokens(vec![Err(BackendError::Revoked)]);
    assert_eq!(
        rpc(
            &handler,
            &fake,
            "tools/call",
            json!({ "name": "call_operation", "arguments": { "operation": "GET /v1/listings" } })
        ),
        Err(McpOutcome::Unauthorized)
    );
    let fake = Fake::new(Vec::new());
    fake.team.borrow_mut().push_back(Err(BackendError::Revoked));
    assert_eq!(rpc(&handler, &fake, "tools/call", json!({ "name": "team_status" })), Err(McpOutcome::Unauthorized));
}

#[test]
fn writes_preview_then_send_and_read_only_grants_refuse_them() {
    let handler = CoreHandler { settings: settings() };
    let write = catalog::operations()
        .iter()
        .find(|op| op.api == Api::OpenApi && op.method == "POST" && op.changes_data && !op.path.contains('{'))
        .expect("an Open API write");
    let fake = Fake::new(vec![response(201, &[], r#"{"_id":"new"}"#)]);
    let preview = tool(&handler, &fake, "call_operation", json!({ "operation": write.id, "body": { "a": 1 } }));
    assert!(text(&preview).starts_with("Not sent."), "{preview}");
    assert_eq!(fake.sent_count(), 0);
    let done =
        tool(&handler, &fake, "call_operation", json!({ "operation": write.id, "body": { "a": 1 }, "confirm": true }));
    assert!(text(&done).starts_with(&format!("Done: POST {}", write.path)), "{done}");
    assert_eq!(fake.sent.borrow()[0].0.body.as_deref(), Some(&b"{\"a\":1}"[..]));

    let mut reader = Fake::new(Vec::new());
    reader.grant.read_only = true;
    let refused = tool(&handler, &reader, "call_operation", json!({ "operation": write.id, "confirm": true }));
    assert_eq!(refused["isError"], true);
    assert!(text(&refused).starts_with("This server is read-only"), "{refused}");
    let invite = tool(&handler, &reader, "invite_teammate", json!({ "name": "Pat", "confirm": true }));
    assert_eq!(text(&invite), "This server is read-only, so it won't create invites.");
    assert_eq!(reader.sent_count() + reader.team_calls.borrow().len(), 0);
}

#[test]
fn team_tools_go_through_the_token_service_and_invite_links_must_point_back_at_it() {
    let handler = CoreHandler { settings: settings() };
    let fake = Fake::new(Vec::new());
    fake.team.borrow_mut().push_back(Ok((
        403,
        br#"{"error":"admin_only","message":"This needs one of the team's admin keys."}"#.to_vec(),
    )));
    let status = tool(&handler, &fake, "team_status", json!({}));
    assert_eq!(text(&status), "This needs one of the team's admin keys.");
    assert_eq!(status["isError"], true);

    fake.team.borrow_mut().push_back(Err(BackendError::Transport(TransportError::Network)));
    let down = tool(&handler, &fake, "team_status", json!({}));
    assert_eq!(text(&down), format!("The token service at {SERVICE} could not be reached."));

    let invite = |link: &str| {
        let fake = Fake::new(Vec::new());
        let body = json!({ "link": link, "email": { "sent": false }, "expires_at": 1_800_604_800_000u64 });
        fake.team.borrow_mut().push_back(Ok((201, body.to_string().into_bytes())));
        let result = tool(&handler, &fake, "invite_teammate", json!({ "name": "Pat", "confirm": true }));
        assert_eq!(*fake.team_calls.borrow(), ["POST /v1/team/invites {\"label\":\"Pat\",\"role\":\"member\"}"]);
        result
    };
    let ok = invite(&format!("{SERVICE}/join/abcd-efgh-jkmn"));
    assert!(text(&ok).contains(&format!("Link: {SERVICE}/join/ABCD-EFGH-JKMN")), "{ok}");
    assert!(text(&ok).contains("running: guesty join ABCD-EFGH-JKMN"), "{ok}");
    // The binding's placeholder host isn't the service's address.
    let placeholder = invite("https://guesty-token-service/join/abcd-efgh-jkmn");
    assert_eq!(text(&placeholder), "The token service returned an invite link for a different service.");
    let elsewhere = invite("https://evil.example/join/abcd-efgh-jkmn");
    assert_eq!(text(&elsewhere), "The token service returned an invite link for a different service.");
}

#[test]
fn pagination_that_runs_out_of_time_returns_no_partial_result() {
    let handler = CoreHandler { settings: settings() };
    let mut fake = Fake::new(Vec::new());
    fake.latency = 20_000;
    fake.fallback = Some(|request| {
        let skip = request.url.split("skip=").nth(1).and_then(|s| s.parse::<usize>().ok()).unwrap_or(0);
        let results: Vec<Json> = (skip..skip + 100).map(|i| json!({ "_id": i.to_string() })).collect();
        response(200, &[], &json!({ "results": results, "count": 1000, "skip": skip, "limit": 100 }).to_string())
    });
    let result = tool(&handler, &fake, "call_operation", json!({ "operation": "GET /v1/listings", "all_pages": true }));
    assert_eq!(result["isError"], true);
    assert!(text(&result).contains("50s"), "{result}");
    assert!(!text(&result).contains("\"results\""), "{result}");
    assert!(fake.sent_count() < 10);
}
