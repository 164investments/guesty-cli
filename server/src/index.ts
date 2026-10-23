import { connectResponse } from "./connect.js";
import { keyedHash, newAccessKey, serviceKeys, type ServiceKeys } from "./crypto.js";
import { HttpError, errorResponse, json, readBody, requiredText } from "./http.js";
import type { MailEnv } from "./invite-messages.js";
import { cancelInvite, closeInvitesFrom, createInvite, invitePage, pendingInvites, redeemInvite } from "./invites.js";
import {
  TOKEN_TYPES,
  clientFingerprint,
  ensureToken,
  isTokenType,
  storeCredentials,
  storeToken,
  verifyCredentials,
  type CachedToken,
  type Credentials,
  type Refresh,
  type TokenEnv,
  type TokenType,
} from "./tokens.js";

export interface Env extends TokenEnv, MailEnv {
  CREDENTIALS_KEY: string;
}

const MAX_TEAMS_PER_CLIENT_PER_HOUR = 10;
const LAST_USED_RESOLUTION_MS = 60 * 60_000;
const DEFAULT_MAX_REQUESTS_PER_DAY = 3;
// Requests before the caller has a key: two for a new team, so a typo can be
// fixed, and one to recover a team. A combined cap keeps every client within
// Guesty's five a day, whatever the team's own limit.
const SIGNUPS_PER_DAY_NEW_TEAM = 2;
const SIGNUPS_PER_DAY_RECOVERY = 1;

interface Caller {
  teamId: string;
  teamName: string;
  label: string;
  keyHash: string;
  role: "admin" | "member";
  maxPerDay: number;
}

function credentialsInput(value: unknown, name: string): Credentials {
  if (!value || typeof value !== "object") {
    throw new HttpError(400, "invalid_request", `${name} needs client_id and client_secret.`);
  }
  const fields = value as Record<string, unknown>;
  return { clientId: requiredText(fields, "client_id", 500), clientSecret: requiredText(fields, "client_secret", 500) };
}

function tokenTypeInput(body: Record<string, unknown>): TokenType {
  const tokenType = body.token_type ?? "openapi";
  if (!isTokenType(tokenType)) throw new HttpError(400, "invalid_request", "token_type must be openapi or beapi.");
  return tokenType;
}

function refreshError(result: Refresh, tokenType: TokenType, maxPerDay: number): HttpError {
  const at = (time?: number) => (time ? new Date(time).toISOString() : "later");
  const httpStatus = "httpStatus" in result ? result.httpStatus : undefined;
  switch (result.status) {
    case "busy":
      return new HttpError(503, "refreshing", "Another request is renewing this team's token. Try again in a few seconds.", result.retryAt);
    case "limit":
      return new HttpError(503, "limit_reached",
        `This team's ${tokenType} client has used its token requests for the last 24 hours (the team allows ${maxPerDay}, and Guesty allows 5 in all). The next is allowed at ${at(result.retryAt)}.`, result.retryAt);
    case "waiting":
      return new HttpError(503, "waiting", `The last ${tokenType} token request failed. The next is allowed at ${at(result.retryAt)}.`, result.retryAt);
    case "rejected":
      return new HttpError(422, "credentials_rejected",
        `Guesty rejected the ${tokenType} client ID or secret (HTTP ${httpStatus}). Check them and try again.`);
    default:
      return new HttpError(502, "guesty_unavailable",
        `Guesty did not issue a ${tokenType} token${httpStatus ? ` (HTTP ${httpStatus})` : ""}. Try again in 30 minutes.`);
  }
}

function signupError(result: Refresh, tokenType: TokenType): HttpError {
  if (result.status !== "limit") return refreshError(result, tokenType, DEFAULT_MAX_REQUESTS_PER_DAY);
  return new HttpError(503, "limit_reached",
    `This Guesty ${tokenType} client has used its sign-up attempts on this service for the last 24 hours. The next is allowed at ${new Date(result.retryAt ?? Date.now()).toISOString()}.`,
    result.retryAt);
}

