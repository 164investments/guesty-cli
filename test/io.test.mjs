import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import test from "node:test";
import { run, root } from "./fixtures/isolated-runner.mjs";

const success = (t, options) => {
  const result = run(t, options);
  assert.equal(result.status, 0, result.stderr);
  return result;
};

for (const value of ["hello", null, false, 0, [1, 2], { ok: true }]) {
  test(`raw JSON input and explicit JSON output preserve ${JSON.stringify(value)}`, (t) => {
    const result = success(t, { args: ["raw", "POST", "/v1/listings", "--data", JSON.stringify(value), "--response", "json"], scenario: { responses: [{ raw: JSON.stringify(value) }] } });
    assert.equal(result.trace.requests[0].body, JSON.stringify(value));
    assert.equal(result.trace.requests[0].headers["content-type"], "application/json");
    assert.deepEqual(JSON.parse(result.stdout), value);
  });
}

test("raw CSV and binary response modes preserve data", (t) => {
  const csv = success(t, { args: ["raw", "GET", "/v1/listings", "--response", "text"], scenario: { responses: [{ raw: "a,b\n1,2\n", headers: { "content-type": "text/csv" } }] } });
  assert.equal(csv.stdout, "a,b\n1,2\n");
  const binary = success(t, { args: ["raw", "GET", "/v1/listings", "--response", "buffer"], scenario: { responses: [{ base64: Buffer.from([0, 1, 2, 65]).toString("base64"), headers: { "content-type": "application/octet-stream" } }] } });
  assert.equal(binary.stdout, "\u0000\u0001\u0002A");
});

for (const [name, args, reply, expected] of [
  ["empty 204", [], { status: 204 }, "null\n"],
  ["empty 205", [], { status: 205 }, "null\n"],
  ["empty JSON success", [], { raw: "" }, "null\n"],
  ["HEAD", ["HEAD"], { raw: "" }, "null\n"],
]) {
  test(`${name} has stable stdout`, (t) => {
    const result = success(t, { args: ["raw", args[0] ?? "GET", "/v1/listings"], scenario: { responses: [reply] } });
    assert.equal(result.stdout, expected);
  });
}

for (const [name, reply, options, expected] of [
  ["no-content download", { status: 204 }, [], ""],
  ["JSON string download", { raw: '"value"' }, ["--response", "json"], '"value"\n'],
  ["JSON object download", { json: { ok: true } }, [], '{\n  "ok": true\n}\n'],
  ["text download", { raw: "a,b", headers: { "content-type": "text/csv" } }, [], "a,b"],
]) {
  test(`${name} writes the actual response instead of undefined or mixed stdout`, (t) => {
    const outputPath = "/__guesty_fake_output__";
    const result = success(t, { args: ["raw", "GET", "/v1/listings", ...options, "--output", outputPath], scenario: { outputPath, responses: [reply] } });
    assert.equal(result.stdout, "");
    assert.equal(result.trace.writes.length, 1);
    assert.equal(result.trace.writes[0].text, expected);
  });
}

test("raw binary upload and download preserve bytes", (t) => {
  const inputPath = "/__guesty_fake_input__";
  const outputPath = "/__guesty_fake_output__";
  const bytes = Buffer.from([255, 0, 1, 13, 10]);
  const result = success(t, { args: ["raw", "POST", "/v1/listings", "--data-file", inputPath, "--content-type", "image/jpeg", "--output", outputPath], scenario: { inputPath, outputPath, inputBase64: bytes.toString("base64"), responses: [{ base64: bytes.toString("base64"), headers: { "content-type": "application/octet-stream" } }] } });
  assert.equal(result.trace.requests[0].bodyBase64, bytes.toString("base64"));
  assert.equal(result.trace.requests[0].headers["content-type"], "image/jpeg");
  assert.equal(result.trace.writes[0].base64, bytes.toString("base64"));
});

test("raw stdin preserves whitespace and honors custom timeout", (t) => {
  const result = success(t, { args: ["raw", "POST", "/v1/listings", "--stdin", "--content-type", "application/json", "--timeout", "0.25"], stdin: "  {\"ok\": true}\n" });
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
  test(`raw rejects ${name} before credentials or requests`, (t) => {
    const result = run(t, { args: ["raw", "POST", "/v1/listings", ...args] });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.trace.requests.length, 0);
    assert.equal(result.trace.tokenReads, 0);
  });
}

test("environment files fill missing keys in order and preserve explicitly empty process variables", (t) => {
  const envModule = pathToFileURL(join(root, "dist/env.js")).href;
  const cliPath = join(root, "dist/cli.js");
  const result = success(t, { cwd: tmpdir(), scenario: {
    env: { GUESTY_TEST_FIRST: null, GUESTY_TEST_SECOND: null, GUESTY_TEST_THIRD: null, GUESTY_TEST_EMPTY: "", GUESTY_TEST_PROCESS: "process", GUESTY_TEST_HASH: null, "invalid-key": null },
    envFiles: { home: "export GUESTY_TEST_FIRST=home # comment\nGUESTY_TEST_EMPTY=override\nGUESTY_TEST_PROCESS=override\nGUESTY_TEST_HASH='a#b' # comment\ninvalid-key=bad", script: "GUESTY_TEST_FIRST=source\nGUESTY_TEST_SECOND=source", cwd: "GUESTY_TEST_SECOND=cwd\nGUESTY_TEST_THIRD=cwd" },
  }, script: `process.argv[1]=${JSON.stringify(cliPath)}; const {loadEnv}=await import(${JSON.stringify(envModule)}); loadEnv(); console.log(JSON.stringify([process.env.GUESTY_TEST_FIRST,process.env.GUESTY_TEST_SECOND,process.env.GUESTY_TEST_THIRD,process.env.GUESTY_TEST_EMPTY,process.env.GUESTY_TEST_PROCESS,process.env.GUESTY_TEST_HASH,process.env['invalid-key']]));` });
  assert.deepEqual(JSON.parse(result.stdout), ["home", "source", "cwd", "", "process", "a#b", null]);
});

test("stdin listeners are removed after successful consumption and repeat reads finish", (t) => {
  success(t, { stdin: "hello\n", script: `import assert from 'node:assert/strict'; import {readStdin} from './dist/stdin.js'; const before=process.stdin.listenerCount('data'); assert.equal(await readStdin(),${JSON.stringify("hello\n")}); assert.equal(process.stdin.listenerCount('data'),before); assert.equal(await readStdin(),'');` });
});

test("TTY stdin rejects before installing listeners", (t) => {
  success(t, { script: `import assert from 'node:assert/strict'; import {readStdin} from './dist/stdin.js'; Object.defineProperty(process.stdin,'isTTY',{value:true}); const before=process.stdin.listenerCount('data'); await assert.rejects(readStdin(),/No data on stdin/); assert.equal(process.stdin.listenerCount('data'),before);` });
});

test("ArrayBuffer output is written as bytes", (t) => {
  const result = success(t, { script: `import {print} from './dist/output.js'; print(new Uint8Array([65,0,66]).buffer);` });
  assert.equal(result.stdout, "A\u0000B");
});

test("closed stdin rejects without waiting for an event that already happened", (t) => {
  success(t, { script: `import assert from 'node:assert/strict'; import {readStdin} from './dist/stdin.js'; process.stdin.destroy(); await assert.rejects(readStdin(),/Stdin is closed/);` });
});
