import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const TOKEN_FILE = join(homedir(), ".guesty-cli", "token.json");
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const CACHE_TIMEOUT_MS = 10_000;

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

function cacheUnavailable(tokenType: TokenType, reason: string): Error {
  return new Error(
    `No valid cached Guesty ${tokenType} token is available: ${reason}.\n` +
    "CLI authentication is read-only and never requests OAuth tokens. " +
    "Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and have the designated " +
    `server refresh workflow restore a valid ${tokenType} token in the shared cache.`
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

async function readSharedToken(tokenType: TokenType): Promise<CachedToken> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw cacheUnavailable(tokenType, "shared-cache configuration is missing");
  }

  let res: Response;
  try {
    res = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/guesty_tokens?select=access_token,expires_at,token_type&token_type=eq.${tokenType}&order=created_at.desc&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(CACHE_TIMEOUT_MS),
      }
    );
  } catch {
    throw cacheUnavailable(tokenType, "the shared-cache request could not complete");
  }

  if (!res.ok) {
    throw cacheUnavailable(tokenType, `the shared cache returned HTTP ${res.status}`);
  }

  let rows: unknown;
  try {
    rows = await res.json();
  } catch {
    throw cacheUnavailable(tokenType, "the shared cache returned invalid JSON");
  }

  if (!Array.isArray(rows) || !isUsableToken(rows[0], tokenType)) {
    throw cacheUnavailable(tokenType, "the cached row is missing, expired, rejected, or has invalid token metadata");
  }

  const { access_token, expires_at, token_type } = rows[0];
  return { access_token, expires_at, token_type };
}

export function invalidateToken(): void {
  const token = cached.get("openapi");
  if (token) rejectedTokens.add(token.access_token);
  // A 401 invalidates only this process's copy, never the shared or disk cache.
  cached.delete("openapi");
}

export async function getCachedToken(tokenType: TokenType = "openapi"): Promise<CachedToken> {
  const memoryToken = cached.get(tokenType);
  if (isUsableToken(memoryToken, tokenType)) return { ...memoryToken };

  const diskToken = tokenType === "openapi" ? readLocalOpenApiToken() : null;
  const token = diskToken ?? await readSharedToken(tokenType);
  cached.set(tokenType, token);
  return { ...token };
}

export async function getToken(): Promise<string> {
  return (await getCachedToken("openapi")).access_token;
}