async function createAccessKey(env: Env, keys: ServiceKeys, teamId: string, label: string, role: "admin" | "member"): Promise<string> {
  const key = newAccessKey();
  try {
    await env.DB.prepare("INSERT INTO access_keys (key_hash, team_id, label, role, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(await keyedHash(keys, `access:${key}`), teamId, label, role, Date.now())
      .run();
  } catch (error) {
    if (error instanceof Error && /UNIQUE/.test(error.message)) {
      throw new HttpError(409, "label_in_use", `This team already has an active key named ${label}. Revoke it first or pick another name.`);
    }
    throw error;
  }
  return key;
}

async function authenticate(request: Request, env: Env, keys: ServiceKeys): Promise<Caller> {
  const key = /^Bearer (gts_[A-Za-z0-9_-]{43})$/.exec(request.headers.get("Authorization") ?? "")?.[1];
  if (!key) throw new HttpError(401, "unauthorized", "Send this team's access key as Authorization: Bearer gts_...");
  const keyHash = await keyedHash(keys, `access:${key}`);
  const row = await env.DB.prepare(
    `SELECT k.team_id, k.label, k.role, k.last_used_at, t.name, t.max_requests_per_day
     FROM access_keys k JOIN teams t ON t.id = k.team_id
     WHERE k.key_hash = ? AND k.revoked_at IS NULL`
  ).bind(keyHash).first<{ team_id: string; label: string; role: "admin" | "member"; last_used_at: number | null; name: string; max_requests_per_day: number }>();
  if (!row) throw new HttpError(401, "unauthorized", "This access key is wrong or has been revoked.");
  const now = Date.now();
  // Hourly resolution keeps database writes low; every CLI command reads a token.
  if (!row.last_used_at || row.last_used_at < now - LAST_USED_RESOLUTION_MS) {
    await env.DB.prepare("UPDATE access_keys SET last_used_at = ? WHERE key_hash = ?").bind(now, keyHash).run();
  }
  return { teamId: row.team_id, teamName: row.name, label: row.label, keyHash, role: row.role, maxPerDay: row.max_requests_per_day };
}

async function createTeam(request: Request, env: Env, keys: ServiceKeys): Promise<Response> {
  const body = await readBody(request);
  const name = requiredText(body, "name", 100);
  const adminLabel = typeof body.admin_label === "string" && body.admin_label.trim() ? requiredText(body, "admin_label", 100) : "Admin";
  const credentials = body.credentials;
  if (!credentials || typeof credentials !== "object") {
    throw new HttpError(400, "invalid_request", "credentials.openapi needs client_id and client_secret.");
  }
  const fields = credentials as Record<string, unknown>;
  const submitted: [TokenType, Credentials][] = [["openapi", credentialsInput(fields.openapi, "credentials.openapi")]];
  if (fields.beapi !== undefined && fields.beapi !== null) submitted.push(["beapi", credentialsInput(fields.beapi, "credentials.beapi")]);

  const now = Date.now();
  const clientHash = await keyedHash(keys, `ip:${request.headers.get("CF-Connecting-IP") ?? "unknown"}`);
  const attempts = await env.DB.prepare("SELECT COUNT(*) AS n FROM team_creation_attempts WHERE client_hash = ? AND attempted_at > ?")
    .bind(clientHash, now - 60 * 60_000)
    .first<{ n: number }>();
  if ((attempts?.n ?? 0) >= MAX_TEAMS_PER_CLIENT_PER_HOUR) {
    throw new HttpError(429, "too_many_teams", "Too many teams were created from this address in the last hour. Try again later.", now + 60 * 60_000);
  }
  await env.DB.batch([
    env.DB.prepare("INSERT INTO team_creation_attempts (client_hash, attempted_at) VALUES (?, ?)").bind(clientHash, now),
    env.DB.prepare("DELETE FROM team_creation_attempts WHERE attempted_at < ?").bind(now - 24 * 60 * 60_000),
  ]);

  const fingerprints = new Map<TokenType, string>();
  for (const [tokenType, input] of submitted) {
    fingerprints.set(tokenType, await clientFingerprint(keys, tokenType, input.clientId));
  }
  const owners = new Map<TokenType, string>();
  for (const [tokenType] of submitted) {
    const existing = await env.DB.prepare("SELECT team_id FROM credentials WHERE fingerprint = ?").bind(fingerprints.get(tokenType)).first<{ team_id: string }>();
    if (existing) owners.set(tokenType, existing.team_id);
  }

  // Credentials that already belong to a team recover admin access to it, but
  // only once Guesty accepts them now: a secret rotated away no longer works.
  const recoverTeam = owners.get("openapi");
  if (recoverTeam) {
    const [, input] = submitted[0];
    const result = await verifyCredentials(env, "openapi", input, fingerprints.get("openapi")!, recoverTeam, "signup", SIGNUPS_PER_DAY_RECOVERY);
    if (result.status === "limit") {
      throw new HttpError(409, "credentials_in_use",
        `These Guesty credentials already belong to a team on this service. Ask one of its admins for an invite (guesty team invite), or run setup again after ${new Date(result.retryAt ?? Date.now()).toISOString()} to get a new admin key.`,
        result.retryAt);
    }
    if (result.status !== "refreshed") throw signupError(result, "openapi");
    const team = await env.DB.prepare("SELECT name, max_requests_per_day FROM teams WHERE id = ?").bind(recoverTeam).first<{ name: string; max_requests_per_day: number }>();
    await env.DB.batch([
      await storeCredentials(env, keys, recoverTeam, "openapi", input, fingerprints.get("openapi")!),
      await storeToken(env, keys, recoverTeam, result.token),
    ]);
    const label = `Recovered admin ${crypto.randomUUID().slice(0, 8)}`;
    const adminKey = await createAccessKey(env, keys, recoverTeam, label, "admin");
    return json({ team: { id: recoverTeam, name: team?.name, max_requests_per_day: team?.max_requests_per_day }, admin_key: adminKey, label, recovered: true });
  }
  if (owners.size) {
    throw new HttpError(409, "credentials_in_use",
      "These booking-engine credentials already belong to another team on this service. Ask that team's admin for an invite.");
  }

  // Guesty confirms each credential before anything is saved. Open API must
  // work; a failed booking-engine credential is reported and can be added later.
  const verified: { tokenType: TokenType; input: Credentials; token: CachedToken }[] = [];
  let beapiError: HttpError | undefined;
  for (const [tokenType, input] of submitted) {
    const result = await verifyCredentials(env, tokenType, input, fingerprints.get(tokenType)!, null, "signup", SIGNUPS_PER_DAY_NEW_TEAM);
    if (result.status === "refreshed") {
      verified.push({ tokenType, input, token: result.token });
    } else if (tokenType === "openapi") {
      throw signupError(result, tokenType);
    } else {
      beapiError = signupError(result, tokenType);
    }
  }

  const teamId = crypto.randomUUID();
  const adminKey = newAccessKey();
  const statements = [
    env.DB.prepare("INSERT INTO teams (id, name, max_requests_per_day, created_at) VALUES (?, ?, ?, ?)")
      .bind(teamId, name, DEFAULT_MAX_REQUESTS_PER_DAY, now),
    env.DB.prepare("INSERT INTO access_keys (key_hash, team_id, label, role, created_at) VALUES (?, ?, ?, 'admin', ?)")
      .bind(await keyedHash(keys, `access:${adminKey}`), teamId, adminLabel, now),
  ];
  for (const { tokenType, input, token } of verified) {
    const fingerprint = fingerprints.get(tokenType)!;
    statements.push(
      await storeCredentials(env, keys, teamId, tokenType, input, fingerprint),
      await storeToken(env, keys, teamId, token),
      env.DB.prepare("UPDATE token_requests SET team_id = ? WHERE fingerprint = ? AND team_id IS NULL").bind(teamId, fingerprint)
    );
  }
  try {
    await env.DB.batch(statements);
  } catch (error) {
    if (error instanceof Error && /UNIQUE/.test(error.message)) {
      throw new HttpError(409, "credentials_in_use", "These Guesty credentials were just connected to another team on this service.");
    }
    throw error;
  }
  return json({
    team: { id: teamId, name, max_requests_per_day: DEFAULT_MAX_REQUESTS_PER_DAY },
    admin_key: adminKey,
    label: adminLabel,
    token_types: verified.map(({ tokenType }) => tokenType),
    ...(beapiError ? { beapi_error: { error: beapiError.code, message: beapiError.message } } : {}),
  }, 201);
}

async function tokenFor(request: Request, env: Env, keys: ServiceKeys, caller: Caller): Promise<Response> {
  const tokenType = tokenTypeInput(await readBody(request));
  const result = await ensureToken(env, keys, caller.teamId, tokenType, caller.maxPerDay);
  if (!result) {
    throw new HttpError(404, "not_configured",
      `This team has no ${tokenType} credentials. Its admin can add them with guesty team credentials${tokenType === "beapi" ? " --beapi" : ""}.`);
  }
  // A token that is still valid is returned even when renewal is not allowed yet.
  if (result.token && result.token.expires_at > Date.now()) return json(result.token);
  throw refreshError(result, tokenType, caller.maxPerDay);
}

async function teamStatus(env: Env, caller: Caller): Promise<Response> {
  const since = Date.now() - 24 * 60 * 60_000;
  const tokenTypes = [];
  for (const tokenType of TOKEN_TYPES) {
    const credentials = await env.DB.prepare("SELECT fingerprint, updated_at FROM credentials WHERE team_id = ? AND token_type = ?")
      .bind(caller.teamId, tokenType)
      .first<{ fingerprint: string; updated_at: number }>();
    const token = await env.DB.prepare("SELECT expires_at, created_at FROM tokens WHERE team_id = ? AND token_type = ?")
      .bind(caller.teamId, tokenType)
      .first<{ expires_at: number; created_at: number }>();
    const requests = credentials
      ? (await env.DB.prepare(
        "SELECT requested_at, outcome, http_status FROM token_requests WHERE fingerprint = ? AND requested_at > ? ORDER BY requested_at DESC"
      ).bind(credentials.fingerprint, since).all<{ requested_at: number; outcome: string; http_status: number | null }>()).results
      : [];
    tokenTypes.push({
      token_type: tokenType,
      configured: !!credentials,
      credentials_updated_at: credentials?.updated_at ?? null,
      token_expires_at: token?.expires_at ?? null,
      requests_last_24h: requests.length,
      last_request: requests[0] ?? null,
    });
  }
  const keyRows = await env.DB.prepare(
    "SELECT label, role, created_at, last_used_at, revoked_at FROM access_keys WHERE team_id = ? ORDER BY created_at"
  ).bind(caller.teamId).all();
  return json({
    team: { id: caller.teamId, name: caller.teamName, max_requests_per_day: caller.maxPerDay },
    token_types: tokenTypes,
    keys: keyRows.results,
    invites: await pendingInvites(env, caller.teamId),
  });
}

async function updateTeam(request: Request, env: Env, caller: Caller): Promise<Response> {
  const value = (await readBody(request)).max_requests_per_day;
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 5) {
    throw new HttpError(400, "invalid_request", "max_requests_per_day must be a whole number from 1 to 5.");
  }
  await env.DB.prepare("UPDATE teams SET max_requests_per_day = ? WHERE id = ?").bind(value, caller.teamId).run();
  return json({ team: { id: caller.teamId, name: caller.teamName, max_requests_per_day: value } });
}

