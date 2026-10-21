import { keyedHash, seal, unseal, type ServiceKeys } from "./crypto.js";

export const TOKEN_TYPES = ["openapi", "beapi"] as const;
export type TokenType = (typeof TOKEN_TYPES)[number];

export const POLICY = {
  refreshBeforeMs: 60 * 60_000,
  windowMs: 24 * 60 * 60_000,
  retryAfterFailureMs: 30 * 60_000,
  retryAfterRateLimitMs: 2 * 60 * 60_000,
  leaseMs: 60_000,
  requestTimeoutMs: 20_000,
};

const OAUTH: Record<TokenType, { url: string; scope: string }> = {
  openapi: { url: "https://open-api.guesty.com/oauth2/token", scope: "open-api" },
  beapi: { url: "https://booking.guesty.com/oauth2/token", scope: "booking_engine:api" },
};

export interface TokenEnv {
  DB: D1Database;
  OPENAPI_TOKEN_URL?: string;
  BEAPI_TOKEN_URL?: string;
}

export interface Credentials {
  clientId: string;
  clientSecret: string;
}

export interface CachedToken {
  token_type: TokenType;
  access_token: string;
  expires_at: number;
}

// busy: another request holds the lease. limit/waiting: no request is allowed
// yet. rejected: Guesty refused the credentials. failed: anything else.
export interface Blocked {
  status: "busy" | "limit" | "waiting" | "rejected" | "failed";
  retryAt?: number;
  httpStatus?: number;
  token?: CachedToken;
}

export type Refresh = { status: "fresh" | "refreshed"; token: CachedToken } | Blocked;

export function isTokenType(value: unknown): value is TokenType {
  return TOKEN_TYPES.includes(value as TokenType);
}

export function clientFingerprint(keys: ServiceKeys, tokenType: TokenType, clientId: string): Promise<string> {
  return keyedHash(keys, `client:${tokenType}:${clientId}`);
}

export async function readToken(env: TokenEnv, keys: ServiceKeys, teamId: string, tokenType: TokenType): Promise<CachedToken | undefined> {
  const row = await env.DB.prepare("SELECT access_token, expires_at FROM tokens WHERE team_id = ? AND token_type = ?")
    .bind(teamId, tokenType)
    .first<{ access_token: string; expires_at: number }>();
  if (!row) return undefined;
  const accessToken = await unseal(keys, row.access_token, `token:${teamId}:${tokenType}`);
  return { token_type: tokenType, access_token: accessToken, expires_at: row.expires_at };
}

export async function readCredentials(env: TokenEnv, keys: ServiceKeys, teamId: string, tokenType: TokenType): Promise<(Credentials & { fingerprint: string }) | undefined> {
  const row = await env.DB.prepare("SELECT fingerprint, client_id, client_secret FROM credentials WHERE team_id = ? AND token_type = ?")
    .bind(teamId, tokenType)
    .first<{ fingerprint: string; client_id: string; client_secret: string }>();
  if (!row) return undefined;
  return {
    fingerprint: row.fingerprint,
    clientId: await unseal(keys, row.client_id, `client_id:${teamId}:${tokenType}`),
    clientSecret: await unseal(keys, row.client_secret, `client_secret:${teamId}:${tokenType}`),
  };
}

export async function storeCredentials(env: TokenEnv, keys: ServiceKeys, teamId: string, tokenType: TokenType, credentials: Credentials, fingerprint: string): Promise<D1PreparedStatement> {
  return env.DB.prepare(
    `INSERT INTO credentials (team_id, token_type, fingerprint, client_id, client_secret, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (team_id, token_type) DO UPDATE SET fingerprint = excluded.fingerprint,
       client_id = excluded.client_id, client_secret = excluded.client_secret, updated_at = excluded.updated_at`
  ).bind(
    teamId,
    tokenType,
    fingerprint,
    await seal(keys, credentials.clientId, `client_id:${teamId}:${tokenType}`),
    await seal(keys, credentials.clientSecret, `client_secret:${teamId}:${tokenType}`),
    Date.now()
  );
}

export async function storeToken(env: TokenEnv, keys: ServiceKeys, teamId: string, token: CachedToken): Promise<D1PreparedStatement> {
  return env.DB.prepare(
    `INSERT INTO tokens (team_id, token_type, access_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (team_id, token_type) DO UPDATE SET access_token = excluded.access_token,
       expires_at = excluded.expires_at, created_at = excluded.created_at`
  ).bind(teamId, token.token_type, await seal(keys, token.access_token, `token:${teamId}:${token.token_type}`), token.expires_at, Date.now());
}

async function acquireLease(env: TokenEnv, fingerprint: string): Promise<string | undefined> {
  const leaseId = crypto.randomUUID();
  const now = Date.now();
  const row = await env.DB.prepare(
    `INSERT INTO refresh_leases (fingerprint, lease_id, lease_until) VALUES (?1, ?2, ?3)
     ON CONFLICT (fingerprint) DO UPDATE SET lease_id = excluded.lease_id, lease_until = excluded.lease_until
     WHERE refresh_leases.lease_until < ?4
     RETURNING lease_id`
  ).bind(fingerprint, leaseId, now + POLICY.leaseMs, now).first<{ lease_id: string }>();
  return row?.lease_id === leaseId ? leaseId : undefined;
}

async function releaseLease(env: TokenEnv, fingerprint: string, leaseId: string): Promise<void> {
  await env.DB.prepare("DELETE FROM refresh_leases WHERE fingerprint = ? AND lease_id = ?").bind(fingerprint, leaseId).run();
}

