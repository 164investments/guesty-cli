//! Guesty API requests: path and OAuth checks, rate limits, retries,
//! redaction and pagination, as the Node CLI's `client.ts` did them.
//!
//! The checks and decisions are the shared core's (`guesty_core::request`);
//! this file sends the requests, keeps the rate-limit history, reads cached
//! tokens and prints progress.
//!
//! - Reads (GET/HEAD) retry network errors, 408 and 5xx; writes never do,
//!   because their outcome would be unknown. Any request retries a 429.
//! - A 401 re-reads the cache once; the CLI never refreshes a token.
//! - Redirects are never followed, so they can't bypass the OAuth check or
//!   forward a write.
//! - Error bodies are shown without the token or configured secrets.

use std::collections::VecDeque;
use std::sync::Mutex;

#[cfg(test)]
use guesty_core::request::validate_params;
use guesty_core::request::{
    Api, Attempts, BOOKING_ENGINE_RATE_LIMITS, Paginator, Prepared, RATE_LIMITS, Step, prepare_booking_engine,
    prepare_open_api, rejected_error, rejected_notice,
};
pub use guesty_core::request::{Body, BookingFetch, Fetch, Param, Params, Part, ResponseType};

use crate::auth::{self, TokenType};
use crate::error::Result;
use crate::hooks;
use crate::http;
#[cfg(test)]
use crate::json;
use crate::json::Json;
use crate::output::{Data, write_err};

static OPEN_API_TIMES: Mutex<VecDeque<f64>> = Mutex::new(VecDeque::new());
static BOOKING_TIMES: Mutex<VecDeque<f64>> = Mutex::new(VecDeque::new());

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

/// What error bodies must not show: the tokens sent and the configured keys.
fn secrets(tokens: &[String]) -> Vec<String> {
    let mut secrets: Vec<String> = tokens.to_vec();
    for name in ["SUPABASE_SERVICE_ROLE_KEY", "GUESTY_TOKEN_SERVICE_KEY"] {
        if let Ok(v) = std::env::var(name) {
            secrets.push(v);
        }
    }
    secrets
}

/// A multipart boundary no part is likely to contain.
fn boundary() -> String {
    format!("----formdata-guesty-{:016x}", (hooks::now_ms() as u64) ^ (std::process::id() as u64) << 20)
}

/// Sends a prepared request until the shared decisions say it's done.
/// `token` reads the cached token before each attempt.
fn send(request: Prepared, token: impl Fn() -> Result<String>) -> Result<Data> {
    let (times, limits, name, token_type): (_, &[(f64, usize)], _, _) = match request.api {
        Api::OpenApi => (&OPEN_API_TIMES, &RATE_LIMITS, "Guesty", TokenType::OpenApi),
        Api::BookingEngine => {
            (&BOOKING_TIMES, &BOOKING_ENGINE_RATE_LIMITS, "Guesty Booking Engine API", TokenType::Beapi)
        }
    };
    let mut tokens: Vec<String> = Vec::new();
    let mut attempts = Attempts::new(&request);
    while attempts.next() {
        enforce_rate_limit(times, limits, name);
        // A rate-limit wait may outlive the token's usable expiry window.
        let token = token()?;
        if !tokens.contains(&token) {
            tokens.push(token.clone());
        }
        let mut headers = request.headers.clone();
        headers.push(("Authorization".into(), format!("Bearer {token}")));
        let sent = http::send(http::Request {
            method: &request.method,
            url: request.url.as_str(),
            headers,
            body: request.body.clone(),
            timeout_ms: request.timeout_ms,
        });
        let step = match sent {
            Err(()) => attempts.network_error(hooks::now_ms),
            Ok(res) => attempts.response(&res, &secrets(&tokens), hooks::now_ms),
        };
        match step {
            Step::Retry { notice, wait_ms } => {
                write_err(&notice);
                hooks::sleep_ms(wait_ms as u64);
            }
            Step::Rejected { retry } => {
                // Marks this token rejected for the process; the shared cache is untouched.
                auth::invalidate_token(Some(&token));
                if !retry {
                    return Err(rejected_error(request.api, &auth::cache_guidance(token_type)).into());
                }
                write_err(rejected_notice(request.api));
                if request.api == Api::OpenApi {
                    auth::get_token()?;
                }
            }
            Step::Fail(e) => return Err(e.into()),
            Step::Done(data) => return Ok(data),
        }
    }
    Err(attempts.exhausted().into())
}

/// `guestyFetch(path, options)`.
pub fn guesty_fetch(path: &str, options: Fetch) -> Result<Data> {
    let request = prepare_open_api(path, &options, boundary)?;
    auth::get_token()?;
    send(request, auth::get_token)
}

/// `guestyFetch(path, { params })`, a GET.
pub fn get(path: &str, params: Params) -> Result<Data> {
    guesty_fetch(path, Fetch::get(params))
}

/// `paginateAll(path, params, resultsKey)`: every page, up to 10,000 results,
/// refusing to return a partial or inconsistent result.
pub fn paginate_all(path: &str, params: &Params, results_key: Option<&str>) -> Result<Vec<Json>> {
    let mut pages = Paginator::new(path, params, results_key)?;
    loop {
        let res = get(path, pages.next_params())?.into_json();
        if let Some(all) = pages.accept(res)? {
            return Ok(all);
        }
    }
}

// ─── Booking Engine API ──────────────────────────────────────────────────────
// Every operation in Guesty's Booking Engine reference names this server, and
// its paths start with /api/. Requests use only the cached beapi token.

/// `bookingEngineFetch(path, options)`.
pub fn booking_engine_fetch(path: &str, options: BookingFetch) -> Result<Data> {
    let request = prepare_booking_engine(path, &options)?;
    // Read after any rate-limit wait, which may outlive the token's usable window.
    send(request, || Ok(auth::get_cached_token(TokenType::Beapi)?.access_token))
}

/// Unit tests share one process; each starts with no request history.
#[cfg(all(test, feature = "test-hooks"))]
pub(crate) fn reset_rate_limits_for_tests() {
    OPEN_API_TIMES.lock().unwrap_or_else(|e| e.into_inner()).clear();
    BOOKING_TIMES.lock().unwrap_or_else(|e| e.into_inner()).clear();
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
