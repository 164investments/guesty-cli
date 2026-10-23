import { readFileSync } from "node:fs";

// Every documented Guesty operation, from the catalogs and OpenAPI documents
// bundled with the CLI (the nightly docs watch keeps them current).
export type Api = "open-api" | "booking-engine";
type Json = Record<string, unknown>;

export interface Operation {
  /** Guesty's documentation slug: unique across both APIs and stable in its docs URL. */
  id: string;
  api: Api;
  group: string;
  method: string;
  /** Full request path, starting /v1/ (Open API) or /api/ (Booking Engine). */
  path: string;
  title: string;
  operationId?: string;
  docsUrl: string;
  deprecated: boolean;
  changesData: boolean;
  spec: Json;
  document: Json;
}

const DOCS: Record<Api, string> = {
  "open-api": "https://open-api-docs.guesty.com/reference/",
  "booking-engine": "https://booking-api-docs.guesty.com/reference/",
};
// POST operations that only read: a quote calculation and two CSV downloads.
// Every other non-GET operation changes data and needs the user's confirmation.
const READ_ONLY_POSTS = new Set([
  "post_additional-fees-quotes-quoteid-amount",
  "propertiesexportlistingscsvdownload",
  "reservationsv2listcsvdownload",
]);
const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];

function readJson(name: string): Json {
  return JSON.parse(readFileSync(new URL(`../../${name}`, import.meta.url), "utf8")) as Json;
}

function load(api: Api, catalogFile: string, documentFile: string, prefix: string): Operation[] {
  const catalog = readJson(catalogFile) as Record<string, { method: string; path: string; title: string; slug: string; operationId?: string }[]>;
  const document = readJson(documentFile);
  const byRoute = new Map<string, Json>();
  for (const [path, item] of Object.entries((document.paths ?? {}) as Record<string, Json>)) {
    for (const method of HTTP_METHODS) {
      const spec = item[method];
      if (spec && typeof spec === "object") byRoute.set(`${method.toUpperCase()} ${prefix}${path}`, spec as Json);
    }
  }
  const operations: Operation[] = [];
  for (const [group, entries] of Object.entries(catalog)) {
    for (const entry of entries) {
      const method = entry.method.toUpperCase();
      const spec = byRoute.get(`${method} ${entry.path}`) ?? {};
      operations.push({
        id: entry.slug,
        api,
        group,
        method,
        path: entry.path,
        title: entry.title,
        operationId: entry.operationId,
        docsUrl: `${DOCS[api]}${entry.slug}`,
        deprecated: spec.deprecated === true,
        changesData: method !== "GET" && !READ_ONLY_POSTS.has(entry.slug),
        spec,
        document,
      });
    }
  }
  return operations;
}

let cached: Operation[] | undefined;

export function operations(): Operation[] {
  cached ??= [
    ...load("open-api", "api-spec.json", "openapi-spec.json", "/v1"),
    ...load("booking-engine", "booking-engine-api-spec.json", "booking-engine-openapi-spec.json", ""),
  ];
  return cached;
}

/** Finds an operation by its id, its OpenAPI operationId, or "METHOD /path". */
export function findOperation(reference: string): Operation | undefined {
  const value = reference.trim();
  const route = /^([A-Za-z]+)\s+(\/\S*)$/.exec(value);
  return operations().find((op) =>
    op.id === value || op.operationId === value ||
    (route !== null && op.method === route[1].toUpperCase() && op.path === route[2]));
}

// ─── Search ───────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set(("a an the of for to in on by with and or my all me i how do does can is are be this that " +
  "from at as it its what which into per via api guesty please want need").split(" "));
