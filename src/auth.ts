import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".guesty-cli");
const TOKEN_FILE = join(CONFIG_DIR, "token.json");
const MAX_TOKENS_PER_DAY = 5;
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

interface TokenData {
  access_token: string;
  expires_at: number;
}

interface TokenFileData {
  token: TokenData | null;
  issued_timestamps: number[];
}

let cached: TokenFileData = { token: null, issued_timestamps: [] };
let diskLoaded = false;

function loadFromDisk(): void {
  if (diskLoaded) return;
  try {
    if (existsSync(TOKEN_FILE)) {
      cached = JSON.parse(readFileSync(TOKEN_FILE, "utf8"));
    }
  } catch {
    cached = { token: null, issued_timestamps: [] };
  }
  diskLoaded = true;
}

function saveToDisk(): void {
  try {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }
    writeFileSync(TOKEN_FILE, JSON.stringify(cached, null, 2));
  } catch (e) {
    process.stderr.write(`Warning: failed to save token cache: ${e}\n`);
  }
}

function pruneOldTimestamps(): void {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  cached.issued_timestamps = cached.issued_timestamps.filter((t) => t > cutoff);
}

function hasSupabase(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function getTokenFromSupabase(): Promise<TokenData | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/guesty_tokens?select=access_token,expires_at&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) return null;

    const rows: TokenData[] = await res.json();
    if (rows.length === 0) return null;

    const token = rows[0];
    if (token.expires_at > Date.now() + REFRESH_BUFFER_MS) {
      return token;
    }
  } catch {
    // Fall through to direct OAuth
  }
  return null;
}

async function saveTokenToSupabase(token: TokenData): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    await fetch(`${url}/rest/v1/guesty_tokens`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        token_type: "Bearer",
        access_token: token.access_token,
        expires_at: token.expires_at,
        created_at: Date.now(),
      }),
    });
  } catch {
    // Non-fatal
  }
}

export function invalidateToken(): void {
  loadFromDisk();
  cached.token = null;
  saveToDisk();
}

export async function getToken(): Promise<string> {
  loadFromDisk();
  pruneOldTimestamps();

  // 1. Return in-memory/disk cached token if still valid
  if (cached.token && cached.token.expires_at > Date.now() + REFRESH_BUFFER_MS) {
    return cached.token.access_token;
  }

  // 2. If Supabase is configured, read shared token (avoids burning a token request)
  if (hasSupabase()) {
    const sbToken = await getTokenFromSupabase();
    if (sbToken) {
      cached.token = sbToken;
      saveToDisk();
      return sbToken.access_token;
    }
  }

  // 3. Request new token from Guesty directly
  if (cached.issued_timestamps.length >= MAX_TOKENS_PER_DAY) {
    const oldest = cached.issued_timestamps[0];
    const resetIn = Math.ceil((oldest + 24 * 60 * 60 * 1000 - Date.now()) / 60_000);
    throw new Error(
      `OAuth token limit reached (${MAX_TOKENS_PER_DAY}/day). Next token available in ~${resetIn} minutes. ` +
      `Guesty enforces a strict 5-token-per-24h limit on their OAuth endpoint.`
    );
  }

  const clientId = process.env.GUESTY_CLIENT_ID;
  const clientSecret = process.env.GUESTY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GUESTY_CLIENT_ID and/or GUESTY_CLIENT_SECRET.\n" +
      "Set them as environment variables or in ~/.guesty-cli/.env"
    );
  }

  process.stderr.write("Requesting new Guesty OAuth token...\n");

  const res = await fetch("https://open-api.guesty.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "open-api",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OAuth token request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const tokenData: TokenData = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
  };

  cached.token = tokenData;
  cached.issued_timestamps.push(Date.now());
  saveToDisk();

  // Share with Supabase if configured
  await saveTokenToSupabase(tokenData);

  process.stderr.write("Token acquired and cached.\n");
  return tokenData.access_token;
}
