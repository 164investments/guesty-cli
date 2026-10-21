import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BOOKING_ENGINE_DOCS, createDocsClient, DOCS_BASE_URL, refreshApiSpec, retryAfterMs } from "../scripts/reference-refresh.mjs";

const document = { openapi: "3.0.3", info: { title: "GUESTY OPEN API", version: "1" }, servers: [{ url: "https://open-api.guesty.com/v1" }], security: [{ bearerAuth: [] }] };
const components = { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } };
const operation = (summary, tag = "Items") => ({ tags: [tag], summary, responses: { 200: { description: "OK" } } });
const current = [
  { slug: "itemslist", method: "get", path: "/items", operation: operation("List items") },
  { slug: "itemscreate", method: "post", path: "/items", operation: operation("Create item") },
  { slug: "ordersget", method: "get", path: "/orders/{id}", operation: operation("Get order", "Orders") },
];
const previousSchema = { ...document, paths: {
  "/items": { get: operation("List items") },
  "/items/{id}": { delete: operation("Delete item") },
  "/orders/{id}": { get: operation("Get order", "Orders") },
}, components, "x-cli-source": { url: "https://open-api-docs.guesty.com/reference/get_accounts-me", updatedAt: "2026-09-07T15:21:54.745Z" } };
const previousCatalog = {
  items: [
    { method: "GET", path: "/v1/items", title: "List items", slug: "get_items" },
    { method: "DELETE", path: "/v1/items/{id}", title: "Delete item", slug: "delete_items-id" },
  ],
  orders: [{ method: "GET", path: "/v1/orders/{orderId}", title: "Get order", slug: "get_orders-id" }],
};

function indexPage(pages) {
  const sidebar = [
    { title: "Getting Started", pages: [{ type: "basic", slug: "get-started", pages: [] }] },
    { title: "GUESTY OPEN API", pages: [{ type: "basic", slug: "items", pages: pages.map((page) => ({
      type: "endpoint", slug: page.slug, api_method: page.method, title: page.operation.summary, parent: "/branches/1.0/reference/items", pages: [],
    })) }] },
  ];
  const props = { sidebar, apiDefinitions: [{ filename: "guesty-open-api.json", updated_at: "2026-10-18T15:12:59.937Z" }] };
  return `<!doctype html><html><body><script id="ssr-props" type="application/json">${JSON.stringify(props)}</script></body></html>`;
}

function markdownPage(page) {
  const reduced = { ...document, tags: [{ name: page.operation.tags[0] }], paths: { [page.path]: { [page.method]: page.operation } }, components };
  return `---\nupdatedAt: 2026-10-18T15:12:58.000Z\n---\n\n# ${page.operation.summary}\n\n# OpenAPI definition\n\n\`\`\`json\n${JSON.stringify(reduced, null, 2)}\n\`\`\`\n`;
}

const html = (body, status = 200) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8" } });
const markdown = (body) => new Response(body, { status: 200, headers: { "content-type": "text/markdown; charset=utf-8" } });

