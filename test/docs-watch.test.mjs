import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describeChanges, formatSummary, newChangelogEntries, readChangelog, watchDocs } from "../scripts/docs-watch.mjs";
import { BOOKING_ENGINE_DOCS, OPEN_API_DOCS } from "../scripts/reference-refresh.mjs";
import { OPEN_API } from "../scripts/api-reference.mjs";

const BASE = OPEN_API_DOCS.baseUrl;
const document = { openapi: "3.0.3", info: { title: "GUESTY OPEN API", version: "1" }, servers: [{ url: "https://open-api.guesty.com/v1" }], security: [{ bearerAuth: [] }] };
const ok = (description = "OK") => ({ description });
const json = (ref) => ({ content: { "application/json": { schema: { $ref: `#/components/schemas/${ref}` } } } });

// Guesty fills this default with the time it built the page.
const stamped = (at) => ({ content: { "application/json": { schema: { type: "object", properties: { at: { type: "string", format: "date-time", default: at } } } } } });

// Yesterday's reference and today's. Today: an operation added and one removed,
// one newly deprecated, a new required query parameter, a new response field
// that happens to be named "description", two wording changes, one inside a
// shared schema, and a new build time in a default, which isn't a change.
const before = {
  paths: {
    "/items": {
      get: { tags: ["Items"], summary: "List items", responses: { 200: { ...ok(), ...json("Item") } } },
      post: { tags: ["Items"], summary: "Create item", requestBody: json("NewItem"), responses: { 201: ok() } },
    },
    "/items/{id}": { delete: { tags: ["Items"], summary: "Delete item", responses: { 204: ok() } } },
    "/orders/{id}": {
      get: { tags: ["Orders"], summary: "Get order", responses: { 200: ok() } },
      put: { tags: ["Orders"], summary: "Update order", requestBody: stamped("2026-10-21T11:11:45.748Z"), responses: { 200: ok() } },
    },
    "/reviews": { get: { tags: ["Reviews"], summary: "List reviews", responses: { 200: ok() } } },
  },
  components: { schemas: {
    Item: { type: "object", properties: { name: { type: "string" } } },
    NewItem: { type: "object", required: ["name"], properties: { name: { type: "string", description: "The name" } } },
  } },
};
const after = {
  paths: {
    "/items": {
      get: before.paths["/items"].get,
      post: before.paths["/items"].post,
    },
    "/orders": { post: { tags: ["Orders"], summary: "Create order", responses: { 201: ok() } } },
    "/orders/{id}": {
      get: { ...before.paths["/orders/{id}"].get, summary: "Get one order" },
      put: { ...before.paths["/orders/{id}"].put, requestBody: stamped("2026-10-22T11:55:00.141Z"), deprecated: true },
    },
    "/reviews": { get: { ...before.paths["/reviews"].get, parameters: [{ name: "listingId", in: "query", required: true, schema: { type: "string" } }] } },
  },
  components: { schemas: {
    Item: { type: "object", properties: { name: { type: "string" }, description: { type: "string" } } },
    NewItem: { type: "object", required: ["name"], properties: { name: { type: "string", description: "Item name" } } },
  } },
};

const slugOf = (method, path) => `${method}_${path.replace(/[{}]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`.toLowerCase();
const pagesOf = (reference) => Object.entries(reference.paths).flatMap(([path, item]) =>
  Object.entries(item).map(([method, operation]) => ({ slug: slugOf(method, path), method, path, operation })));

function fullSchema(reference, source) {
  return { ...document, tags: [], paths: reference.paths, components: reference.components, "x-cli-source": source };
}

function catalogOf(reference) {
  const catalog = {};
  for (const page of pagesOf(reference)) {
    (catalog[page.operation.tags[0].toLowerCase()] ??= []).push({ method: page.method.toUpperCase(), path: `/v1${page.path}`, title: page.operation.summary, slug: page.slug });
  }
  return catalog;
}

const html = (props) => new Response(`<!doctype html><script id="ssr-props" type="application/json">${JSON.stringify(props)}</script>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
const markdown = (body) => new Response(body, { status: 200, headers: { "content-type": "text/markdown; charset=utf-8" } });

const changelogEntry = (slug, createdAt, body = `Notes for ${slug}.`) => ({ slug, title: slug, created_at: createdAt, updated_at: createdAt, content: { body } });

function site({ reference, updatedAt, changelog = [], fail = false }) {
  const pages = pagesOf(reference);
  return (url) => {
    if (fail) return new Response("down", { status: 404 });
    if (url === `${BASE}/reference`) {
      const sidebar = [{ title: "API", pages: [{ type: "basic", slug: "api", pages: pages.map((page) => ({
        type: "endpoint", slug: page.slug, api_method: page.method, title: page.operation.summary, parent: "/branches/1.0/reference/api", pages: [],
      })) }] }];
      return html({ sidebar, apiDefinitions: [{ updated_at: updatedAt }] });
    }
    if (url === `${BASE}/changelog`) return html({ sidebars: {}, changelogs: { data: changelog } });
    const page = pages.find((item) => url === `${BASE}/reference/${item.slug}.md`);
    if (!page) return new Response("missing", { status: 404 });
    const reduced = { ...document, tags: [{ name: page.operation.tags[0] }], paths: { [page.path]: { [page.method]: page.operation } }, components: reference.components };
    return markdown(`# ${page.operation.summary}\n\n# OpenAPI definition\n\n\`\`\`json\n${JSON.stringify(reduced, null, 2)}\n\`\`\`\n`);
  };
}