async function deleteTeam(env: Env, caller: Caller): Promise<Response> {
  // The request history stays, keyed by client fingerprint, so a new team for
  // the same Guesty client still counts today's requests.
  await env.DB.batch([
    env.DB.prepare("UPDATE token_requests SET team_id = NULL WHERE team_id = ?").bind(caller.teamId),
    env.DB.prepare("DELETE FROM tokens WHERE team_id = ?").bind(caller.teamId),
    env.DB.prepare("DELETE FROM credentials WHERE team_id = ?").bind(caller.teamId),
    env.DB.prepare("DELETE FROM access_keys WHERE team_id = ?").bind(caller.teamId),
    env.DB.prepare("DELETE FROM teams WHERE id = ?").bind(caller.teamId),
  ]);
  return json({ deleted: caller.teamId });
}

async function createKey(request: Request, env: Env, keys: ServiceKeys, caller: Caller): Promise<Response> {
  const body = await readBody(request);
  const label = requiredText(body, "label", 100);
  const role = body.role ?? "member";
  if (role !== "admin" && role !== "member") throw new HttpError(400, "invalid_request", "role must be admin or member.");
  return json({ label, role, key: await createAccessKey(env, keys, caller.teamId, label, role) }, 201);
}

// Revokes the teammate's key and cancels their pending invite, whichever exist.
async function revokeKey(env: Env, caller: Caller, label: string): Promise<Response> {
  const key = await env.DB.prepare("SELECT key_hash, role FROM access_keys WHERE team_id = ? AND label = ? AND revoked_at IS NULL")
    .bind(caller.teamId, label)
    .first<{ key_hash: string; role: string }>();
  if (!key) {
    if (await cancelInvite(env, caller.teamId, label)) return json({ revoked: label, key: false, invite: true });
    throw new HttpError(404, "not_found", `This team has no active key or pending invite named ${label}.`);
  }
  if (key.role === "admin") {
    const admins = await env.DB.prepare("SELECT COUNT(*) AS n FROM access_keys WHERE team_id = ? AND role = 'admin' AND revoked_at IS NULL")
      .bind(caller.teamId)
      .first<{ n: number }>();
    if ((admins?.n ?? 0) <= 1) throw new HttpError(409, "last_admin", "This is the team's only admin key. Create another admin key before revoking it.");
  }
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare("UPDATE access_keys SET revoked_at = ? WHERE team_id = ? AND label = ? AND revoked_at IS NULL").bind(now, caller.teamId, label),
    closeInvitesFrom(env, key.key_hash, now),
  ]);
  return json({ revoked: label, key: true, invite: await cancelInvite(env, caller.teamId, label) });
}

