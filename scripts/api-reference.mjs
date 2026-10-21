import { isDeepStrictEqual } from "node:util";

const METHOD_ORDER = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
const HTTP_METHODS = new Set(METHOD_ORDER);

// Each API has its own server, token type and path prefix. A reference document
// must name its API's server, so the two token scopes are never mixed.
export const OPEN_API = { label: "Open API", server: "https://open-api.guesty.com/v1", pathPrefix: "/v1" };
export const BOOKING_ENGINE_API = { label: "Booking Engine API", server: "https://booking.guesty.com/", pathPrefix: "" };

export function normalizePath(path) {
  return path.replace(/\{[^}]+\}/g, "{param}");
}

// Guesty's reference also contains fixed-query variants of existing routes.
export function requestMatchesEndpoint(request, endpoint) {
  if (!request.path || request.method !== endpoint.method) return false;
  const [requestPath, requestQuery = ""] = request.path.split("?");
  const [endpointPath, endpointQuery = ""] = endpoint.path.split("?");
  if (normalizePath(requestPath) !== normalizePath(endpointPath)) return false;
  const actual = new URLSearchParams(requestQuery);
  for (const param of request.queryParams ?? []) {
    try {
      const value = JSON.parse(param.source);
      if (["string", "number", "boolean"].includes(typeof value)) actual.set(param.name, String(value));
    } catch { /* Dynamic expressions cannot prove a fixed query value. */ }
  }
  return [...new URLSearchParams(endpointQuery)].every(([key, value]) => actual.getAll(key).includes(value));
}

