import test from "node:test";
import assert from "node:assert/strict";
import {
  assertOperationCount, buildReference, diffOperations, listOperations, listReferencePages, mergeReferenceSchemas,
  operationSchemas, readDocumentationIndex, readReferenceMarkdown, requestMatchesEndpoint,
} from "../scripts/api-reference.mjs";

const schema = {
  servers: [{ url: "https://open-api.guesty.com/v1" }],
  paths: { "/items/{id}": {
    "x-summary": "Not an HTTP operation",
    parameters: [{ $ref: "#/components/parameters/ItemId" }],
    get: { operationId: "Items_get", summary: "Read item", parameters: [{ name: "limit", in: "query", schema: { type: "integer", maximum: 20 } }], responses: { 200: { description: "Item", content: { "application/json": { schema: { $ref: "#/components/schemas/Item" } } } } } },
    patch: { operationId: "Items_patch", summary: "Update item", deprecated: true, requestBody: { required: true, content: { "application/json": { schema: { anyOf: [{ required: ["name"] }, { required: ["code"] }] } } } }, responses: { 204: { description: "No content" } } },
  } },
  components: { parameters: { ItemId: { name: "id", in: "path", required: true, schema: { type: "string" } } }, schemas: { Item: { type: "object", required: ["id"], properties: { id: { type: "string" } } } } },
};

test("reference matching recognizes fixed query variants only when the request supplies their values", () => {
  const endpoint = { method: "GET", path: "/v1/listings/{id}?fields=paymentProviderId" };
  const request = { method: "GET", path: "/v1/listings/{listingId}", queryParams: [{ name: "fields", source: '"paymentProviderId"' }] };
  assert.equal(requestMatchesEndpoint(request, endpoint), true);
  assert.equal(requestMatchesEndpoint({ ...request, queryParams: [] }, endpoint), false);
  assert.equal(requestMatchesEndpoint({ ...request, queryParams: [{ name: "fields", source: "opts.fields" }] }, endpoint), false);
  assert.equal(requestMatchesEndpoint({ ...request, method: "PUT" }, endpoint), false);
  assert.equal(requestMatchesEndpoint({ method: "GET", path: "/v1/listings/{id}?fields=paymentProviderId" }, endpoint), true);
});

test("reference discovery retains every HTTP method and ignores path metadata", () => {
  const operations = listOperations(schema);
  assert.deepEqual(operations.map((op) => [op.method, op.path]), [["GET", "/v1/items/{id}"], ["PATCH", "/v1/items/{id}"]]);
  const page = { document: { api: { schema } }, sidebar: [{ pages: [
    { type: "endpoint", slug: "items_get", api_method: "get", title: "Read item", parent: "/reference/items" },
    { type: "endpoint", slug: "items_patch", api_method: "patch", title: "Update item", parent: "/reference/items" },
  ] }] };
  const catalog = buildReference(page);
  assert.equal(catalog.items.length, 2);
  assert.equal(catalog.items[1].deprecated, true);
  assert.throws(() => buildReference({ ...page, sidebar: [] }), /Cannot match/);
  const incomplete = structuredClone(page);
  delete incomplete.document.api.schema.paths["/items/{id}"].patch;
  assert.throws(() => buildReference(incomplete), /incomplete/);
  const duplicate = structuredClone(page);
  duplicate.sidebar[0].pages.push(duplicate.sidebar[0].pages[0]);
  assert.throws(() => buildReference(duplicate), /duplicate/);
});

test("schema extraction preserves shared parameters, constraints, references and variants", () => {
  const item = schema.paths["/items/{id}"];
  const get = operationSchemas(schema, item, item.get);
  assert.equal(get.parameters[0].required, true);
  assert.equal(get.parameters[1].schema.maximum, 20);
  assert.equal(get.responses[200].schema.$ref, "#/components/schemas/Item");
  const patch = operationSchemas(schema, item, item.patch);
  assert.equal(patch.requestBody.required, true);
  assert.deepEqual(patch.requestBody.schema.anyOf, [{ required: ["name"] }, { required: ["code"] }]);
  assert.equal(patch.deprecated, true);
});