async function forceRefresh(request: Request, env: Env, keys: ServiceKeys, caller: Caller): Promise<Response> {
  const tokenType = tokenTypeInput(await readBody(request));
  const result = await ensureToken(env, keys, caller.teamId, tokenType, caller.maxPerDay, true);
  if (!result) throw new HttpError(404, "not_configured", `This team has no ${tokenType} credentials.`);
  if (result.status !== "refreshed") throw refreshError(result, tokenType, caller.maxPerDay);
  return json({ token_type: tokenType, expires_at: result.token.expires_at });
}

async function putCredentials(request: Request, env: Env, keys: ServiceKeys, caller: Caller): Promise<Response> {
  const body = await readBody(request);
  const tokenType = tokenTypeInput(body);
  const input = credentialsInput(body, "credentials");
  const fingerprint = await clientFingerprint(keys, tokenType, input.clientId);
  const owner = await env.DB.prepare("SELECT team_id FROM credentials WHERE fingerprint = ?").bind(fingerprint).first<{ team_id: string }>();
  if (owner && owner.team_id !== caller.teamId) {
    throw new HttpError(409, "credentials_in_use", "These Guesty credentials already belong to another team on this service.");
  }
  const result = await verifyCredentials(env, tokenType, input, fingerprint, caller.teamId, "team", caller.maxPerDay);
  if (result.status !== "refreshed") throw refreshError(result, tokenType, caller.maxPerDay);
  await env.DB.batch([
    await storeCredentials(env, keys, caller.teamId, tokenType, input, fingerprint),
    await storeToken(env, keys, caller.teamId, result.token),
  ]);
  return json({ token_type: tokenType, expires_at: result.token.expires_at });
}

