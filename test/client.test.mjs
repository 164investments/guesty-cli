import assert from "node:assert/strict";
import test from "node:test";
import { run, now } from "./fixtures/isolated-runner.mjs";

const client = 'import assert from "node:assert/strict"; import { guestyFetch, paginateAll } from "./dist/client.js";';
const success = (t, options) => {
  const result = run(t, options);
  assert.equal(result.status, 0, result.stderr);
  return result;
};

test("raw merges existing queries, overrides supplied keys, preserves repeated arrays and encodes scalars", (t) => {
  const result = success(t, { args: ["raw", "GET", "/v1/listings?q=old&fields=title%20address&limit=1", "--params", JSON.stringify({ q: "café & spa", limit: 2, ids: ["a", "b"], active: false, omitted: null })] });
  const url = new URL(result.trace.requests[0].url);
  assert.equal(url.searchParams.get("q"), "café & spa");
  assert.equal(url.searchParams.get("fields"), "title address");
  assert.deepEqual(url.searchParams.getAll("limit"), ["2"]);
  assert.deepEqual(url.searchParams.getAll("ids"), ["a", "b"]);
  assert.equal(url.searchParams.get("active"), "false");
  assert.equal(url.searchParams.has("omitted"), false);
});

test("header names are case-insensitive and explicit options override repeated custom headers", (t) => {
  const result = success(t, { args: ["raw", "POST", "/v1/listings", "--text", "a,b", "-H", "content-type: text/plain", "-H", "Content-Type: text/csv", "-H", "Accept: text/plain", "--accept", "application/json"] });
  assert.equal(result.trace.requests[0].headers["content-type"], "text/csv");
  assert.equal(result.trace.requests[0].headers.accept, "application/json");
  assert.equal(result.trace.requests[0].body, "a,b");
  assert.equal(result.trace.requests[0].timeout, true);
  assert.equal(result.trace.requests[0].redirect, "manual");
});

for (const [name, path, options] of [
  ["nested query object", "/v1/listings", { params: { q: { value: "bad" } } }],
  ["array query root", "/v1/listings", { params: [] }],
  ["null query root", "/v1/listings", { params: null }],
  ["nonfinite query", "/v1/listings", { params: { limit: "NAN_REPLACEMENT" } }],
  ["GET body", "/v1/listings", { body: {} }],
  ["HEAD body", "/v1/listings", { method: "HEAD", body: null }],
  ["unsupported HTTP method", "/v1/listings", { method: "CONNECT" }],
  ["response typo", "/v1/listings", { responseType: "jsoon" }],
  ["invalid timeout", "/v1/listings", { timeoutMs: 0 }],
  ["header line injection", "/v1/listings", { headers: { "X-Test": "value\ninjected" } }],
  ["URL fragment", "/v1/listings#hidden", {}],
  ["double encoded OAuth", "/%256fauth2/token", { method: "POST" }],
  ["encoded OAuth query separator", "/oauth2%3Ftoken", { method: "POST" }],
  ["encoded OAuth path parameter", "/%6fauth2;token", { method: "POST" }],
]) {
  test(`${name} fails before token/cache access`, (t) => {
    const serialized = JSON.stringify(options).replace('"NAN_REPLACEMENT"', "NaN");
    const result = success(t, { script: `${client} await assert.rejects(guestyFetch(${JSON.stringify(path)}, ${serialized}));` });
    assert.equal(result.trace.requests.length, 0);
    assert.equal(result.trace.tokenReads, 0);
  });
}

test("JSON null remains a JSON body", (t) => {
  const result = success(t, { script: `${client} await guestyFetch('/v1/listings', {method:'POST', body:null});` });
  assert.equal(result.trace.requests[0].body, "null");
  assert.equal(result.trace.requests[0].headers["content-type"], "application/json");
});

test("GET retries temporary server and network failures with a bounded attempt count", (t) => {
  const result = success(t, { script: `${client} assert.deepEqual(await guestyFetch('/v1/listings'), {ok:true});`, scenario: { responses: [{ status: 503 }, { throw: true }, { json: { ok: true } }] } });
  assert.equal(result.trace.requests.length, 3);
  assert.deepEqual(result.trace.waits, [1000, 2000]);
});

for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
  for (const [name, reply] of [["network failure", { throw: true }], ["server failure", { status: 503, json: { message: "unavailable" } }]]) {
    test(`${method} is not retried after ambiguous ${name}`, (t) => {
      const result = success(t, { script: `${client} await assert.rejects(guestyFetch('/v1/listings', {method:${JSON.stringify(method)}}), /outcome is unknown/);`, scenario: { responses: [reply] } });
      assert.equal(result.trace.requests.length, 1);
      assert.deepEqual(result.trace.waits, []);
    });
  }
}