// Any page of the documentation site embeds the reference navigation: reference
// pages call it `sidebar`, the home page `referenceCategories`.
export function readDocumentationIndex(html) {
  const match = html.match(/<script\b[^>]*\bid="ssr-props"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Guesty documentation did not contain its page data; reference files were not updated.");
  const page = JSON.parse(match[1]);
  const sidebar = page.sidebar ?? page.referenceCategories;
  if (!Array.isArray(sidebar) || !sidebar.length) throw new Error("Guesty documentation has no API reference navigation.");
  return { ...page, sidebar };
}

// Webhook pages describe callbacks Guesty sends, not operations the CLI can call.
export function listReferencePages(sidebar) {
  const pages = [];
  function walk(items) {
    for (const item of items ?? []) {
      if (item.type === "endpoint" && !item.api_webhook) pages.push(item);
      walk(item.pages);
    }
  }
  walk(sidebar);
  if (new Set(pages.map((item) => item.slug)).size !== pages.length) throw new Error("Documentation sidebar contains duplicate endpoint slugs.");
  return pages;
}

// A page's description may contain its own ```json examples, so read the block
// under the last "OpenAPI definition" heading.
export function readReferenceMarkdown(markdown, slug) {
  const heading = markdown.lastIndexOf("\n# OpenAPI definition");
  const block = heading === -1 ? null : /```json\r?\n([\s\S]*?)\r?\n```/.exec(markdown.slice(heading));
  if (!block) throw new Error(`Reference page ${slug} has no OpenAPI definition.`);
  let schema;
  try {
    schema = JSON.parse(block[1]);
  } catch {
    throw new Error(`Reference page ${slug} has an unreadable OpenAPI definition.`);
  }
  if (!schema?.paths || typeof schema.paths !== "object") throw new Error(`Reference page ${slug} has no OpenAPI paths.`);
  return schema;
}

function orderPathItem(item) {
  const fields = Object.entries(item).filter(([key]) => !HTTP_METHODS.has(key));
  const methods = METHOD_ORDER.filter((method) => method in item).map((method) => [method, item[method]]);
  return Object.fromEntries([...fields, ...methods]);
}

// Each reference page carries a reduced copy of the same OpenAPI document: its
// own operation plus the components it references. Merge them back into one
// document and refuse any disagreement instead of guessing which page is right.
export function mergeReferenceSchemas(pages) {
  if (!pages.length) throw new Error("No reference pages to merge.");
  const document = {};
  const tags = new Map();
  const paths = {};
  const components = {};
  const operationSlugs = new Map();
  for (const { slug, schema, ...page } of pages) {
    const method = page.method.toLowerCase();
    for (const [key, value] of Object.entries(schema)) {
      if (["paths", "components", "tags"].includes(key)) continue;
      if (!(key in document)) document[key] = value;
      else if (!isDeepStrictEqual(document[key], value)) throw new Error(`Reference page ${slug} disagrees with earlier pages on "${key}".`);
    }
    for (const tag of schema.tags ?? []) if (!tags.has(tag.name)) tags.set(tag.name, tag);
    for (const [type, entries] of Object.entries(schema.components ?? {})) {
      const target = (components[type] ??= {});
      for (const [name, value] of Object.entries(entries)) {
        if (!(name in target)) target[name] = value;
        else if (!isDeepStrictEqual(target[name], value)) throw new Error(`Reference page ${slug} redefines components.${type}.${name}.`);
      }
    }
    const own = [];
    for (const [path, item] of Object.entries(schema.paths)) {
      const target = (paths[path] ??= {});
      for (const [key, value] of Object.entries(item)) {
        if (key in target && !isDeepStrictEqual(target[key], value)) {
          throw new Error(`Reference page ${slug} conflicts with an earlier page on ${HTTP_METHODS.has(key) ? `${key.toUpperCase()} ${path}` : `${path} ${key}`}.`);
        }
        target[key] = value;
        if (key === method) own.push(path);
      }
    }
    if (own.length !== 1) throw new Error(`Reference page ${slug} should describe one ${method.toUpperCase()} operation; it describes ${own.length}.`);
    const id = `${method.toUpperCase()} ${own[0]}`;
    if (operationSlugs.has(id)) throw new Error(`Reference pages ${operationSlugs.get(id)} and ${slug} both describe ${id}.`);
    operationSlugs.set(id, slug);
  }
  const { openapi, info, servers, security, ...extensions } = document;
  const sorted = (object, map = (value) => value) => Object.fromEntries(Object.keys(object).sort().map((key) => [key, map(object[key])]));
  const schema = {
    openapi, info, servers, security,
    tags: [...tags.values()],
    paths: sorted(paths, orderPathItem),
    components: sorted(components, (entries) => sorted(entries)),
    ...extensions,
  };
  const unresolved = new Set();
  (function walk(value) {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    if (typeof value.$ref === "string" && !resolvePointer(schema, value.$ref)) unresolved.add(value.$ref);
    Object.values(value).forEach(walk);
  })(schema);
  if (unresolved.size) throw new Error(`Reference pages left ${unresolved.size} schema reference(s) unresolved, including ${[...unresolved][0]}.`);
  return { schema, operationSlugs };
}

function resolvePointer(schema, ref) {
  if (!ref.startsWith("#/")) return undefined;
  let target = schema;
  for (const part of ref.slice(2).split("/")) target = target?.[part.replace(/~1/g, "/").replace(/~0/g, "~")];
  return target;
}

export function diffOperations(previous, current, api = OPEN_API) {
  const keys = (schema) => new Set(schema ? listOperations(schema, api).map(({ method, path }) => `${method} ${path}`) : []);
  const before = keys(previous);
  const after = keys(current);
  return {
    previous: before.size,
    current: after.size,
    added: [...after].filter((key) => !before.has(key)).sort(),
    removed: [...before].filter((key) => !after.has(key)).sort(),
  };
}

export function assertOperationCount(current, previous, minimumRatio, subject = "operations") {
  if (previous > 0 && current < previous * minimumRatio) {
    throw new Error(`Guesty documentation now lists ${current} ${subject}, below ${Math.round(minimumRatio * 100)}% of the previous ${previous} operations; no reference files were updated. Confirm the removals, then rerun with --allow-shrink.`);
  }
}

export function listOperations(schema, api = OPEN_API) {
  const server = schema.servers?.[0]?.url;
  if (server !== api.server) {
    throw new Error(`Expected the Guesty ${api.label} server; refusing to mix API token scopes.`);
  }
  const operations = [];
  for (const [path, item] of Object.entries(schema.paths ?? {})) {
    if (item.$ref) throw new Error(`Path Item references require explicit support before refreshing: ${path}`);
    for (const [method, operation] of Object.entries(item)) {
      if (!HTTP_METHODS.has(method)) continue;
      operations.push({ method: method.toUpperCase(), path: `${api.pathPrefix}${path}`, schemaPath: path, operation, pathItem: item });
    }
  }
  if (!operations.length) throw new Error("The reference contains no HTTP operations.");
  return operations;
}

// page.operationSlugs, when present, maps "METHOD /schema/path" to the page the
// operation was read from, which is the most reliable match.
export function buildReference(page, previous = {}, api = OPEN_API) {
  const pages = listReferencePages(page.sidebar);
  const slugs = new Set(pages.map((item) => item.slug));
  const matched = new Set();
  const old = new Map(Object.entries(previous).flatMap(([group, entries]) =>
    entries.map((entry) => [`${entry.method} ${normalizePath(entry.path)}`, { ...entry, group }])
  ));
  const result = {};
  for (const { method, path, schemaPath, operation } of listOperations(page.document.api.schema, api)) {
    const existing = old.get(`${method} ${normalizePath(path)}`);
    const inferred = `${method.toLowerCase()}_${path.slice(api.pathPrefix.length + 1).replace(/[{}]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`.toLowerCase();
    let slug = [page.operationSlugs?.get(`${method} ${schemaPath}`), operation.operationId?.toLowerCase(), inferred, existing?.slug].find((value) => slugs.has(value));
    if (!slug) {
      const matches = pages.filter((item) => item.api_method === method.toLowerCase() && item.title === operation.summary);
      if (matches.length === 1) slug = matches[0].slug;
    }
    if (!slug) throw new Error(`Cannot match a current documentation page for ${method} ${path}.`);
    const doc = pages.find((item) => item.slug === slug);
    if (doc.api_method !== method.toLowerCase() || matched.has(slug)) {
      throw new Error(`Ambiguous documentation match for ${method} ${path}.`);
    }
    matched.add(slug);
    const group = existing?.group ?? doc.parent?.split("/").pop() ?? path.split("/")[2];
    (result[group] ??= []).push({
      method, path, title: operation.summary ?? doc.title, slug,
      ...(operation.operationId ? { operationId: operation.operationId } : {}),
      ...(operation.deprecated ? { deprecated: true } : {}),
    });
  }
  if (matched.size !== slugs.size) throw new Error("The OpenAPI schema is incomplete relative to the current documentation sidebar.");
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)).map(([group, entries]) =>
    [group, entries.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))]
  ));
}