const METHOD_WORDS: Record<string, string> = {
  GET: "get list read fetch show search find retrieve view",
  POST: "create add new post send make",
  PUT: "update edit change set modify replace",
  PATCH: "update edit change set modify",
  DELETE: "delete remove cancel",
};
// Words people use for the same thing Guesty names differently.
const SYNONYMS: Record<string, string[]> = {
  booking: ["reservation"], reservation: ["booking"], stay: ["reservation"],
  property: ["listing"], unit: ["listing"], home: ["listing"], house: ["listing"], rental: ["listing"],
  price: ["pricing", "rate"], rate: ["price", "pricing"], pricing: ["price", "rate"],
  availability: ["calendar"], available: ["calendar", "availability"], calendar: ["availability"],
  message: ["conversation", "post"], conversation: ["message"], chat: ["conversation", "message"], inbox: ["conversation"],
  payout: ["payment"], payment: ["payout", "charge"], charge: ["payment"], refund: ["payment"],
  guest: ["contact"], cleaning: ["task"], task: ["cleaning"], cleaner: ["task"],
  cancel: ["cancellation", "delete"], remove: ["delete"], delete: ["remove"],
  create: ["add"], add: ["create"], update: ["edit"], edit: ["update"],
  list: ["search", "retrieve", "get"], search: ["list", "find"], find: ["search", "list"], retrieve: ["get", "list"], get: ["retrieve"],
  show: ["get", "retrieve"], block: ["calendar", "update"],
};

// Spellings Guesty's titles use for the same word.
const VARIANTS: Record<string, string> = {
  cancellation: "cancel", canceled: "cancel", cancelled: "cancel", cancelling: "cancel", canceling: "cancel",
  msg: "message", messaging: "message",
  checking: "check", checkin: "check", checkout: "check",
};

function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(?:ss|x|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function words(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !STOP_WORDS.has(word))
    .map((word) => VARIANTS[stem(word)] ?? stem(word));
}

interface Indexed { op: Operation; fields: [Set<string>, number][]; titleWords: string[] }
let index: Indexed[] | undefined;

function indexed(): Indexed[] {
  index ??= operations().map((op) => {
    const description = typeof op.spec.description === "string" ? op.spec.description.slice(0, 600) : "";
    const summary = typeof op.spec.summary === "string" ? op.spec.summary : "";
    return {
      op,
      titleWords: words(op.title),
      fields: [
        [new Set(words(`${op.title} ${summary}`)), 4],
        [new Set(words(`${op.path} ${op.operationId ?? ""} ${op.group} ${op.id}`)), 3],
        [new Set(words(METHOD_WORDS[op.method] ?? "")), 1.5],
        [new Set(words(description)), 1],
      ],
    };
  });
  return index;
}

export interface SearchOptions { api?: Api; limit?: number; includeDeprecated?: boolean }

