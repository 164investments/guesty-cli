// Reuse the authentication isolation fixture and intercept every resource call.
// No real network, credential read, or cache write is possible in these tests.
import fs from "node:fs";

const writeTrace = fs.writeFileSync;
await import("./mock-runtime.mjs");
const authFetch = globalThis.fetch;
const scenario = JSON.parse(process.env.GUESTY_CLI_TEST_SCENARIO);
const requests = [];
let replyIndex = 0;

globalThis.fetch = async (input, options = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "cache.invalid") return authFetch(input, options);
  if (url.origin !== "https://open-api.guesty.com" || !url.pathname.startsWith("/v1/") || /oauth/i.test(url.pathname)) {
    throw new Error("Reservation tests forbid this network request");
  }
  requests.push({
    method: options.method ?? "GET",
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    body: options.body === undefined ? null : JSON.parse(options.body),
    contentType: new Headers(options.headers).get("Content-Type"),
  });
  const replies = scenario.resourceReplies ?? [{ body: { ok: true } }];
  const reply = replies[replyIndex++];
  if (!reply) throw new Error("Unexpected extra resource request");
  return new Response(reply.status === 204 ? null : JSON.stringify(reply.body ?? {}), {
    status: reply.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
};

process.on("exit", () => writeTrace(process.env.GUESTY_CLI_RESOURCE_TRACE, JSON.stringify(requests)));
