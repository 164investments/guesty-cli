# Guesty CLI

This TypeScript CLI uses Commander for commands and native `fetch` for Guesty's Open API. Use npm and strict TypeScript; keep named exports and existing command patterns.

## Authentication is cache-only

- Never mint or request a Guesty OAuth token in a CLI command, script, curl, or agent workflow. Guesty allows only five tokens per 24 hours. Token refresh belongs to the designated server workflow, outside this CLI.
- For authorized scripts, use `guesty token` for Open API `/v1/*` calls and `guesty token --beapi` for booking-engine calls. Never choose the newest `guesty_tokens` row without a `token_type` filter; the types are not interchangeable.
- `src/auth.ts` owns cache validation for both types. `getToken()` is the Open API string interface; `getCachedToken()` also returns type and expiry. Cache reads must verify the token string, explicit type, and expiry with the five-minute buffer. Untyped legacy disk tokens are unusable.
- Keep authentication read-only. Missing, expired, rejected, malformed, or unavailable caches must fail with an actionable error and no token output. A 401 may invalidate the process's copy and retry a different cached token once; it must not mutate shared/disk caches or request a replacement token.
- `init` displays configuration guidance only. `raw` must reject OAuth paths. Do not restore credential verification, token creation, or a "last resort" OAuth fallback.
- Do not print tokens, credentials, private cache contents, or upstream authentication-error bodies during development. Never commit `.env` files or token caches. Token command output is only for an explicitly needed downstream request; avoid exposing it in logs or notes.

## Implementation and verification

- `src/commands/` defines CLI commands; `src/client.ts` centralizes API requests, retries, and rate limiting; `src/env.ts` loads configuration. Check the relevant source before changing behavior.
- For command or option changes, regenerate the machine-readable contract with `npm run generate:cli-spec` and inspect its diff. Keep the README's authentication/setup guidance consistent with the implementation.
- Run `npm ci`, then `npm run check` for authentication or command changes. This compiles strict TypeScript and runs offline regression tests. `npm run typecheck` is available when a standalone type check is sufficient. No separate formatter or linter is configured.
- Authentication tests must mock all network calls and private-cache reads and prove zero OAuth requests or cache writes on failures. Never validate a change by retrieving a real token or contacting Guesty's OAuth endpoint.
- Use a dedicated branch/worktree. Preserve the canonical checkout's local edits and untracked reference files. Commit and push the complete unit, and validate it on an integration/release branch before handoff; do not push `main` as part of routine development.
- The installed CLI may point to a different build than the current worktree. Verify its resolved path before activation. Install a reviewed package/build deliberately; do not overwrite another session's canonical source or generated output.