export function operationSchemas(schema, pathItem, operation) {
  function resolve(value) {
    if (!value?.$ref) return value;
    if (!value.$ref.startsWith("#/")) throw new Error(`External schema reference is unsupported: ${value.$ref}`);
    const target = resolvePointer(schema, value.$ref);
    if (!target) throw new Error(`Unresolved schema reference: ${value.$ref}`);
    return { ...target, ...Object.fromEntries(Object.entries(value).filter(([key]) => key !== "$ref")) };
  }
  const params = new Map();
  for (const raw of [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]) {
    const parameter = resolve(raw);
    params.set(`${parameter.in}:${parameter.name}`, parameter);
  }
  const result = { deprecated: operation.deprecated === true };
  if (params.size) result.parameters = [...params.values()].map((parameter) => ({
    ...parameter,
    required: parameter.required ?? false,
    type: parameter.schema?.type ?? null,
    enum: parameter.schema?.enum ?? null,
    default: parameter.schema?.default ?? null,
    example: parameter.example ?? parameter.schema?.example ?? null,
  }));
  if (operation.requestBody) {
    const body = resolve(operation.requestBody);
    const contentType = body.content?.["application/json"] ? "application/json" : Object.keys(body.content ?? {})[0];
    result.requestBody = { ...body, required: body.required ?? false, contentType, schema: body.content?.[contentType]?.schema };
    // Keep the old convenience shape while retaining alternate media types.
    delete result.requestBody.content;
    if (Object.keys(body.content ?? {}).length > 1) result.requestBody.content = body.content;
  }
  result.responses = Object.fromEntries(Object.entries(operation.responses ?? {}).map(([status, raw]) => {
    const response = resolve(raw);
    const contentType = response.content?.["application/json"] ? "application/json" : Object.keys(response.content ?? {})[0];
    const entry = { ...response, ...(contentType ? { contentType, schema: response.content[contentType]?.schema } : {}) };
    delete entry.content;
    if (Object.keys(response.content ?? {}).length > 1) entry.content = response.content;
    return [status, entry];
  }));
  return result;
}
