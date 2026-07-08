import { Command } from "commander";
import { getToken } from "../auth.js";
import { print } from "../output.js";

/**
 * Read a cached beapi token straight from Supabase (read-only).
 *
 * The CLI never mints beapi tokens — beapi is booking-engine scope only and
 * lives outside the CLI's Open API surface. This helper exists so that anyone
 * who genuinely needs the beapi token can get the RIGHT one from the shared
 * cache instead of hand-querying `guesty_tokens` and grabbing whatever row is
 * newest (which is how we keep accidentally picking the wrong token type).
 */
async function getBeapiTokenFromSupabase(): Promise<{ access_token: string; expires_at: number } | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Cannot read beapi token: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n" +
      "The CLI never mints beapi tokens — it can only read the cached one from Supabase."
    );
  }

  const res = await fetch(
    `${url}/rest/v1/guesty_tokens?select=access_token,expires_at&token_type=eq.beapi&order=created_at.desc&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" } }
  );
  if (!res.ok) {
    throw new Error(`Failed to read beapi token from Supabase (${res.status})`);
  }

  const rows: { access_token: string; expires_at: number }[] = await res.json();
  return rows.length > 0 ? rows[0] : null;
}

export const token = new Command("token")
  .description(
    "Print the correct cached Guesty API token. Defaults to the Open API token " +
    "(the one every /v1/* call needs). Use this instead of hand-querying " +
    "guesty_tokens — it always returns the right token_type so you never send a " +
    "beapi token to an Open API endpoint. Example: TOK=$(guesty token)"
  )
  .option("--beapi", "Print the BEAPI (booking-engine scope) token instead of Open API")
  .option("--json", "Print token metadata (access_token + expiry) as JSON instead of the bare string")
  .action(async (opts: { beapi?: boolean; json?: boolean }) => {
    if (opts.beapi) {
      const t = await getBeapiTokenFromSupabase();
      if (!t) {
        throw new Error("No cached beapi token found in Supabase (token_type=beapi).");
      }
      if (opts.json) {
        print({ token_type: "beapi", access_token: t.access_token, expires_at: t.expires_at });
      } else {
        print(t.access_token);
      }
      return;
    }

    // Open API — reuses the cache-first, guarded auth path (auth.ts).
    const accessToken = await getToken();
    if (opts.json) {
      print({ token_type: "openapi", access_token: accessToken });
    } else {
      print(accessToken);
    }
  });
