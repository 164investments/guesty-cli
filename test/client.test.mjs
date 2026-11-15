import assert from "node:assert/strict";
import test from "node:test";
import { run } from "./harness/isolated-runner.mjs";

// Runs the Rust CLI against test/harness (the scenarios of the former
// test/fixtures/isolated-runtime.mjs). Tests that called guestyFetch,
// paginateAll, getToken or invalidateToken inside one Node process are now
// Rust unit tests in src/client.rs and src/auth.rs (`offline_tests`), run by
// `cargo test --features test-hooks`:
//
// - "<name> fails before token/cache access"      → client: invalid_options_fail_before_token_or_cache_access
// - "JSON null remains a JSON body"                → client: json_null_remains_a_json_body
// - "GET retries temporary server and network failures with a bounded attempt count"
//                                                  → client: get_retries_temporary_server_and_network_failures_with_a_bounded_attempt_count
// - "<method> is not retried after ambiguous <failure>" → client: writes_are_not_retried_after_ambiguous_failures
// - "timeout aborts an in-flight mutation without replaying it" → client: timeout_aborts_an_in_flight_mutation_without_replaying_it
// - "429 <case> delays a rejected write correctly" → client: retry_after_delays_a_rejected_write_correctly
// - "429 retries stop after three attempts"        → client: retries_after_429_stop_after_three_attempts
// - "rate limiter enforces documented second, minute and hour windows"
//                                                  → client: rate_limiter_enforces_documented_second_minute_and_hour_windows
// - "pagination <case>"                            → client: pagination_cases
// - "pagination rejects <case> without returning partial results"
//                                                  → client: pagination_rejects_inconsistent_pages_without_returning_partial_results
// - "invalid pagination options <params> fail before auth" → client: invalid_pagination_options_fail_before_auth
// - "pagination cap fails explicitly, but a confirmed complete 10,000-record result succeeds"
//                                                  → client: pagination_cap_fails_explicitly_but_a_confirmed_complete_result_succeeds
// - "invalidating an older rejected token preserves a newer process cache"
//                                                  → auth: invalidating_an_older_rejected_token_preserves_a_newer_process_cache
// - "runtime token type validation rejects unknown scopes without cache reads": TokenType is an enum in Rust
// - "multipart bodies retain their file bytes and native fetch owns the boundary"
//                                                  → client: multipart_bodies_retain_their_file_bytes_and_carry_their_own_boundary

const success = async (t, options) => {
  const result = await run(t, options);
  assert.equal(result.status, 0, result.stderr);
  return result;
};

test("raw merges existing queries, overrides supplied keys, preserves repeated arrays and encodes scalars", async (t) => {
  const result = await success(t, { args: ["raw", "GET", "/v1/listings?q=old&fields=title%20address&limit=1", "--params", JSON.stringify({ q: "café & spa", limit: 2, ids: ["a", "b"], active: false, omitted: null })] });
  const url = new URL(result.trace.requests[0].url);
  assert.equal(url.searchParams.get("q"), "café & spa");
  assert.equal(url.searchParams.get("fields"), "title address");
  assert.deepEqual(url.searchParams.getAll("limit"), ["2"]);
  assert.deepEqual(url.searchParams.getAll("ids"), ["a", "b"]);
  assert.equal(url.searchParams.get("active"), "false");
  assert.equal(url.searchParams.has("omitted"), false);
});

test("header names are case-insensitive and explicit options override repeated custom headers", async (t) => {
  const result = await success(t, { args: ["raw", "POST", "/v1/listings", "--text", "a,b", "-H", "content-type: text/plain", "-H", "Content-Type: text/csv", "-H", "Accept: text/plain", "--accept", "application/json"] });
  assert.equal(result.trace.requests[0].headers["content-type"], "text/csv");
  assert.equal(result.trace.requests[0].headers.accept, "application/json");
  assert.equal(result.trace.requests[0].body, "a,b");
  assert.equal(result.trace.requests[0].timeout, true);
  // Was `redirect === "manual"` (a fetch option): see "302 errors ... do not follow redirects" below.
});

for (const status of [302, 403]) {
  test(`${status} errors omit upstream private bodies and do not follow redirects`, async (t) => {
    const result = await run(t, { args: ["raw", "GET", "/v1/listings"], scenario: { responses: [{ status, raw: "fake-isolated-cache-key", headers: { location: "https://other.invalid/oauth2/token" } }] } });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.trace.requests.length, 1);
    assert.match(result.stderr, new RegExp(`HTTP ${status}`));
  });
}

test("API errors redact cached credentials and keep diagnostics off stdout", async (t) => {
  const result = await run(t, { args: ["raw", "POST", "/v1/listings?private=do-not-echo"], scenario: { responses: [{ status: 400, raw: "token fake-isolated-openapi-token key fake-isolated-cache-key" }] } });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /\[redacted\]/);
  assert.doesNotMatch(result.stderr, /do-not-echo/);
});

for (const reply of [{ raw: "fake-isolated-cache-key" }, { bodyReadFails: true }]) {
  test(`malformed or interrupted JSON response fails without body disclosure or mutation replay: ${JSON.stringify(reply)}`, async (t) => {
    const result = await run(t, { args: ["raw", "POST", "/v1/listings"], scenario: { responses: [reply] } });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.trace.requests.length, 1);
    assert.match(result.stderr, /not retried/);
  });
}