test("reference refresh fails closed on changed pages or wrong API scope", () => {
  assert.throws(() => readDocumentationIndex("<html>Hello there, human!</html>"), /did not contain/);
  assert.throws(() => readDocumentationIndex('<script id="ssr-props">{}</script>'), /no API reference navigation/);
  assert.throws(() => listOperations({ ...schema, servers: [{ url: "https://booking.guesty.com" }] }), /token scopes/);
  assert.throws(() => listOperations({ ...schema, paths: { "/items": { $ref: "#/components/pathItems/Items" } } }), /Path Item/);
  const sidebar = [{ title: "API", pages: [{ type: "endpoint", slug: "items_get", api_method: "get" }] }];
  const ssr = (data) => `<script id="ssr-props" type="application/json">${JSON.stringify(data)}</script>`;
  assert.deepEqual(readDocumentationIndex(ssr({ sidebar })).sidebar, sidebar);
  assert.deepEqual(readDocumentationIndex(ssr({ referenceCategories: sidebar })).sidebar, sidebar, "the home page names the navigation differently");
});

test("reference discovery lists nested endpoint pages and skips guides and webhooks", () => {
  const sidebar = [
    { title: "Getting Started", pages: [{ type: "basic", slug: "get-started", pages: [] }] },
    { title: "API", pages: [{ type: "basic", slug: "items", pages: [
      { type: "endpoint", slug: "items_get", api_method: "get", pages: [] },
      { type: "endpoint", slug: "items_hook", api_method: "post", api_webhook: true, pages: [] },
      { type: "basic", slug: "nested", pages: [{ type: "endpoint", slug: "items_patch", api_method: "patch" }] },
    ] }] },
  ];
  assert.deepEqual(listReferencePages(sidebar).map((page) => page.slug), ["items_get", "items_patch"]);
  sidebar[1].pages[0].pages.push({ type: "endpoint", slug: "items_get", api_method: "get" });
  assert.throws(() => listReferencePages(sidebar), /duplicate/);
});

test("reference markdown yields the page's OpenAPI definition, not an example in its description", () => {
  const definition = { openapi: "3.0.3", paths: { "/items": { get: { summary: "List items" } } } };
  const markdown = [
    "---", "updatedAt: 2026-10-18T15:12:58.000Z", "---", "", "# List items", "",
    "Example response:", "", "```json", '{ "results": [] }', "```", "",
    "# OpenAPI definition", "", "```json", JSON.stringify(definition, null, 2), "```", "",
  ].join("\n");
  assert.deepEqual(readReferenceMarkdown(markdown, "items_get"), definition);
  assert.throws(() => readReferenceMarkdown("Page not found.", "missing"), /missing has no OpenAPI definition/);
  assert.throws(() => readReferenceMarkdown("\n# OpenAPI definition\n\n```json\n{ broken\n```", "broken"), /unreadable/);
  assert.throws(() => readReferenceMarkdown("\n# OpenAPI definition\n\n```json\n{}\n```", "empty"), /no OpenAPI paths/);
});

const base = { openapi: "3.0.3", info: { title: "GUESTY OPEN API", version: "1" }, servers: [{ url: "https://open-api.guesty.com/v1" }], security: [{ bearerAuth: [] }], "x-kong-upstream-prefix": "/integrations/brands" };
const securitySchemes = { bearerAuth: { type: "http", scheme: "bearer" } };
const referencePage = (slug, method, path, operation, extra = {}) => ({
  slug, method,
  schema: { ...base, tags: [{ name: operation.tags[0] }], paths: { [path]: { [method.toLowerCase()]: operation } }, components: { securitySchemes, ...extra } },
});
const listItems = { tags: ["Items"], summary: "List items", responses: { 200: { description: "Items", content: { "application/json": { schema: { $ref: "#/components/schemas/Item" } } } } } };
const createItem = { tags: ["Items"], operationId: "itemsCreate", summary: "Create item", responses: { 201: { description: "Created" } } };
const getOrder = { tags: ["Orders"], summary: "Get order", responses: { 200: { description: "Order" } } };
const itemSchemas = { schemas: { Item: { type: "object" } } };