test("timeout aborts an in-flight mutation without replaying it", (t) => {
  const result = success(t, { script: `${client} await assert.rejects(guestyFetch('/v1/listings', {method:'POST', timeoutMs:5}), /timeout.*outcome is unknown/);`, scenario: { responses: [{ timeout: true }] } });
  assert.equal(result.trace.requests.length, 1);
  assert.deepEqual(result.trace.timeouts, [5]);
});

for (const [name, retryAfter, waits] of [
  ["seconds", "2", [2000]],
  ["fractional seconds", "0.5", [500]],
  ["HTTP-date", new Date(now + 3000).toUTCString(), [3000]],
  ["past date", new Date(now - 3000).toUTCString(), []],
  ["invalid header", "soon", [5000]],
  ["negative seconds", "-5", [5000]],
  ["overflowing timer", "2147484", [2147483647, 353]],
]) {
  test(`429 ${name} delays a rejected write correctly`, (t) => {
    const result = success(t, { script: `${client} await guestyFetch('/v1/listings', {method:'POST', body:{value:1}});`, scenario: { responses: [{ status: 429, headers: { "retry-after": retryAfter } }, { json: { ok: true } }] } });
    assert.equal(result.trace.requests.length, 2);
    assert.deepEqual(result.trace.waits, waits);
  });
}

test("429 retries stop after three attempts", (t) => {
  const result = success(t, { script: `${client} await assert.rejects(guestyFetch('/v1/listings'), /HTTP 429/);`, scenario: { responses: [{ status: 429, headers: { "retry-after": "0" } }] } });
  assert.equal(result.trace.requests.length, 3);
});

for (const status of [302, 403]) {
  test(`${status} errors omit upstream private bodies and do not follow redirects`, (t) => {
    const result = run(t, { args: ["raw", "GET", "/v1/listings"], scenario: { responses: [{ status, raw: "fake-isolated-cache-key", headers: { location: "https://other.invalid/oauth2/token" } }] } });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.trace.requests.length, 1);
    assert.match(result.stderr, new RegExp(`HTTP ${status}`));
  });
}

test("API errors redact cached credentials and keep diagnostics off stdout", (t) => {
  const result = run(t, { args: ["raw", "POST", "/v1/listings?private=do-not-echo"], scenario: { responses: [{ status: 400, raw: "token fake-isolated-openapi-token key fake-isolated-cache-key" }] } });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /\[redacted\]/);
  assert.doesNotMatch(result.stderr, /do-not-echo/);
});

for (const reply of [{ raw: "fake-isolated-cache-key" }, { bodyReadFails: true }]) {
  test(`malformed or interrupted JSON response fails without body disclosure or mutation replay: ${JSON.stringify(reply)}`, (t) => {
    const result = run(t, { args: ["raw", "POST", "/v1/listings"], scenario: { responses: [reply] } });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.trace.requests.length, 1);
    assert.match(result.stderr, /not retried/);
  });
}

test("rate limiter enforces documented second, minute and hour windows", (t) => {
  const result = success(t, { script: `${client} for (let index=0;index<5001;index++) await guestyFetch('/v1/listings');` });
  const requests = result.trace.requests.filter(({ url }) => new URL(url).hostname === "open-api.guesty.com");
  assert.equal(requests.length, 5001);
  for (const [max, window] of [[15, 1000], [120, 60_000], [5000, 3_600_000]]) {
    for (let index = max; index < requests.length; index++) assert.ok(requests[index].at - requests[index - max].at >= window, `${max} per ${window}ms`);
  }
});

const paginationCases = [
  ["respects initial skip and caller page size", { limit: 2, skip: 5 }, [{ results: [{ _id: "a" }, { _id: "b" }], count: 8, skip: 5, limit: 2 }, { results: [{ _id: "c" }], count: 8, skip: 7, limit: 2 }], [5, 7], [2, 2]],
  ["follows lower server cap", { limit: 100 }, [{ results: [{ _id: "a" }], count: 2, skip: 0, limit: 1 }, { results: [{ _id: "b" }], count: 2, skip: 1, limit: 1 }], [0, 1], [100, 1]],
  ["continues short pages when total remains", { limit: 100 }, [{ results: [{ _id: "a" }], count: 2 }, { results: [{ _id: "b" }], count: 2 }], [0, 1], [100, 100]],
  ["confirms completion without metadata", {}, [[{ _id: "a" }], [{ _id: "b" }], []], [0, 1, 2], [100, 100, 100]],
  ["uses v3 nested hasMore even on a short page", { limit: 2, skip: 5 }, [{ results: [{ _id: "a" }], pagination: { skip: 5, limit: 2, hasMore: true } }, { results: [{ _id: "b" }], pagination: { skip: 6, limit: 2, hasMore: false } }], [5, 6], [2, 2]],
];
for (const [name, params, pages, skips, limits] of paginationCases) {
  test(`pagination ${name}`, (t) => {
    const path = name.includes("v3") ? "/v1/reservations-v3/search" : "/v1/listings";
    const expected = pages.flatMap((page) => Array.isArray(page) ? page : page.results);
    const result = success(t, { script: `${client} assert.deepEqual(await paginateAll(${JSON.stringify(path)}, ${JSON.stringify(params)}, 'results'), ${JSON.stringify(expected)});`, scenario: { responses: pages.map((json) => ({ json })) } });
    assert.deepEqual(result.trace.requests.map(({ url }) => Number(new URL(url).searchParams.get("skip"))), skips);
    assert.deepEqual(result.trace.requests.map(({ url }) => Number(new URL(url).searchParams.get("limit"))), limits);
  });
}