// A fake clock: sleeping advances time instantly, so pacing is observable.
function harness(t, { pages = current, respond } = {}) {
  const root = mkdtempSync(join(tmpdir(), "guesty-reference-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, "openapi-spec.json"), JSON.stringify(previousSchema, null, 2) + "\n");
  writeFileSync(join(root, "api-spec.json"), JSON.stringify(previousCatalog, null, 2) + "\n");
  let clock = 1_000_000;
  const requests = [];
  const sleeps = [];
  const site = (url) => {
    if (url === `${DOCS_BASE_URL}/reference`) return html(indexPage(pages));
    const page = pages.find((item) => url === `${DOCS_BASE_URL}/reference/${item.slug}.md`);
    return page ? markdown(markdownPage(page)) : html("Page not found", 404);
  };
  const fetch = async (url, init) => {
    const attempt = requests.filter((request) => request.url === url).length + 1;
    requests.push({ url, at: clock, init });
    return (await respond?.(url, attempt)) ?? site(url);
  };
  const files = () => Object.fromEntries(readdirSync(root).sort().map((name) => [name, readFileSync(join(root, name), "utf8")]));
  const run = (options = {}) => refreshApiSpec({ root, fetch, now: () => clock, sleep: async (ms) => { sleeps.push(ms); clock += ms; }, ...options });
  return { root, requests, sleeps, files, run };
}

test("refresh merges every reference page into the published files at a steady pace", async (t) => {
  const site = harness(t);
  const result = await site.run();
  assert.deepEqual(site.requests.map((request) => request.url.replace(DOCS_BASE_URL, "")), ["/reference", "/reference/itemslist.md", "/reference/itemscreate.md", "/reference/ordersget.md"]);
  const gaps = site.requests.slice(1).map((request, index) => request.at - site.requests[index].at);
  assert.deepEqual(gaps, [2000, 2000, 2000], "one request every two seconds");
  assert.match(site.requests[0].init.headers["User-Agent"], /guesty-cli documentation-refresh/);
  assert.equal(site.requests[1].init.headers.Accept, "text/markdown");

  const schema = JSON.parse(site.files()["openapi-spec.json"]);
  assert.deepEqual(Object.keys(schema.paths), ["/items", "/orders/{id}"]);
  assert.deepEqual(Object.keys(schema.paths["/items"]), ["get", "post"]);
  assert.deepEqual(schema.tags, [{ name: "Items" }, { name: "Orders" }]);
  assert.deepEqual(schema["x-cli-source"], { url: `${DOCS_BASE_URL}/reference`, updatedAt: "2026-10-18T15:12:59.937Z" });
  const catalog = JSON.parse(site.files()["api-spec.json"]);
  assert.deepEqual(catalog.items.map((entry) => [entry.method, entry.slug]), [["GET", "itemslist"], ["POST", "itemscreate"]]);
  assert.deepEqual(catalog.orders.map((entry) => entry.slug), ["ordersget"], "existing operations keep their group");
  assert.deepEqual(Object.keys(site.files()), ["api-spec.json", "openapi-spec.json"], "no temporary files remain");

  assert.deepEqual(result.added, ["POST /v1/items"]);
  assert.deepEqual(result.removed, ["DELETE /v1/items/{id}"]);
  assert.equal(result.previous, 3);
  assert.equal(result.current, 3);
  assert.equal(result.requests, 4);
  assert.equal(result.retries, 0);
});

test("refresh honors Retry-After on 429 and slows down for the rest of the run", async (t) => {
  const site = harness(t, { respond: (url, attempt) => url.endsWith("/itemscreate.md") && attempt === 1
    ? new Response("Hello there, human!", { status: 429, headers: { "content-type": "text/html", "retry-after": "90" } })
    : undefined });
  const result = await site.run();
  const at = (path, attempt = 1) => site.requests.filter((request) => request.url.endsWith(path))[attempt - 1].at;
  assert.equal(at("/itemscreate.md", 2) - at("/itemscreate.md"), 90_000);
  assert.equal(at("/ordersget.md") - at("/itemscreate.md", 2), 3000, "the interval widens by half after a 429");
  assert.equal(result.throttled, 1);
  assert.equal(result.retries, 1);
  assert.equal(result.intervalMs, 3000);
});

test("refresh writes nothing when a page keeps failing", async (t) => {
  const site = harness(t, { respond: (url) => url.endsWith("/itemscreate.md") ? html("Service unavailable", 503) : undefined });
  const before = site.files();
  await assert.rejects(site.run(), /itemscreate\.md failed with HTTP 503 after 5 attempts; no reference files were updated/);
  assert.deepEqual(site.files(), before);
  assert.equal(site.requests.filter((request) => request.url.endsWith("/ordersget.md")).length, 0, "stops at the first page that cannot be read");
  assert.deepEqual(site.sleeps.filter((ms) => ms > 2000), [5000, 10000, 20000, 40000], "backs off between attempts");
});

test("refresh retries network errors and challenge pages served in place of Markdown", async (t) => {
  const site = harness(t, { respond: (url, attempt) => {
    if (url.endsWith("/itemslist.md") && attempt === 1) throw new TypeError("fetch failed");
    if (url.endsWith("/ordersget.md") && attempt === 1) return html("<html>Just a moment...</html>");
    return undefined;
  } });
  const result = await site.run();
  assert.equal(result.retries, 2);
  assert.equal(result.current, 3);
});

test("refresh fails at once on a missing page, a sharp drop or an overlong wait", async (t) => {
  const missing = harness(t, { respond: (url) => url.endsWith("/itemscreate.md") ? html("Page not found", 404) : undefined });
  const before = missing.files();
  await assert.rejects(missing.run(), /itemscreate\.md failed with HTTP 404 after 1 attempt;/);
  assert.deepEqual(missing.files(), before);

  const shrunk = harness(t, { pages: current.slice(0, 2) });
  await assert.rejects(shrunk.run(), /lists 2 reference pages, below 90% of the previous 3 operations/);
  assert.equal(shrunk.requests.length, 1, "no reference pages are read after the index shrinks");
  assert.deepEqual(shrunk.files(), before);
  const allowed = await shrunk.run({ allowShrink: true });
  assert.equal(allowed.current, 2);

  const blocked = harness(t, { respond: () => new Response("Hello there, human!", { status: 429, headers: { "content-type": "text/html", "retry-after": "3600" } }) });
  await assert.rejects(blocked.run(), /waiting 3600 seconds is more than this refresh allows/);
  assert.equal(blocked.requests.length, 1);
  assert.deepEqual(blocked.files(), before);

  const slow = harness(t, { respond: (url) => url.endsWith(".md") ? html("Service unavailable", 503) : undefined });
  await assert.rejects(slow.run({ maxRuntimeMs: 20_000 }), /is more than this refresh allows|ran past its time limit/);
  assert.deepEqual(slow.files(), before);
});

test("Retry-After accepts seconds and HTTP dates", () => {
  const now = Date.parse("2026-10-19T12:00:00Z");
  assert.equal(retryAfterMs("12", now), 12_000);
  assert.equal(retryAfterMs("Mon, 19 Oct 2026 12:00:30 GMT", now), 30_000);
  assert.equal(retryAfterMs(null, now), null);
  assert.equal(retryAfterMs("soon", now), null);
});

test("documentation client refuses redirects to the site's 404 page", async () => {
  const redirected = new Response("<html>404</html>", { status: 200, headers: { "content-type": "text/html" } });
  Object.defineProperties(redirected, { redirected: { value: true }, url: { value: `${DOCS_BASE_URL}/404` } });
  const client = createDocsClient({ fetch: async () => redirected, sleep: async () => {} });
  await assert.rejects(client.get(`${DOCS_BASE_URL}/reference/gone`, "text/html"), /redirected to the documentation site's 404 page/);
  assert.equal(client.stats.requests, 1);
});

test("Booking Engine refresh reads its own site and writes only the Booking Engine files", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "guesty-booking-reference-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, "openapi-spec.json"), "open api schema stays untouched\n");
  writeFileSync(join(root, "api-spec.json"), "open api catalog stays untouched\n");
  const base = "https://booking-api-docs.guesty.com";
  const bookingDocument = { ...document, info: { title: "Booking Engine API", version: "1.0" }, servers: [{ url: "https://booking.guesty.com/" }] };
  const pages = [
    { slug: "getlistings", method: "get", path: "/api/listings", operation: operation("Get listings", "Listings") },
    { slug: "createquote", method: "post", path: "/api/reservations/quotes", operation: operation("Create quote", "Quotes") },
  ];
  const sidebar = [{ title: "Booking Engine API", pages: [{ type: "basic", slug: "listings", pages: pages.map((page) => ({
    type: "endpoint", slug: page.slug, api_method: page.method, title: page.operation.summary, parent: `/branches/1.0/reference/${page.operation.tags[0].toLowerCase()}`, pages: [],
  })) }] }];
  const props = { sidebar, apiDefinitions: [{ filename: "booking-engine-api-1.json", updated_at: "2026-06-01T13:04:19.980Z" }] };
  const site = (server) => async (url) => {
    if (url === `${base}/reference`) return html(`<script id="ssr-props" type="application/json">${JSON.stringify(props)}</script>`);
    const page = pages.find((item) => url === `${base}/reference/${item.slug}.md`);
    if (!page) return html("Page not found", 404);
    const reduced = { ...bookingDocument, servers: [{ url: server }], tags: [{ name: page.operation.tags[0] }], paths: { [page.path]: { [page.method]: page.operation } }, components };
    return markdown(`# ${page.operation.summary}\n\n# OpenAPI definition\n\n\`\`\`json\n${JSON.stringify(reduced)}\n\`\`\`\n`);
  };
  const requested = [];
  const run = (server) => refreshApiSpec({ root, docs: BOOKING_ENGINE_DOCS, sleep: async () => {}, fetch: async (url) => { requested.push(url); return site(server)(url); } });

  await assert.rejects(run("https://open-api.guesty.com/v1"), /Expected the Guesty Booking Engine API server; refusing to mix API token scopes/);
  assert.deepEqual(readdirSync(root).sort(), ["api-spec.json", "openapi-spec.json"], "a page on the wrong server writes nothing");

  const result = await run("https://booking.guesty.com/");
  assert.ok(requested.every((url) => url.startsWith(base)), "only the Booking Engine documentation site is read");
  assert.deepEqual(result.added, ["GET /api/listings", "POST /api/reservations/quotes"]);
  const catalog = JSON.parse(readFileSync(join(root, "booking-engine-api-spec.json"), "utf8"));
  assert.deepEqual(catalog, {
    listings: [{ method: "GET", path: "/api/listings", title: "Get listings", slug: "getlistings" }],
    quotes: [{ method: "POST", path: "/api/reservations/quotes", title: "Create quote", slug: "createquote" }],
  });
  const schema = JSON.parse(readFileSync(join(root, "booking-engine-openapi-spec.json"), "utf8"));
  assert.deepEqual(schema["x-cli-source"], { url: `${base}/reference`, updatedAt: "2026-06-01T13:04:19.980Z" });
  assert.equal(readFileSync(join(root, "openapi-spec.json"), "utf8"), "open api schema stays untouched\n");
  assert.equal(readFileSync(join(root, "api-spec.json"), "utf8"), "open api catalog stays untouched\n");
});