test("reference pages merge into one OpenAPI document with every path, method, component and tag", () => {
  const { schema: merged, operationSlugs } = mergeReferenceSchemas([
    referencePage("orders_get", "get", "/orders/{id}", getOrder),
    referencePage("item_list", "get", "/items", listItems, itemSchemas),
    referencePage("item_create", "POST", "/items", createItem, itemSchemas),
  ]);
  assert.deepEqual(Object.keys(merged), ["openapi", "info", "servers", "security", "tags", "paths", "components", "x-kong-upstream-prefix"]);
  assert.deepEqual(Object.keys(merged.paths), ["/items", "/orders/{id}"]);
  assert.deepEqual(Object.keys(merged.paths["/items"]), ["get", "post"]);
  assert.deepEqual(merged.tags, [{ name: "Orders" }, { name: "Items" }]);
  assert.deepEqual(merged.components, { schemas: { Item: { type: "object" } }, securitySchemes });
  assert.deepEqual([...operationSlugs], [["GET /orders/{id}", "orders_get"], ["GET /items", "item_list"], ["POST /items", "item_create"]]);

  const sidebar = [{ pages: [
    { type: "endpoint", slug: "item_list", api_method: "get", title: "Items", parent: "/branches/1.0/reference/items" },
    { type: "endpoint", slug: "item_create", api_method: "post", title: "Create item", parent: "/branches/1.0/reference/items" },
    { type: "endpoint", slug: "orders_get", api_method: "get", title: "Order", parent: "/branches/1.0/reference/orders" },
  ] }];
  const catalog = buildReference({ document: { api: { schema: merged } }, sidebar, operationSlugs }, { legacy: [{ method: "GET", path: "/v1/orders/{orderId}", slug: "get_orders-id" }] });
  assert.deepEqual(catalog.items.map((entry) => entry.slug), ["item_list", "item_create"], "slugs come from the page each operation was read from");
  assert.equal(catalog.legacy[0].slug, "orders_get", "known operations keep their group and gain the current slug");
});

test("reference merging refuses pages that disagree, overlap or miss their operation", () => {
  const items = referencePage("item_list", "get", "/items", listItems, itemSchemas);
  const conflict = (changes, pattern) => assert.throws(() => mergeReferenceSchemas([items, changes(structuredClone(items))]), pattern);
  conflict((page) => { page.slug = "copy"; return page; }, /item_list and copy both describe GET \/items/);
  conflict((page) => { page.slug = "other"; page.method = "post"; page.schema.paths["/items"].post = createItem; page.schema.components.schemas.Item = { type: "string" }; return page; }, /redefines components.schemas.Item/);
  conflict((page) => { page.slug = "other"; page.method = "post"; page.schema.paths["/items"] = { post: createItem, get: getOrder }; return page; }, /conflicts with an earlier page on GET \/items/);
  conflict((page) => { page.slug = "other"; page.method = "post"; page.schema.paths["/items"] = { post: createItem }; page.schema.servers = [{ url: "https://booking.guesty.com" }]; return page; }, /disagrees with earlier pages on "servers"/);
  assert.throws(() => mergeReferenceSchemas([{ ...items, method: "delete" }]), /item_list should describe one DELETE operation; it describes 0/);
  assert.throws(() => mergeReferenceSchemas([referencePage("item_list", "get", "/items", listItems)]), /1 schema reference\(s\) unresolved, including #\/components\/schemas\/Item/);
  assert.throws(() => mergeReferenceSchemas([]), /No reference pages/);
});

test("operation counts report additions and removals and refuse a sharp drop", () => {
  const before = { ...base, paths: { "/items": { get: listItems, post: createItem } } };
  const after = { ...base, paths: { "/items": { get: listItems }, "/orders/{id}": { get: getOrder } } };
  assert.deepEqual(diffOperations(before, after), { previous: 2, current: 2, added: ["GET /v1/orders/{id}"], removed: ["POST /v1/items"] });
  assert.deepEqual(diffOperations(null, after).added.length, 2);
  assertOperationCount(300, 333, 0.9);
  assert.throws(() => assertOperationCount(299, 333, 0.9), /299 operations, below 90% of the previous 333.*--allow-shrink/);
  assertOperationCount(10, 333, 0);
  assertOperationCount(10, 0, 0.9);
});
