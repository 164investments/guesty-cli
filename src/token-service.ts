// Client for the team token service in server/. Simply VRM hosts one copy;
// teams can also run their own and point the CLI at it.

import { printable } from "./output.js";

export const HOSTED_TOKEN_SERVICE_URL = "https://guesty-tokens.simplyvacationrentalmanagement.com";
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

export type Invite = { kind: "code"; url: string; code: string } | { kind: "key"; settings: ServiceSettings };

// A one-time code such as ABCD-EFGH-JKLM in any case, with or without dashes.
// Crockford's base 32 has no I, L, O or U, so those are read as 1, 1 and 0.
export function inviteCode(value: string): string {
  const code = value.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (!/^[0-9A-HJKMNP-TV-Z]{12}$/.test(code)) {
    throw new Error("This isn't an invite code or link. Invite codes look like ABCD-EFGH-JKLM.");
  }
  return code;
}

// An invite is a code for the hosted service, a join link from any service
// (https://service/join/CODE), or a gti_ code from CLI 1.4, which holds a key.
export function parseInvite(value: string): Invite {
  const trimmed = value.trim();
  if (trimmed.startsWith(INVITE_PREFIX)) return { kind: "key", settings: decodeInvite(trimmed) };
  if (/^https?:\/\//i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      throw new Error("This invite link isn't a valid web address. Copy the whole link and try again.");
    }
    const match = /^(.*)\/join\/([^/]+)\/?$/.exec(url.pathname);
    if (!match || url.search || url.hash) throw new Error("This link isn't a Guesty CLI invite link. Those end in /join/ and a code.");
    return { kind: "code", url: serviceUrl(`${url.origin}${match[1]}`), code: inviteCode(match[2]) };
  }
  return { kind: "code", url: HOSTED_TOKEN_SERVICE_URL, code: inviteCode(trimmed) };
}

export function displayCode(code: string): string {
  return code.match(/.{4}/g)!.join("-");
}

// A link a service returned for a new invite. The service may be someone
// else's server, so the link must point back at it, and the link and the
// command to share are rebuilt here from the parsed code.
export function invitedLink(service: string, value: unknown): { link: string; command: string } {
  let invite: Invite | undefined;
  try {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) invite = parseInvite(value);
  } catch {
    // Reported below.
  }
  if (invite?.kind !== "code") throw new Error("The token service returned an invalid invite link.");
  if (invite.url !== serviceUrl(service)) throw new Error("The token service returned an invite link for a different service.");
  const link = `${invite.url}/join/${displayCode(invite.code)}`;
  return { link, command: `guesty join ${invite.url === HOSTED_TOKEN_SERVICE_URL ? displayCode(invite.code) : link}` };
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
      typeof body.message === "string" ? printable(body.message) : `The token service returned HTTP ${res.status}.`,
      res.status,
      typeof body.error === "string" ? body.error : undefined,
      typeof body.retry_at === "number" ? body.retry_at : undefined
    );
  }
  return body as T;
}
