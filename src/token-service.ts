// Client for the team token service in server/. Simply VRM hosts one copy;
// teams can also run their own and point the CLI at it.

export const HOSTED_TOKEN_SERVICE_URL = "https://guesty-tokens.simplyvrm.com";
export const TOKEN_SERVICE_URL_ENV = "GUESTY_TOKEN_SERVICE_URL";
export const TOKEN_SERVICE_KEY_ENV = "GUESTY_TOKEN_SERVICE_KEY";

const ACCESS_KEY = /^gts_[A-Za-z0-9_-]{43}$/;
const INVITE_PREFIX = "gti_";
// Creating a team or renewing a token waits for Guesty, which can take 20 seconds.
const REQUEST_TIMEOUT_MS = 30_000;

export class TokenServiceError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly retryAt?: number) {
    super(message);
  }
}

export interface ServiceSettings {
  url: string;
  key: string;
}

// The access key travels with every request, so it may only go over HTTPS,
// except to a service on this machine.
export function serviceUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${value} is not a valid token service URL.`);
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    throw new Error("The token service URL must use https.");
  }
  return url.href.replace(/\/+$/, "");
}

export function isAccessKey(value: string): boolean {
  return ACCESS_KEY.test(value);
}

export function encodeInvite(settings: ServiceSettings): string {
  return INVITE_PREFIX + Buffer.from(JSON.stringify({ url: settings.url, key: settings.key })).toString("base64url");
}

export function decodeInvite(code: string): ServiceSettings {
  const trimmed = code.trim();
  let decoded: unknown;
  try {
    if (!trimmed.startsWith(INVITE_PREFIX)) throw new Error();
    decoded = JSON.parse(Buffer.from(trimmed.slice(INVITE_PREFIX.length), "base64url").toString("utf8"));
  } catch {
    throw new Error("This is not a Guesty CLI invite code. Ask your team's admin for one (guesty team invite).");
  }
  const { url, key } = (decoded ?? {}) as Partial<ServiceSettings>;
  if (typeof url !== "string" || typeof key !== "string" || !isAccessKey(key)) {
    throw new Error("This invite code is incomplete. Ask your team's admin for a new one.");
  }
  return { url: serviceUrl(url), key };
}

export function configuredService(): ServiceSettings | undefined {
  const url = process.env[TOKEN_SERVICE_URL_ENV];
  const key = process.env[TOKEN_SERVICE_KEY_ENV];
  return url && key ? { url: serviceUrl(url), key } : undefined;
}

export async function callTokenService<T>(
  url: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options: { key?: string; body?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  const base = serviceUrl(url);
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(options.key ? { Authorization: `Bearer ${options.key}` } : {}),
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
      redirect: "error",
    });
  } catch {
    throw new TokenServiceError(`The token service at ${base} could not be reached.`, 0);
  }
  let body: { error?: unknown; message?: unknown; retry_at?: unknown } & Record<string, unknown>;
  try {
    body = await res.json();
  } catch {
    throw new TokenServiceError(`The token service at ${base} returned an unexpected response (HTTP ${res.status}).`, res.status);
  }
  if (!res.ok) {
    throw new TokenServiceError(
      typeof body.message === "string" ? body.message : `The token service returned HTTP ${res.status}.`,
      res.status,
      typeof body.error === "string" ? body.error : undefined,
      typeof body.retry_at === "number" ? body.retry_at : undefined
    );
  }
  return body as T;
}
