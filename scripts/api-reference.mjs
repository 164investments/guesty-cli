const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options", "trace"]);

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

export function readDocumentationPage(html) {
  const match = html.match(/<script\b[^>]*\bid="ssr-props"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("Guesty documentation did not contain its OpenAPI data; reference files were not updated.");
  const page = JSON.parse(match[1]);
  if (!page.document?.api?.schema?.paths) throw new Error("Guesty documentation has no OpenAPI paths.");
  return page;
}

export function listOperations(schema) {
  const server = schema.servers?.[0]?.url;
  if (server !== "https://open-api.guesty.com/v1") {
    throw new Error("Expected the Guesty Open API server; refusing to mix API token scopes.");
  }
  const operations = [];
  for (const [path, item] of Object.entries(schema.paths ?? {})) {
    if (item.$ref) throw new Error(`Path Item references require explicit support before refreshing: ${path}`);
    for (const [method, operation] of Object.entries(item)) {
      if (!HTTP_METHODS.has(method)) continue;
      operations.push({ method: method.toUpperCase(), path: `/v1${path}`, operation, pathItem: item });
    }
  }
  if (!operations.length) throw new Error("The reference contains no HTTP operations.");
  return operations;
}

export function buildReference(page, previous = {}) {
  const pages = [];
  function walk(items) {
    for (const item of items ?? []) {
      if (item.type === "endpoint") pages.push(item);
      walk(item.pages);
    }
  }
  walk(page.sidebar);
  const slugs = new Set(pages.map((item) => item.slug));
  if (slugs.size !== pages.length) throw new Error("Documentation sidebar contains duplicate endpoint slugs.");
  const matched = new Set();
  const old = new Map(Object.entries(previous).flatMap(([group, entries]) =>
    entries.map((entry) => [`${entry.method} ${normalizePath(entry.path)}`, { ...entry, group }])
  ));
  const result = {};
  for (const { method, path, operation } of listOperations(page.document.api.schema)) {
    const existing = old.get(`${method} ${normalizePath(path)}`);
    const inferred = `${method.toLowerCase()}_${path.slice(4).replace(/[{}]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`.toLowerCase();
    let slug = [operation.operationId?.toLowerCase(), inferred, existing?.slug].find((value) => slugs.has(value));
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
    let target = schema;
    for (const part of value.$ref.slice(2).split("/")) target = target?.[part.replace(/~1/g, "/").replace(/~0/g, "~")];
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
