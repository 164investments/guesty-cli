// Loaded with --import into the Node CLI for parity runs: every fetch goes to
// the local mock named by GUESTY_TEST_REDIRECT, with the original origin in
// x-guesty-test-origin, exactly as the Rust CLI's test hooks send it.
const target = process.env.GUESTY_TEST_REDIRECT;
const original = globalThis.fetch;
globalThis.fetch = (input, options = {}) => {
  const url = new URL(String(input));
  const headers = new Headers(options.headers);
  headers.set("x-guesty-test-origin", url.origin);
  return original(`${target}${url.pathname}${url.search}`, { ...options, headers });
};