export function searchOperations(query: string, options: SearchOptions = {}): Operation[] {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 25);
  const exact = findOperation(query);
  const terms = [...new Set(words(query))];
  const pathQuery = query.trim().match(/\/[\w/{}.-]*/)?.[0];
  const scored: { op: Operation; score: number }[] = [];
  const related = new Set(terms.flatMap((term) => [term, ...(SYNONYMS[term] ?? [])]));
  for (const { op, fields, titleWords } of indexed()) {
    if (options.api && op.api !== options.api) continue;
    if (op.deprecated && !options.includeDeprecated && op !== exact) continue;
    let score = op === exact ? 100 : 0;
    if (pathQuery && pathQuery.length > 1 && op.path.startsWith(pathQuery)) score += op.path === pathQuery ? 20 : 8;
    let matched = 0;
    let inTitle = 0;
    for (const term of terms) {
      let best = 0;
      for (const [set, weight] of fields) if (set.has(term)) best = Math.max(best, weight);
      for (const synonym of SYNONYMS[term] ?? []) {
        for (const [set, weight] of fields) if (set.has(synonym)) best = Math.max(best, weight / 2);
      }
      if (best > 0) matched++;
      if (fields[0][0].has(term) || (SYNONYMS[term] ?? []).some((synonym) => fields[0][0].has(synonym))) inTitle++;
      score += best;
    }
    if (terms.length > 1 && matched === terms.length) score += 3;
    // Several of the words together in the title beat one word plus the path.
    if (inTitle > 1) score += 2 * (inTitle - 1);
    // Prefer titles that are mostly about what was asked.
    if (inTitle && titleWords.length) score += 4 * titleWords.filter((word) => related.has(word)).length / titleWords.length;
    if (score <= 0) continue;
    if (op.deprecated) score *= 0.6;
    scored.push({ op, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || Number(a.op.changesData) - Number(b.op.changesData) || a.op.path.length - b.op.path.length)
    .slice(0, limit)
    .map(({ op }) => op);
}

// ─── Describe ─────────────────────────────────────────────────────────────────

function trim(value: unknown, max: number): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const text = value.replace(/\s+\n/g, "\n").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function resolve(value: unknown, document: Json, seen: Set<string>): { schema: Json | undefined; ref?: string } {
  if (!value || typeof value !== "object") return { schema: undefined };
  const ref = (value as Json).$ref;
  if (typeof ref !== "string" || !ref.startsWith("#/")) return { schema: value as Json };
  if (seen.has(ref)) return { schema: undefined, ref };
  let target: unknown = document;
  for (const part of ref.slice(2).split("/")) target = (target as Json | undefined)?.[part.replace(/~1/g, "/").replace(/~0/g, "~")];
  return { schema: target && typeof target === "object" ? target as Json : undefined, ref };
}

// A schema small enough for an agent's context: descriptions trimmed, long
// lists capped, references resolved, and deep nesting cut with a docs pointer.
function compact(value: unknown, document: Json, depth: number, maxDepth: number, seen = new Set<string>()): unknown {
  const { schema, ref } = resolve(value, document, seen);
  if (!schema) return ref ? { note: `Recursive reference to ${ref.split("/").pop()}; see the docs.` } : value;
  const nextSeen = ref ? new Set([...seen, ref]) : seen;
  if (depth >= maxDepth) {
    return { type: schema.type ?? (schema.properties ? "object" : undefined), note: "More fields; see the docs." };
  }
  const out: Json = {};
  for (const key of ["type", "format", "nullable", "default", "minimum", "maximum", "minItems", "maxItems", "pattern"]) {
    if (schema[key] !== undefined) out[key] = schema[key];
  }
  const description = trim(schema.description, 240);
  if (description) out.description = description;
  if (Array.isArray(schema.enum)) out.enum = schema.enum.length > 25 ? [...schema.enum.slice(0, 25), "…"] : schema.enum;
  if (schema.example !== undefined && JSON.stringify(schema.example).length <= 160) out.example = schema.example;
  if (Array.isArray(schema.required) && schema.required.length) out.required = schema.required;
  if (schema.items) out.items = compact(schema.items, document, depth + 1, maxDepth, nextSeen);
  if (schema.properties && typeof schema.properties === "object") {
    const entries = Object.entries(schema.properties as Json);
    out.properties = Object.fromEntries(entries.slice(0, 60).map(([name, child]) => [name, compact(child, document, depth + 1, maxDepth, nextSeen)]));
    if (entries.length > 60) out.note = `${entries.length - 60} more properties; see the docs.`;
  }
  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    out.additionalProperties = compact(schema.additionalProperties, document, depth + 1, maxDepth, nextSeen);
  }
  for (const key of ["oneOf", "anyOf", "allOf"]) {
    if (Array.isArray(schema[key])) out[key] = (schema[key] as unknown[]).slice(0, 10).map((child) => compact(child, document, depth + 1, maxDepth, nextSeen));
  }
  return out;
}

function compactSchema(schema: unknown, document: Json): unknown {
  for (const maxDepth of [6, 4, 2]) {
    const result = compact(schema, document, 0, maxDepth);
    if (JSON.stringify(result).length <= 20_000) return result;
  }
  return { note: "This schema is too large to show; see the docs." };
}

// Top-level response fields, plus the fields of each item in a results list.
function responseShape(schema: unknown, document: Json): unknown {
  const { schema: resolved } = resolve(schema, document, new Set());
  if (!resolved) return undefined;
  const properties = resolved.properties as Json | undefined;
  if (resolved.type === "array" || resolved.items) {
    const item = resolve(resolved.items, document, new Set()).schema;
    const keys = item?.properties ? Object.keys(item.properties as Json) : [];
    return keys.length ? { array_of: keys.slice(0, 40) } : { type: "array" };
  }
  if (!properties) return resolved.type ? { type: resolved.type } : undefined;
  const shape: Json = { fields: Object.keys(properties).slice(0, 40) };
  for (const [name, child] of Object.entries(properties)) {
    const list = resolve(child, document, new Set()).schema;
    const item = list?.type === "array" ? resolve(list.items, document, new Set()).schema : undefined;
    if (item?.properties) shape[`${name}[]`] = Object.keys(item.properties as Json).slice(0, 40);
  }
  return shape;
}