// Returns when the next request is allowed, or undefined if one is allowed now.
async function nextAllowedRequest(env: TokenEnv, fingerprint: string, maxPerDay: number): Promise<{ status: "limit" | "waiting"; retryAt: number } | undefined> {
  const now = Date.now();
  const recent = await env.DB.prepare(
    "SELECT requested_at, outcome, http_status FROM token_requests WHERE fingerprint = ? AND requested_at > ? ORDER BY requested_at DESC"
  ).bind(fingerprint, now - POLICY.windowMs).all<{ requested_at: number; outcome: string; http_status: number | null }>();
  const rows = recent.results;
  if (rows.length >= maxPerDay) {
    return { status: "limit", retryAt: rows[maxPerDay - 1].requested_at + POLICY.windowMs };
  }
  const last = rows[0];
  // Guesty refusing the credentials is not worth pausing for: the admin is
  // correcting a typo, and the daily limit still counts the attempt.
  if (last && last.outcome !== "succeeded" && ![400, 401, 403].includes(last.http_status ?? 0)) {
    const pause = last.http_status === 429 ? POLICY.retryAfterRateLimitMs : POLICY.retryAfterFailureMs;
    if (last.requested_at + pause > now) return { status: "waiting", retryAt: last.requested_at + pause };
  }
  return undefined;
}

async function requestFromGuesty(env: TokenEnv, tokenType: TokenType, credentials: Credentials, fingerprint: string, teamId: string | null): Promise<{ status: "refreshed"; token: CachedToken } | Blocked> {
  const startedAt = Date.now();
  // Written before the request and never rolled back: the daily limit counts it
  // even if this Worker stops before Guesty answers.
  const ledger = await env.DB.prepare(
    "INSERT INTO token_requests (fingerprint, team_id, token_type, requested_at) VALUES (?, ?, ?, ?) RETURNING id"
  ).bind(fingerprint, teamId, tokenType, startedAt).first<{ id: number }>();
  const finish = (outcome: "succeeded" | "failed", httpStatus: number | null, detail: string | null) =>
    env.DB.prepare("UPDATE token_requests SET outcome = ?, http_status = ?, detail = ? WHERE id = ?")
      .bind(outcome, httpStatus, detail, ledger!.id)
      .run();

  const url = (tokenType === "openapi" ? env.OPENAPI_TOKEN_URL : env.BEAPI_TOKEN_URL) ?? OAUTH[tokenType].url;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: OAUTH[tokenType].scope,
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      }),
      signal: AbortSignal.timeout(POLICY.requestTimeoutMs),
      redirect: "manual",
    });
  } catch {
    await finish("failed", null, "request did not complete");
    return { status: "failed" };
  }

  if (!res.ok) {
    await res.body?.cancel();
    await finish("failed", res.status, "Guesty did not issue a token");
    return { status: [400, 401, 403].includes(res.status) ? "rejected" : "failed", httpStatus: res.status };
  }

  let body: { access_token?: unknown; expires_in?: unknown };
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  const accessToken = body.access_token;
  const expiresIn = body.expires_in;
  if (typeof accessToken !== "string" || !/^\S+$/.test(accessToken) || typeof expiresIn !== "number" || !(expiresIn > 0)) {
    await finish("failed", res.status, "unexpected token response");
    return { status: "failed", httpStatus: res.status };
  }
  await finish("succeeded", res.status, null);
  // Counted from before the request, so it is never later than Guesty's expiry.
  return { status: "refreshed", token: { token_type: tokenType, access_token: accessToken, expires_at: startedAt + expiresIn * 1000 } };
}

// Requests a token for credentials that are not stored yet (a new team, or an
// admin replacing credentials), so Guesty confirms them before they are saved.
export async function verifyCredentials(env: TokenEnv, tokenType: TokenType, credentials: Credentials, fingerprint: string, teamId: string | null, maxPerDay: number): Promise<Refresh> {
  const leaseId = await acquireLease(env, fingerprint);
  if (!leaseId) return { status: "busy", retryAt: Date.now() + 2_000 };
  try {
    const blocked = await nextAllowedRequest(env, fingerprint, maxPerDay);
    if (blocked) return blocked;
    return await requestFromGuesty(env, tokenType, credentials, fingerprint, teamId);
  } finally {
    await releaseLease(env, fingerprint, leaseId);
  }
}

// Returns the team's cached token, requesting a new one from Guesty only when
// it is close to expiry (or forced), the lease is free and the limits allow.
export async function ensureToken(env: TokenEnv, keys: ServiceKeys, teamId: string, tokenType: TokenType, maxPerDay: number, force = false): Promise<Refresh | undefined> {
  const credentials = await readCredentials(env, keys, teamId, tokenType);
  if (!credentials) return undefined;
  const isFresh = (token?: CachedToken): token is CachedToken =>
    !!token && token.expires_at > Date.now() + POLICY.refreshBeforeMs;

  const current = await readToken(env, keys, teamId, tokenType);
  if (!force && isFresh(current)) return { status: "fresh", token: current };

  const leaseId = await acquireLease(env, credentials.fingerprint);
  if (!leaseId) return { status: "busy", retryAt: Date.now() + 2_000, token: current };
  try {
    const latest = await readToken(env, keys, teamId, tokenType);
    if (!force && isFresh(latest)) return { status: "fresh", token: latest };
    const blocked = await nextAllowedRequest(env, credentials.fingerprint, maxPerDay);
    if (blocked) return { ...blocked, token: latest };
    const result = await requestFromGuesty(env, tokenType, credentials, credentials.fingerprint, teamId);
    if (result.status !== "refreshed") return { ...result, token: latest };
    await (await storeToken(env, keys, teamId, result.token)).run();
    return result;
  } finally {
    await releaseLease(env, credentials.fingerprint, leaseId);
  }
}
