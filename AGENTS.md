# Agent notes for guesty-cli

## Getting a token — use `guesty token`, never hand-query the table
- **`guesty token`** prints the cached **Open API** token (the one every `/v1/*` call needs). Use it in scripts: `TOK=$(guesty token)`.
- **`guesty token --beapi`** prints the cached BEAPI (booking-engine scope) token.
- Add `--json` to see metadata (access_token + expiry).

Do NOT read `guesty_tokens` directly with `order=created_at.desc&limit=1` and no `token_type` filter. The newest row may be a `beapi` token, and sending a beapi token to an Open API endpoint returns 401. `guesty token` always filters by the correct `token_type` — that's the whole reason it exists. Implemented in `src/commands/token.ts`; the Open API path reuses `getToken()` in `src/auth.ts` (which is hard-filtered to `token_type=eq.openapi`).

## Token safety
- NEVER mint a new Guesty OAuth token in a script/curl. 5 tokens per 24h → lockout. The CLI reads cached tokens from Supabase and only mints as a guarded last resort (`MAX_TOKENS_PER_DAY = 1`).
- The CLI is Open API only (`BASE_URL = https://open-api.guesty.com`). It never sends a beapi token to an Open API endpoint.
