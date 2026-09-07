import test from "node:test";
import assert from "node:assert/strict";
import { buildReference, listOperations, operationSchemas, readDocumentationPage, requestMatchesEndpoint } from "../scripts/api-reference.mjs";

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
  assert.throws(() => readDocumentationPage("<html>Challenge page</html>"), /did not contain/);
  assert.throws(() => readDocumentationPage('<script id="ssr-props">{}</script>'), /no OpenAPI/);
  assert.throws(() => listOperations({ ...schema, servers: [{ url: "https://booking.guesty.com" }] }), /token scopes/);
  assert.throws(() => listOperations({ ...schema, paths: { "/items": { $ref: "#/components/pathItems/Items" } } }), /Path Item/);
  assert.equal(readDocumentationPage(`<script id="ssr-props" type="application/json">${JSON.stringify({ document: { api: { schema } } })}</script>`).document.api.schema.paths["/items/{id}"].get.summary, "Read item");
});