function harness(t, { source = { url: `${BASE}/reference`, updatedAt: "2026-10-21T16:01:14.461Z" }, ...live }) {
  const root = mkdtempSync(join(tmpdir(), "guesty-docs-watch-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, "openapi-spec.json"), JSON.stringify(fullSchema(before, source), null, 2) + "\n");
  writeFileSync(join(root, "api-spec.json"), JSON.stringify(catalogOf(before), null, 2) + "\n");
  const requests = [];
  const serve = site(live);
  const run = (options = {}) => watchDocs({
    root, sites: [OPEN_API_DOCS], sleep: async () => {}, refreshOptions: { minimumRatio: 0 },
    fetch: async (url) => { requests.push(url.replace(BASE, "")); return serve(url); }, ...options,
  });
  const schema = () => JSON.parse(readFileSync(join(root, "openapi-spec.json"), "utf8"));
  return { root, requests, run, schema };
}

test("an unchanged site costs two requests and changes no file", async (t) => {
  const changelog = [changelogEntry("2026-10-21", "2026-10-21T16:12:53.786Z")];
  const recorded = { url: `${BASE}/reference`, updatedAt: "2026-10-21T16:01:14.461Z", changelog: { latest: "2026-10-21", createdAt: "2026-10-21T16:12:53.786Z" } };
  const watch = harness(t, { source: recorded, reference: before, updatedAt: "2026-10-21T16:01:14.461Z", changelog });
  const original = readFileSync(join(watch.root, "openapi-spec.json"), "utf8");
  const [result] = await watch.run();
  assert.deepEqual(watch.requests, ["/reference", "/changelog"]);
  assert.equal(result.refreshed, false);
  assert.deepEqual(result.changelog, []);
  assert.equal(readFileSync(join(watch.root, "openapi-spec.json"), "utf8"), original);
});

test("a new publication re-reads every page and reports each kind of change", async (t) => {
  const changelog = [
    changelogEntry("2026-10-22", "2026-10-22T12:50:00.000Z", "Adds [order creation](https://example.com/x) and deprecates **order updates**.&#x20;Q&amp;A"),
    changelogEntry("2026-10-21", "2026-10-21T16:12:53.786Z"),
  ];
  const watch = harness(t, { reference: after, updatedAt: "2026-10-22T12:46:42.779Z", changelog });
  const [result] = await watch.run();
  assert.equal(result.refreshed, true);
  assert.equal(watch.requests.filter((url) => url.endsWith(".md")).length, pagesOf(after).length);
  const line = (items) => items.map((item) => `${item.method} ${item.path}`);
  assert.deepEqual(line(result.changes.added), ["POST /v1/orders"]);
  assert.deepEqual(line(result.changes.removed), ["DELETE /v1/items/{id}"]);
  assert.deepEqual(line(result.changes.deprecated), ["PUT /v1/orders/{id}"]);
  assert.deepEqual(line(result.changes.request), ["GET /v1/reviews"]);
  assert.deepEqual(line(result.changes.response), ["GET /v1/items"], "a new field named description is a real change");
  assert.deepEqual(line(result.changes.wording), ["POST /v1/items", "GET /v1/orders/{id}"]);
  // Nothing was recorded before, so entries after the old publication count.
  assert.deepEqual(result.changelog.map((entry) => entry.slug), ["2026-10-22", "2026-10-21"]);
  assert.equal(result.changelog[0].text, "Adds order creation and deprecates order updates. Q&A");
  assert.deepEqual(watch.schema()["x-cli-source"], {
    url: `${BASE}/reference`, updatedAt: "2026-10-22T12:46:42.779Z",
    changelog: { latest: "2026-10-22", createdAt: "2026-10-22T12:50:00.000Z" },
  });
});

test("a changelog entry alone updates the record without re-reading pages", async (t) => {
  const recorded = { url: `${BASE}/reference`, updatedAt: "2026-10-21T16:01:14.461Z", changelog: { latest: "2026-10-21", createdAt: "2026-10-21T16:12:53.786Z" } };
  const changelog = [changelogEntry("2026-10-23", "2026-10-23T09:00:00.000Z"), changelogEntry("2026-10-21", "2026-10-21T16:12:53.786Z")];
  const watch = harness(t, { source: recorded, reference: before, updatedAt: "2026-10-21T16:01:14.461Z", changelog });
  const [result] = await watch.run();
  assert.deepEqual(watch.requests, ["/reference", "/changelog"]);
  assert.equal(result.refreshed, false);
  assert.deepEqual(result.changelog.map((entry) => entry.slug), ["2026-10-23"]);
  assert.deepEqual(watch.schema()["x-cli-source"].changelog, { latest: "2026-10-23", createdAt: "2026-10-23T09:00:00.000Z" });
  assert.deepEqual(watch.schema().paths, before.paths);
});

test("--force re-reads an unchanged site and finds nothing", async (t) => {
  const watch = harness(t, { reference: before, updatedAt: "2026-10-21T16:01:14.461Z" });
  const [result] = await watch.run({ force: true });
  assert.equal(result.refreshed, true);
  for (const key of ["added", "removed", "deprecated", "undeprecated", "request", "response", "wording"]) assert.deepEqual(result.changes[key], [], key);
});

test("a failed site is reported and leaves its files alone", async (t) => {
  const watch = harness(t, { reference: after, updatedAt: "2026-10-22T12:46:42.779Z", fail: true });
  const original = readFileSync(join(watch.root, "openapi-spec.json"), "utf8");
  const results = await watch.run({ sites: [OPEN_API_DOCS, BOOKING_ENGINE_DOCS] });
  assert.equal(results.length, 2, "the second site is still checked");
  assert.match(results[0].error, /404/);
  assert.match(results[1].error, /booking-engine-openapi-spec\.json/, "the booking engine files are missing here");
  assert.equal(readFileSync(join(watch.root, "openapi-spec.json"), "utf8"), original);
});

test("changelog entries after the recorded one, or after a date when it's gone", () => {
  const entries = [{ slug: "c", createdAt: "2026-10-23T00:00:00Z" }, { slug: "b", createdAt: "2026-10-22T00:00:00Z" }, { slug: "a", createdAt: "2026-10-21T00:00:00Z" }];
  assert.deepEqual(newChangelogEntries(entries, { latest: "b" }).map((entry) => entry.slug), ["c"]);
  assert.deepEqual(newChangelogEntries(entries, { latest: "gone", createdAt: "2026-10-21T12:00:00Z" }).map((entry) => entry.slug), ["c", "b"]);
  assert.deepEqual(newChangelogEntries(entries, undefined, "2026-10-22T12:00:00Z").map((entry) => entry.slug), ["c"]);
  assert.deepEqual(newChangelogEntries(entries, undefined, undefined), []);
  assert.throws(() => readChangelog("<html></html>", BASE), /page data/);
});

test("the summary uses Pacific time and names the CLI work left", () => {
  const changes = describeChanges(fullSchema(before, {}), fullSchema(after, {}), OPEN_API);
  const cliSpec = {
    referenceCoverage: { missingImplementedEndpoints: [{ method: "POST", path: "/v1/orders", title: "Create order" }] },
    operations: [
      { fullCommand: "guesty items delete <id>", requests: [{ api: "open-api", method: "DELETE", path: "/v1/items/{param}" }] },
      { fullCommand: "guesty orders update <id>", requests: [{ api: "open-api", method: "PUT", path: "/v1/orders/{param}" }] },
      { fullCommand: "guesty booking-engine thing", requests: [{ api: "booking-engine", method: "PUT", path: "/v1/orders/{param}" }] },
    ],
  };
  const summary = formatSummary([
    { docs: OPEN_API_DOCS, refreshed: true, updatedAt: "2026-10-22T12:46:42.779Z", previousUpdatedAt: "2026-10-21T16:01:14.461Z", changelog: [], changes },
    { docs: BOOKING_ENGINE_DOCS, refreshed: false, updatedAt: "2026-06-01T13:04:19.980Z", pages: 19, changelog: [] },
  ], { changed: true, cliSpec, date: new Date("2026-10-23T06:30:00Z") });
  assert.match(summary, /^# Guesty documentation check, Oct 22, 2026/, "06:30 UTC is still the 22nd in Portland");
  assert.match(summary, /published this reference on Oct 22, 2026, 5:46 AM PDT; the CLI's copy was from Oct 21, 2026, 9:01 AM PDT/);
  assert.match(summary, /\*\*Added \(1\):\*\*\n {2}- `POST \/v1\/orders` Create order/);
  assert.match(summary, /Operations without a CLI command \(1\)/);
  assert.match(summary, /`guesty items delete <id>` calls `DELETE \/v1\/items\/\{id\}`/);
  assert.match(summary, /`guesty orders update <id>` calls `PUT \/v1\/orders\/\{id\}`/);
  assert.doesNotMatch(summary, /booking-engine thing/, "a Booking Engine request never matches an Open API operation");
  assert.match(summary, /Unchanged: Guesty last published this reference on Jun 1, 2026, 6:04 AM PDT \(19 pages\)/);
});