export interface Parameter { name: string; in: string; required: boolean; type?: unknown; description?: string; enum?: unknown[]; default?: unknown; example?: unknown }

export function parameters(op: Operation): Parameter[] {
  const list = Array.isArray(op.spec.parameters) ? op.spec.parameters : [];
  const result: Parameter[] = [];
  for (const raw of list) {
    const param = resolve(raw, op.document, new Set()).schema;
    if (!param || typeof param.name !== "string" || typeof param.in !== "string") continue;
    if (param.in === "header" && /^authorization$/i.test(param.name)) continue;
    const schema = resolve(param.schema, op.document, new Set()).schema ?? {};
    result.push({
      name: param.name,
      in: param.in,
      required: param.required === true || param.in === "path",
      type: schema.type ?? (schema.oneOf ? "one of several types" : undefined),
      description: trim(param.description ?? schema.description, 300),
      enum: Array.isArray(schema.enum) ? schema.enum.slice(0, 25) : undefined,
      default: schema.default,
      example: param.example ?? schema.example,
    });
  }
  // Path parameters Guesty's page left undocumented still have to be filled in.
  for (const name of op.path.match(/\{([^}]+)\}/g)?.map((part) => part.slice(1, -1)) ?? []) {
    if (!result.some((param) => param.in === "path" && param.name === name)) result.push({ name, in: "path", required: true, type: "string" });
  }
  return result;
}

export function describeOperation(op: Operation): Json {
  const params = parameters(op);
  const body = resolve(op.spec.requestBody, op.document, new Set()).schema;
  const content = (body?.content ?? {}) as Record<string, Json>;
  const contentType = Object.keys(content).find((type) => type.includes("json")) ?? Object.keys(content)[0];
  const responses: Json = {};
  for (const [status, raw] of Object.entries((op.spec.responses ?? {}) as Json)) {
    if (!/^2\d\d$/.test(status)) continue;
    const response = resolve(raw, op.document, new Set()).schema;
    const media = (response?.content ?? {}) as Record<string, Json>;
    const json = Object.entries(media).find(([type]) => type.includes("json"))?.[1];
    responses[status] = json ? responseShape(json.schema, op.document) ?? trim(response?.description, 200) : trim(response?.description, 200) ?? "No content";
  }
  const example: Json = { operation: op.id };
  const pathParams = params.filter((param) => param.in === "path");
  if (pathParams.length) example.path_params = Object.fromEntries(pathParams.map((param) => [param.name, `<${param.name}>`]));
  const requiredQuery = params.filter((param) => param.in === "query" && param.required);
  if (requiredQuery.length) example.query = Object.fromEntries(requiredQuery.map((param) => [param.name, `<${param.name}>`]));
  if (body) example.body = "<object matching request_body.schema>";
  if (op.changesData) example.confirm = true;
  return {
    id: op.id,
    api: op.api,
    method: op.method,
    path: op.path,
    title: op.title,
    docs: op.docsUrl,
    changes_data: op.changesData,
    ...(op.deprecated ? { deprecated: "Guesty marks this operation deprecated. Search for its replacement before using it." } : {}),
    description: trim(op.spec.description, 2_500) ?? trim(op.spec.summary, 500),
    parameters: params,
    request_body: body ? {
      required: body.required === true,
      content_type: contentType,
      ...(contentType && !contentType.includes("json")
        ? { note: `This operation takes ${contentType}, which call_operation can't send. Use the matching Guesty CLI command in a terminal instead.` }
        : { schema: contentType ? compactSchema(content[contentType]?.schema, op.document) : undefined }),
    } : null,
    responses,
    example_call: example,
  };
}

export function listing(op: Operation): Json {
  const summary = trim(typeof op.spec.description === "string" ? op.spec.description.split(/\n\s*\n|(?<=\.)\s/)[0] : undefined, 200);
  return {
    id: op.id,
    api: op.api,
    method: op.method,
    path: op.path,
    title: op.title,
    ...(summary && summary !== op.title ? { summary } : {}),
    changes_data: op.changesData,
    ...(op.deprecated ? { deprecated: true } : {}),
  };
}
