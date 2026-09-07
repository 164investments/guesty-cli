import { getToken, invalidateToken } from "./auth.js";

const BASE_URL = "https://open-api.guesty.com";
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_TIMER_MS = 2_147_483_647;
// https://open-api-docs.guesty.com/docs/rate-limits
const RATE_LIMITS = [
  { window: 1_000, max: 15 },
  { window: 60_000, max: 120 },
  { window: 3_600_000, max: 5_000 },
];
const requestTimestamps: number[] = [];
type QueryValue = string | number | boolean;
export type QueryParams = Record<string, QueryValue | QueryValue[] | null | undefined>;
export type ResponseType = "auto" | "json" | "text" | "buffer";

async function sleep(ms: number): Promise<void> {
  // Node treats an overflowing timeout as 1ms. Never retry earlier than requested.
  let remaining = ms;
  while (remaining > 0) {
    const duration = Math.min(remaining, MAX_TIMER_MS);
    await new Promise((resolve) => setTimeout(resolve, duration));
    remaining -= duration;
  }
}

async function enforceRateLimit(): Promise<void> {
  while (true) {
    const now = Date.now();
    while (requestTimestamps.length && requestTimestamps[0] <= now - 3_600_000) {
      requestTimestamps.shift();
    }
    let waitMs = 0;
    for (const { window, max } of RATE_LIMITS) {
      const oldest = requestTimestamps[requestTimestamps.length - max];
      if (oldest !== undefined) waitMs = Math.max(waitMs, oldest + window - now);
    }
    if (waitMs <= 0) {
      requestTimestamps.push(now);
      return;
    }
    process.stderr.write(`Guesty rate limit reached. Waiting ${Math.ceil(waitMs / 1000)}s...\n`);
    await sleep(waitMs);
  }
}

function resourceUrl(path: string, params?: QueryParams): URL {
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(path)) {
    throw new Error("Use an absolute Guesty Open API resource path, such as /v1/listings.");
  }
  const url = new URL(path, BASE_URL);
  if (url.origin !== BASE_URL || url.hash) {
    throw new Error("Use an absolute Guesty Open API resource path without a URL fragment.");
  }
  let normalizedPath = url.pathname;
  // Check each decoding level so encoded separators cannot hide an OAuth path.
  for (let level = 0; level <= path.length; level++) {
    if (/(?:^|[\\/])oauth2?(?:[\\/;?#]|$)/i.test(normalizedPath)) {
      throw new Error("Guesty OAuth endpoints are disabled in this CLI. Use the designated server token-refresh workflow.");
    }
    if (!/%[\da-f]{2}/i.test(normalizedPath)) break;
    try {
      const decoded = decodeURIComponent(normalizedPath);
      if (decoded === normalizedPath) break;
      normalizedPath = decoded;
    } catch {
      throw new Error("The Guesty resource path contains invalid percent encoding.");
    }
  }
  if (params !== undefined) {
    if (!params || typeof params !== "object" || Array.isArray(params)) {
      throw new Error("Query params must be a JSON object of scalar values or arrays of scalar values.");
    }
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      const values = Array.isArray(value) ? value : [value];
      if (values.some((entry) => !["string", "number", "boolean"].includes(typeof entry) ||
        (typeof entry === "number" && !Number.isFinite(entry)))) {
        throw new Error(`Query parameter '${key}' must contain strings, finite numbers, or booleans. Encode JSON objects as strings.`);
      }
      url.searchParams.delete(key);
      for (const entry of values) url.searchParams.append(key, String(entry));
    }
  }
  return url;
}

function isBinaryBody(body: unknown): body is Uint8Array | ArrayBuffer {
  return body instanceof Uint8Array || body instanceof ArrayBuffer;
}

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  if (typeof body === "string" || body instanceof URLSearchParams || body instanceof FormData || body instanceof Blob) {
    return body;
  }
  if (isBinaryBody(body)) return body as BodyInit;
  return JSON.stringify(body);
}

function retryDelay(header: string | null, fallback: number): number {
  if (header === null) return fallback;
  const value = header.trim();
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    const seconds = Number(value);
    return Number.isFinite(seconds * 1000) ? Math.ceil(seconds * 1000) : fallback;
  }
  // HTTP-date is the other valid Retry-After representation (RFC 9110 §10.2.3).
  const date = /^[A-Za-z]{3},? /.test(value) ? Date.parse(value) : NaN;
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : fallback;
}

async function discardResponse(res: Response): Promise<void> {
  await res.body?.cancel().catch(() => {});
}

export interface FetchOptions {
  method?: string;
  body?: unknown;
  params?: QueryParams;
  headers?: Record<string, string>;
  responseType?: ResponseType;
  timeoutMs?: number;
}