async function route(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  const keys = await serviceKeys(env.CREDENTIALS_KEY);
  const route = `${request.method} ${pathname}`;
  if (route === "GET /" || route === "GET /health") return json({ service: "guesty-token-service", ok: true });
  if (route === "POST /v1/teams") return createTeam(request, env, keys);
  if (route === "POST /v1/join") return redeemInvite(request, env, keys);
  if ((pathname === "/connect" || pathname === "/connect/") && (request.method === "GET" || request.method === "HEAD")) return connectResponse(request.method);
  const joinCode = /^\/join\/([^/]+)\/?$/.exec(pathname)?.[1];
  if (joinCode && (request.method === "GET" || request.method === "HEAD")) return invitePage(request, env, keys, joinCode);

  const caller = await authenticate(request, env, keys);
  if (route === "POST /v1/token") return tokenFor(request, env, keys, caller);
  if (!pathname.startsWith("/v1/team")) throw new HttpError(404, "not_found", "No such endpoint.");
  if (caller.role !== "admin") throw new HttpError(403, "admin_only", "This needs one of the team's admin keys.");
  if (route === "GET /v1/team") return teamStatus(env, caller);
  if (route === "PATCH /v1/team") return updateTeam(request, env, caller);
  if (route === "DELETE /v1/team") return deleteTeam(env, caller);
  if (route === "POST /v1/team/keys") return createKey(request, env, keys, caller);
  if (route === "POST /v1/team/invites") return createInvite(request, env, keys, caller);
  if (route === "POST /v1/team/refresh") return forceRefresh(request, env, keys, caller);
  if (route === "PUT /v1/team/credentials") return putCredentials(request, env, keys, caller);
  const keyLabel = /^\/v1\/team\/keys\/([^/]+)$/.exec(pathname)?.[1];
  if (request.method === "DELETE" && keyLabel) return revokeKey(env, caller, decodeURIComponent(keyLabel));
  throw new HttpError(404, "not_found", "No such endpoint.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error);
      console.error("guesty-token-service error:", error instanceof Error ? error.message : "unknown");
      return json({ error: "internal", message: "The token service hit an internal error." }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
