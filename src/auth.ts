import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const TOKEN_FILE = join(homedir(), ".guesty-cli", "token.json");
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const CACHE_TIMEOUT_MS = 10_000;
const TEAM_CACHE_ENV = ["GUESTY_TEAM_CACHE_URL", "GUESTY_TEAM_CACHE_API_KEY", "GUESTY_TEAM_CACHE_ACCESS_KEY"] as const;

export type TokenType = "openapi" | "beapi";

export interface CachedToken {
  token_type: TokenType;
  access_token: string;
  expires_at: number;
}

const cached = new Map<TokenType, CachedToken>();
const rejectedTokens = new Set<string>();

function isUsableToken(value: unknown, tokenType: TokenType): value is CachedToken {
  if (!value || typeof value !== "object") return false;
  const token = value as Partial<CachedToken>;
  return (
    token.token_type === tokenType &&
    typeof token.access_token === "string" &&
    token.access_token.length > 0 &&
    !/\s/.test(token.access_token) &&
    !rejectedTokens.has(token.access_token) &&
    typeof token.expires_at === "number" &&
    Number.isFinite(token.expires_at) &&
    token.expires_at > Date.now() + EXPIRY_BUFFER_MS
  );
}

// Any team-cache variable selects the team cache, so a partial setup fails
// instead of silently reading an unrelated SUPABASE_URL project.
function usesTeamCache(): boolean {
  return TEAM_CACHE_ENV.some((name) => process.env[name]);
}

export function cacheGuidance(tokenType: TokenType): string {
  return usesTeamCache()
    ? `Check ${TEAM_CACHE_ENV.join(", ")}. The team cache renews its own tokens; its admin can ` +
      `check guesty_cli.status, and select guesty_cli.refresh_token('${tokenType}', true) replaces a token Guesty rejected.`
    : "Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and have the designated " +
      `server refresh workflow restore a valid ${tokenType} token in the shared cache.`;
}

function cacheUnavailable(tokenType: TokenType, reason: string): Error {
  return new Error(
    `No valid cached Guesty ${tokenType} token is available: ${reason}.\n` +
    "CLI authentication is read-only and never requests OAuth tokens. " +
    cacheGuidance(tokenType)
  );
}

function readLocalOpenApiToken(): CachedToken | null {
  try {
    const data: unknown = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
    const token = data && typeof data === "object" && "token" in data ? data.token : null;
    // Legacy files without token_type cannot establish the token's API scope.
    if (!isUsableToken(token, "openapi")) return null;
    const { access_token, expires_at, token_type } = token;
    return { access_token, expires_at, token_type };
  } catch {
    return null;
  }
}

async function fetchCachedToken(
  tokenType: TokenType,
  source: "shared cache" | "team cache",
  url: string,
  init: RequestInit
): Promise<CachedToken> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(CACHE_TIMEOUT_MS), redirect: "error" });
  } catch {
    throw cacheUnavailable(tokenType, `the ${source} request could not complete`);
  }

  if (!res.ok) {
    throw cacheUnavailable(tokenType, source === "team cache" && (res.status === 401 || res.status === 403)
      ? `the team cache rejected the access key or API key (HTTP ${res.status})`
      : `the ${source} returned HTTP ${res.status}`);
  }

  let rows: unknown;
  try {
    rows = await res.json();
  } catch {
    throw cacheUnavailable(tokenType, `the ${source} returned invalid JSON`);
  }

  if (source === "team cache" && Array.isArray(rows) && rows.length === 0) {
    throw cacheUnavailable(tokenType, "the team cache has no unexpired token");
  }
  if (!Array.isArray(rows) || !isUsableToken(rows[0], tokenType)) {
    throw cacheUnavailable(tokenType, "the cached row is missing, expired, rejected, or has invalid token metadata");
  }

  const { access_token, expires_at, token_type } = rows[0];
  return { access_token, expires_at, token_type };
}

async function readSharedToken(tokenType: TokenType): Promise<CachedToken> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw cacheUnavailable(tokenType, "shared-cache configuration is missing");
  }

  return fetchCachedToken(
    tokenType,
    "shared cache",
    `${url.replace(/\/$/, "")}/rest/v1/guesty_tokens?select=access_token,expires_at,token_type&token_type=eq.${tokenType}&order=created_at.desc&limit=1`,
    {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    }
  );
}

// A team's own Supabase project, set up with sql/team-token-cache.sql. Its
// scheduled job requests tokens; members only read them with an access key.
async function readTeamToken(tokenType: TokenType): Promise<CachedToken> {
  const [url, apiKey, accessKey] = TEAM_CACHE_ENV.map((name) => process.env[name]);
  if (!url || !apiKey || !accessKey) {
    throw cacheUnavailable(tokenType, "team-cache configuration is incomplete");
  }
  let base: URL;
  try {
    base = new URL(url);
  } catch {
    throw cacheUnavailable(tokenType, "GUESTY_TEAM_CACHE_URL is not a valid URL");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  if (base.protocol !== "https:" && !(base.protocol === "http:" && local)) {
    throw cacheUnavailable(tokenType, "GUESTY_TEAM_CACHE_URL must use https");
  }

  return fetchCachedToken(tokenType, "team cache", `${url.replace(/\/$/, "")}/rest/v1/rpc/guesty_cli_token`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_access_key: accessKey, p_token_type: tokenType }),
  });
}

export function invalidateToken(rejectedToken?: string): void {
  const token = cached.get("openapi");
  const rejected = rejectedToken ?? token?.access_token;
  if (rejected) rejectedTokens.add(rejected);
  // A 401 invalidates only this process's copy, never the shared or disk cache.
  // A concurrent request may already have installed a different cached token.
  if (token?.access_token === rejected) cached.delete("openapi");
}

export async function getCachedToken(tokenType: TokenType = "openapi"): Promise<CachedToken> {
  if (tokenType !== "openapi" && tokenType !== "beapi") {
    throw new Error("Cached token type must be openapi or beapi.");
  }
  const memoryToken = cached.get(tokenType);
  if (isUsableToken(memoryToken, tokenType)) return { ...memoryToken };

  const diskToken = tokenType === "openapi" ? readLocalOpenApiToken() : null;
  const token = diskToken ?? await (usesTeamCache() ? readTeamToken(tokenType) : readSharedToken(tokenType));
  cached.set(tokenType, token);
  return { ...token };
}

export async function getToken(): Promise<string> {
  return (await getCachedToken("openapi")).access_token;
}