export async function guestyFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, params, headers: extraHeaders = {}, responseType = "auto", timeoutMs = REQUEST_TIMEOUT_MS } = options;
  const method = (options.method ?? "GET").toUpperCase();
  if (!["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(method)) {
    throw new Error("Unsupported HTTP method. Use GET, HEAD, POST, PUT, PATCH, DELETE, or OPTIONS.");
  }
  if (!["auto", "json", "text", "buffer"].includes(responseType)) {
    throw new Error("Response mode must be auto, json, text, or buffer.");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_TIMER_MS) {
    throw new Error("Request timeout must be a positive integer number of milliseconds, at most 2147483647.");
  }
  if ((method === "GET" || method === "HEAD") && body !== undefined) {
    throw new Error(`${method} requests cannot contain a body. Use query params or a different HTTP method.`);
  }
  const url = resourceUrl(path, params);
  let normalizedHeaders: Headers;
  try {
    normalizedHeaders = new Headers(extraHeaders);
  } catch {
    throw new Error("Invalid request headers. Use valid HTTP header names and single-line values.");
  }
  if (normalizedHeaders.has("authorization")) {
    throw new Error("The CLI supplies the cached Open API token; custom Authorization headers are not supported.");
  }
  if (!normalizedHeaders.has("accept")) normalizedHeaders.set("accept", "application/json");
  if (body !== undefined && !normalizedHeaders.has("content-type")) {
    if (body instanceof URLSearchParams) {
      normalizedHeaders.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8");
    } else if (isBinaryBody(body)) {
      normalizedHeaders.set("content-type", "application/octet-stream");
    } else if (typeof body === "string") {
      normalizedHeaders.set("content-type", "text/plain;charset=UTF-8");
    } else if (!(body instanceof FormData) && !(body instanceof Blob)) {
      normalizedHeaders.set("content-type", "application/json");
    }
  }
  const serializedBody = serializeBody(body);
  const headers: Record<string, string> = Object.fromEntries(normalizedHeaders);
  const tokens = new Set<string>();
  let token = await getToken();
  let cacheReread = false;
  const isRead = method === "GET" || method === "HEAD";
  const label = `Guesty API ${method} ${url.pathname}`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await enforceRateLimit();
    // A rate-limit wait may outlive the token's usable expiry window.
    token = await getToken();
    tokens.add(token);
    headers.Authorization = `Bearer ${token}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: serializedBody,
        signal: AbortSignal.timeout(timeoutMs),
        // Redirects must never bypass resource/OAuth validation or forward a write.
        redirect: "manual",
      });
    } catch {
      if (isRead && attempt < MAX_ATTEMPTS) {
        process.stderr.write("Guesty request could not complete. Retrying the read request...\n");
        await sleep(attempt * 1000);
        continue;
      }
      throw new Error(`${label} could not complete (network error or ${timeoutMs / 1000}s timeout).` +
        (isRead ? "" : " Its outcome is unknown; check Guesty before trying again."));
    }

    if (res.status === 401) {
      await discardResponse(res);
      invalidateToken(token);
      if (cacheReread || attempt === MAX_ATTEMPTS) {
        throw new Error("Guesty rejected the cached Open API token (401). The designated server refresh workflow must restore a valid token; the CLI cannot refresh it.");
      }
      process.stderr.write("Guesty rejected the cached token (401). Re-reading the cache once...\n");
      cacheReread = true;
      token = await getToken();
      continue;
    }

    // An explicit 429 rejects the request; Guesty documents retrying after this header.
    // Ambiguous network/5xx failures are retried only for reads, never mutations.
    if ((res.status === 429 || (isRead && [408, 500, 502, 503, 504].includes(res.status))) && attempt < MAX_ATTEMPTS) {
      const waitMs = retryDelay(res.headers.get("retry-after"), attempt * (res.status === 429 ? 5000 : 1000));
      await discardResponse(res);
      process.stderr.write(`Guesty returned HTTP ${res.status}. Retrying in ${Math.ceil(waitMs / 1000)}s...\n`);
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      // Authentication failures and redirects may contain private credentials or URLs.
      if (res.status === 403 || (res.status >= 300 && res.status < 400)) {
        await discardResponse(res);
        throw new Error(`${label} failed: HTTP ${res.status}.` +
          (res.status === 403 ? " Check the cached token's account permissions." : " Redirects are not followed; use the documented resource path."));
      }
      let detail = await res.text().catch(() => "");
      for (const secret of [...tokens, process.env.SUPABASE_SERVICE_ROLE_KEY]) {
        if (secret) detail = detail.replaceAll(secret, "[redacted]");
      }
      detail = detail.slice(0, 2000);
      throw new Error(`${label} failed: HTTP ${res.status}` +
        (!isRead && res.status >= 500 ? ". Its outcome is unknown; check Guesty before trying again." : "") +
        (detail ? `\n${detail}` : ""));
    }

    if (res.status === 204 || res.status === 205 || method === "HEAD") {
      await discardResponse(res);
      return undefined as T;
    }
    const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
    if (responseType === "buffer") return Buffer.from(await res.arrayBuffer()) as T;
    if (responseType === "text") return (await res.text()) as T;
    if (responseType === "json" || contentType.includes("application/json") || contentType.includes("+json")) {
      let text: string;
      try {
        text = await res.text();
      } catch {
        throw new Error(`${label} response could not be read; the request was not retried.`);
      }
      if (!text.trim()) return undefined as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error(`${label} returned invalid JSON; the request was not retried.`);
      }
    }
    if (contentType.startsWith("text/") || /csv|xml|html/.test(contentType)) {
      return (await res.text()) as T;
    }
    return Buffer.from(await res.arrayBuffer()) as T;
  }
  throw new Error(`${label} failed after ${MAX_ATTEMPTS} attempts`);
}

function paginationNumber(value: unknown, name: string, fallback?: number): number | undefined {
  if (value === undefined || value === null) return fallback;
  const number = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof number !== "number" || !Number.isSafeInteger(number) || number < (name === "limit" ? 1 : 0)) {
    throw new Error(`Invalid pagination ${name}: expected ${name === "limit" ? "a positive" : "a nonnegative"} integer.`);
  }
  return number;
}

export async function paginateAll<T = unknown>(path: string, params: QueryParams = {}, resultsKey?: string): Promise<T[]> {
  let limit = Math.min(paginationNumber(params.limit, "limit", 100)!, 100);
  let skip = paginationNumber(params.skip, "skip", 0)!;
  const all: T[] = [];
  const seenIds = new Set<string>();

  while (true) {
    const res = await guestyFetch<unknown>(path, { params: { ...params, limit, skip } });
    const record = res && typeof res === "object" && !Array.isArray(res) ? res as Record<string, unknown> : undefined;
    const key = resultsKey ?? ["results", "data", "items"].find((name) => Array.isArray(record?.[name]));
    const items = Array.isArray(res) ? res as T[] : key && Array.isArray(record?.[key]) ? record[key] as T[] : undefined;
    if (!items) throw new Error(`Cannot paginate ${path}: expected an array${resultsKey ? ` in '${resultsKey}'` : " of results"}.`);
    const pagination = record?.pagination;
    if (pagination !== undefined && (!pagination || typeof pagination !== "object" || Array.isArray(pagination))) {
      throw new Error(`Cannot paginate ${path}: invalid pagination metadata.`);
    }
    const metadata = (pagination as Record<string, unknown> | undefined) ?? record;
    const responseSkip = paginationNumber(metadata?.skip, "skip");
    if (responseSkip !== undefined && responseSkip !== skip) {
      throw new Error(`Cannot paginate ${path}: the API did not honor the requested skip (${skip}).`);
    }
    const total = paginationNumber(metadata?.count ?? metadata?.total ?? metadata?.totalCount, "count");
    const serverLimit = paginationNumber(metadata?.limit, "limit");
    const hasMore = metadata?.hasMore;
    if (hasMore !== undefined && typeof hasMore !== "boolean") throw new Error(`Cannot paginate ${path}: invalid hasMore metadata.`);
    if (serverLimit !== undefined) limit = Math.min(limit, serverLimit);
    if (items.length === 0) {
      if (hasMore === true || (total !== undefined && skip < total)) throw new Error(`Cannot paginate ${path}: the API returned an empty page before completion.`);
      return all;
    }
    for (const item of items) {
      const id = item && typeof item === "object" ? (item as Record<string, unknown>)._id ?? (item as Record<string, unknown>).id : undefined;
      if (typeof id !== "string" && typeof id !== "number") continue;
      const identity = String(id);
      if (seenIds.has(identity)) throw new Error(`Cannot paginate ${path}: the API repeated a record. Use a stable, unique sort and retry.`);
      seenIds.add(identity);
    }
    if (all.length + items.length > 10_000) throw new Error("Pagination exceeds 10,000 results. Use filters to narrow your query; no partial result was returned.");
    all.push(...items);
    skip += items.length;
    if (hasMore === false || (hasMore === undefined && total !== undefined && skip >= total)) return all;
    if (hasMore === undefined && total === undefined && serverLimit !== undefined && items.length < serverLimit) return all;
    if (all.length >= 10_000) throw new Error("Pagination reached 10,000 results without confirming completion. Use filters to narrow your query; no partial result was returned.");
    // Without count/limit metadata, a short page may reflect the server's cap.
    // Continue by the actual item count until an empty page confirms completion.
  }
}