for (const [name, pages, pattern] of [
  ["null response", [null], "expected an array"],
  ["missing explicit result key", [{ data: [] }], "expected an array"],
  ["invalid count", [{ results: [], count: "bad" }], "Invalid pagination count"],
  ["invalid metadata", [{ results: [], pagination: [] }], "invalid pagination metadata"],
  ["invalid hasMore", [{ results: [], pagination: { hasMore: "false" } }], "invalid hasMore"],
  ["ignored skip", [{ results: [{ _id: "a" }], count: 2, skip: 0 }, { results: [{ _id: "b" }], count: 2, skip: 0 }], "did not honor"],
  ["duplicate record", [{ results: [{ _id: "a" }], count: 2 }, { results: [{ _id: "a" }], count: 2 }], "repeated a record"],
  ["empty page before total", [{ results: [], count: 1 }], "before completion"],
  ["empty page with hasMore", [{ results: [], pagination: { hasMore: true } }], "before completion"],
]) {
  test(`pagination rejects ${name} without returning partial results`, (t) => {
    success(t, { script: `${client} await assert.rejects(paginateAll('/v1/listings', {}, 'results'), new RegExp(${JSON.stringify(pattern)}));`, scenario: { responses: pages.map((json) => ({ raw: JSON.stringify(json) })) } });
  });
}

for (const params of [{ skip: -1 }, { limit: 0 }, { limit: "12x" }, { skip: 1.5 }]) {
  test(`invalid pagination options ${JSON.stringify(params)} fail before auth`, (t) => {
    const result = success(t, { script: `${client} await assert.rejects(paginateAll('/v1/listings', ${JSON.stringify(params)}), /Invalid pagination/);` });
    assert.equal(result.trace.requests.length, 0);
    assert.equal(result.trace.tokenReads, 0);
  });
}

test("pagination cap fails explicitly, but a confirmed complete 10,000-record result succeeds", (t) => {
  const full = success(t, { script: `${client} assert.equal((await paginateAll('/v1/listings')).length, 10000);`, scenario: { paginationCount: 10000 } });
  assert.equal(full.trace.requests.length, 100);
  const capped = success(t, { script: `${client} await assert.rejects(paginateAll('/v1/listings'), /10,000.*no partial result/);`, scenario: { paginationCount: 10001 } });
  assert.equal(capped.trace.requests.length, 100);
});

test("invalidating an older rejected token preserves a newer process cache", (t) => {
  const result = success(t, { script: `import assert from 'node:assert/strict'; import {getToken,invalidateToken} from './dist/auth.js'; const old=await getToken(); invalidateToken(old); const replacement=await getToken(); assert.notEqual(old,replacement); invalidateToken(old); assert.equal(await getToken(),replacement);`, scenario: { sharedReplies: [[{ token_type: "openapi", access_token: "fake-new-scoped-token", expires_at: now + 3_600_000 }]] } });
  assert.equal(result.trace.requests.length, 1);
  assert.equal(result.trace.requests[0].redirect, "error");
});

test("runtime token type validation rejects unknown scopes without cache reads", (t) => {
  const result = success(t, { script: `import assert from 'node:assert/strict'; import {getCachedToken} from './dist/auth.js'; await assert.rejects(getCachedToken('not-a-token-type'), /must be openapi or beapi/);` });
  assert.equal(result.trace.requests.length, 0);
  assert.equal(result.trace.tokenReads, 0);
});

test("multipart bodies retain their file bytes and native fetch owns the boundary", (t) => {
  success(t, { script: `${client}
    const nativeFetch=globalThis.fetch;
    globalThis.fetch=async (url,options)=> {
      assert.ok(options.body instanceof FormData);
      assert.equal(new Headers(options.headers).has('content-type'),false);
      assert.equal(await options.body.get('file').text(),'photo-bytes');
      const request=new Request(url,options);
      assert.ok(request.headers.get('content-type').startsWith('multipart/form-data; boundary='));
      assert.match(await request.text(),/filename="photo.jpg"/);
      return nativeFetch(url,options);
    };
    const body=new FormData(); body.append('file',new Blob(['photo-bytes'],{type:'image/jpeg'}),'photo.jpg');
    await guestyFetch('/v1/listings',{method:'POST',body});
  ` });
});
