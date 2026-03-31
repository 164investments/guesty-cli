import { getToken, invalidateToken } from "./auth.js";

const BASE_URL = "https://open-api.guesty.com";
const MAX_RETRIES = 3;
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 100;

const requestTimestamps: number[] = [];

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT_MAX) {
    const waitMs = requestTimestamps[0] + RATE_LIMIT_WINDOW - now;
    process.stderr.write(`Rate limit reached (${RATE_LIMIT_MAX}/min). Waiting ${Math.ceil(waitMs / 1000)}s...\n`);
    await new Promise((r) => setTimeout(r, waitMs));
    return enforceRateLimit();
  }
  requestTimestamps.push(now);
}

function buildQuery(params: Record<string, string | number | boolean | string[]>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      val.forEach((v) => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export interface FetchOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | string[]>;
}

export async function guestyFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { method = "GET", body, params } = options;
  const token = await getToken();
  const url = `${BASE_URL}${path}${params ? buildQuery(params) : ""}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (body) {
    headers["Content-Type"] = "application/json";
  }

  let tokenRefreshed = false;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await enforceRateLimit();

    // Re-fetch token if it was invalidated on a previous attempt
    if (tokenRefreshed) {
      headers.Authorization = `Bearer ${await getToken()}`;
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) {
      return undefined as T;
    }

    if (res.status === 401 && !tokenRefreshed) {
      process.stderr.write(`Token expired (401). Refreshing...\n`);
      invalidateToken();
      tokenRefreshed = true;
      continue;
    }

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = res.headers.get("retry-after");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : attempt * 5000;
      process.stderr.write(`Rate limited. Retrying in ${waitMs / 1000}s...\n`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Guesty API ${method} ${path} failed: ${res.status} ${res.statusText}\n${text}`);
    }

    return res.json() as Promise<T>;
  }

  throw new Error(`Guesty API ${method} ${path} failed after ${MAX_RETRIES} retries`);
}

export async function paginateAll<T = unknown>(
  path: string,
  params: Record<string, string | number | boolean | string[]> = {},
  resultsKey?: string
): Promise<T[]> {
  const limit = 100;
  let skip = 0;
  const all: T[] = [];

  while (true) {
    const res = await guestyFetch<Record<string, unknown>>(path, {
      params: { ...params, limit, skip },
    });

    let items: T[];
    if (resultsKey && Array.isArray(res[resultsKey])) {
      items = res[resultsKey] as T[];
    } else if (Array.isArray(res)) {
      items = res as T[];
    } else if ("results" in res && Array.isArray(res.results)) {
      items = res.results as T[];
    } else if ("data" in res && Array.isArray(res.data)) {
      items = res.data as T[];
    } else {
      break;
    }

    all.push(...items);
    if (items.length < limit) break;
    if (all.length >= 10_000) {
      process.stderr.write(`Warning: pagination capped at 10,000 results. Use filters to narrow your query.\n`);
      break;
    }
    skip += limit;
  }

  return all;
}
