import assert from "node:assert/strict";
import test from "node:test";
import { run } from "./harness/isolated-runner.mjs";

// Runs the Rust CLI against test/harness. --data-file and --output paths in a
// scenario (inputPath/outputPath) become files in the run's working directory.
// Tests that imported dist/env.js, dist/stdin.js or dist/output.js are now
// Rust unit tests, run by `cargo test --features test-hooks`:
//
// - "environment files fill missing keys in order and preserve explicitly empty process variables"
//     → src/env.rs load_tests::environment_files_fill_missing_keys_in_order_and_preserve_explicitly_empty_process_variables
// - "stdin listeners are removed after successful consumption and repeat reads finish"
//     → src/hooks.rs io_tests::stdin_is_read_in_full_and_a_repeat_read_finishes (listener counts are Node-only)
// - "TTY stdin rejects before installing listeners" → io_tests::tty_stdin_rejects
// - "ArrayBuffer output is written as bytes"        → io_tests::byte_output_is_written_as_bytes
// - "closed stdin rejects without waiting for an event that already happened"
//     → io_tests::closed_stdin_finishes_without_waiting (a closed descriptor reads as empty input)

const success = async (t, options) => {
  const result = await run(t, options);
  assert.equal(result.status, 0, result.stderr);
  return result;
};

for (const value of ["hello", null, false, 0, [1, 2], { ok: true }]) {
  test(`raw JSON input and explicit JSON output preserve ${JSON.stringify(value)}`, async (t) => {
    const result = await success(t, { args: ["raw", "POST", "/v1/listings", "--data", JSON.stringify(value), "--response", "json"], scenario: { responses: [{ raw: JSON.stringify(value) }] } });
    assert.equal(result.trace.requests[0].body, JSON.stringify(value));
    assert.equal(result.trace.requests[0].headers["content-type"], "application/json");
    assert.deepEqual(JSON.parse(result.stdout), value);
  });
}

test("raw CSV and binary response modes preserve data", async (t) => {
  const csv = await success(t, { args: ["raw", "GET", "/v1/listings", "--response", "text"], scenario: { responses: [{ raw: "a,b\n1,2\n", headers: { "content-type": "text/csv" } }] } });
  assert.equal(csv.stdout, "a,b\n1,2\n");
  const binary = await success(t, { args: ["raw", "GET", "/v1/listings", "--response", "buffer"], scenario: { responses: [{ base64: Buffer.from([0, 1, 2, 65]).toString("base64"), headers: { "content-type": "application/octet-stream" } }] } });
  assert.equal(binary.stdout, "\u0000\u0001\u0002A");
});

for (const [name, args, reply, expected] of [
  ["empty 204", [], { status: 204 }, "null\n"],
  ["empty 205", [], { status: 205 }, "null\n"],
  ["empty JSON success", [], { raw: "" }, "null\n"],
  ["HEAD", ["HEAD"], { raw: "" }, "null\n"],
]) {
  test(`${name} has stable stdout`, async (t) => {
    const result = await success(t, { args: ["raw", args[0] ?? "GET", "/v1/listings"], scenario: { responses: [reply] } });
    assert.equal(result.stdout, expected);
  });
}

for (const [name, reply, options, expected] of [
  ["no-content download", { status: 204 }, [], ""],
  ["JSON string download", { raw: '"value"' }, ["--response", "json"], '"value"\n'],
  ["JSON object download", { json: { ok: true } }, [], '{\n  "ok": true\n}\n'],
  ["text download", { raw: "a,b", headers: { "content-type": "text/csv" } }, [], "a,b"],
]) {
  test(`${name} writes the actual response instead of undefined or mixed stdout`, async (t) => {
    const outputPath = "/__guesty_fake_output__";
    const result = await success(t, { args: ["raw", "GET", "/v1/listings", ...options, "--output", outputPath], scenario: { outputPath, responses: [reply] } });
    assert.equal(result.stdout, "");
    assert.equal(result.trace.writes.length, 1);
    assert.equal(result.trace.writes[0].text, expected);
  });
}

test("raw binary upload and download preserve bytes", async (t) => {
  const inputPath = "/__guesty_fake_input__";
  const outputPath = "/__guesty_fake_output__";
  const bytes = Buffer.from([255, 0, 1, 13, 10]);
  const result = await success(t, { args: ["raw", "POST", "/v1/listings", "--data-file", inputPath, "--content-type", "image/jpeg", "--output", outputPath], scenario: { inputPath, outputPath, inputBase64: bytes.toString("base64"), responses: [{ base64: bytes.toString("base64"), headers: { "content-type": "application/octet-stream" } }] } });
  assert.equal(result.trace.requests[0].bodyBase64, bytes.toString("base64"));
  assert.equal(result.trace.requests[0].headers["content-type"], "image/jpeg");
  assert.equal(result.trace.writes[0].base64, bytes.toString("base64"));
});

test("raw stdin preserves whitespace and honors custom timeout", async (t) => {
  const result = await success(t, { args: ["raw", "POST", "/v1/listings", "--stdin", "--content-type", "application/json", "--timeout", "0.25"], stdin: "  {\"ok\": true}\n" });
  assert.equal(result.trace.requests[0].body, "  {\"ok\": true}\n");
  assert.deepEqual(result.trace.timeouts, [250]);
});

for (const [name, args] of [
  ["conflicting input", ["--data", "{}", "--text", "ignored"]],
  ["conflicting file input", ["--data-file", "/should-not-read", "--stdin"]],
  ["invalid JSON", ["--data", "fake-isolated-cache-key"]],
  ["invalid query JSON", ["--params", "fake-isolated-cache-key"]],
  ["invalid header", ["--header", "fake-isolated-cache-key"]],
  ["invalid response mode", ["--response", "jsoon"]],
  ["invalid timeout", ["--timeout", "NaN"]],
]) {
  test(`raw rejects ${name} before credentials or requests`, async (t) => {
    const result = await run(t, { args: ["raw", "POST", "/v1/listings", ...args] });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.trace.requests.length, 0);
    assert.equal(result.trace.tokenReads, 0);
  });
}
