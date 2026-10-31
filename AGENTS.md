# Guesty CLI

A TypeScript CLI for Guesty's Open API, with Commander for commands and native `fetch` for requests. `server/` is the token service it can read from. This repository is public.

## Authentication is cache-only

- Never mint or request a Guesty OAuth token in a CLI command, script, curl or agent workflow. Guesty allows only five tokens per 24 hours. Token refresh belongs to the designated server workflow or the team token service in `server/`, outside the CLI.
- The CLI reads one of two caches. Either `GUESTY_TOKEN_SERVICE_*` variable selects the token service, which it reads only through `POST /v1/token` with the member's access key; it must never fall back to `SUPABASE_URL`. Otherwise it reads the server-managed `guesty_tokens` table with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- `guesty setup` and `guesty team credentials` are the only commands that take Guesty client credentials. They send them to the token service and never store them locally. The CLI saves only the service URL and access key, in `~/.guesty-cli/.env` with mode 0600.
- For authorized scripts, use `guesty token` for Open API `/v1/*` calls and `guesty token --beapi` for booking-engine calls. Never choose the newest `guesty_tokens` row without a `token_type` filter; the types are not interchangeable.
- `src/auth.ts` owns cache validation for both types. `getToken()` is the Open API string interface; `getCachedToken()` also returns type and expiry. Cache reads must verify the token string, explicit type and expiry with the five-minute buffer. Untyped legacy disk tokens are unusable.
- Keep authentication read-only. Missing, expired, rejected, malformed or unavailable caches must fail with an actionable error and no token output. A 401 may invalidate the process's copy and retry a different cached token once. It must not change shared or disk caches or request a replacement token.
- `init` displays configuration guidance only. `raw` must reject OAuth paths. Don't restore credential verification, token creation or a "last resort" OAuth fallback.
- Don't print tokens, credentials, private cache contents or upstream authentication-error bodies during development. Never commit `.env` files or token caches. Token command output is only for an explicitly needed downstream request; keep it out of logs and notes.

## The token service (`server/`)

A Cloudflare Worker with a D1 database. Only it requests tokens. Keep these protections:

- The per-client request caps count every request, including failures.
- Sign-up requests have their own cap, separate from team renewals, and a combined cap keeps every client within Guesty's five.
- Only a failure of the same source starts a pause. Requests pause after failures.
- Each request is recorded before it is sent.
- The history stays keyed by client fingerprint when a team is deleted.
- One team per Guesty client.
- Admin recovery needs Guesty to accept the submitted secret.
- A lease stops two refreshes running at once.
- Credentials, tokens and keys are encrypted or hashed with keys derived from `CREDENTIALS_KEY`.
- No secret appears in a response, log or error.

Invites keep these:

- A code is stored only as a keyed hash, becomes a key once inside one batch, and expires. Opening the join page never uses it.
- Wrong codes are limited per address.
- Invite emails have per-team, per-address and service-wide daily caps. Each is checked in one statement and kept by Guesty client, so they survive team deletion.
- Revoking a key cancels its invites.
- Admin-typed names stay out of email subjects, are escaped in HTML, and lose control, zero-width and text-direction characters.

The CLI validates every key and invite link a service returns before saving or printing it, because a self-hosted service may be untrusted.

## Release lane

- Merging to `main` releases nothing.
- A CLI release is a `v*` tag on `main` that matches the version in `package.json`. `.github/workflows/release.yml` checks it, packs it and publishes a GitHub release with `RELEASE_NOTES.md` as its notes.
- The hosted token service is the `hosted` environment in `server/wrangler.jsonc`, deployed by hand. Its production deploys need Trevor's or Hayden's authorization.

## Code map

- `src/commands/` defines CLI commands; `src/client.ts` centralizes API requests, retries and rate limiting; `src/env.ts` loads configuration. Check the relevant source before changing behavior.
- `src/prompt.ts` owns prompts and messages for `setup` and `team`. At a terminal it uses `@clack/prompts`; with piped input it prints plain prompts and reads one line per question, which tests and scripts rely on. Keep both paths asking the same questions in the same order. Keep results on stdout and everything else on stderr.
- For command or option changes, regenerate the machine-readable contract with `npm run generate:cli-spec` and inspect its diff. Keep the README's authentication and setup guidance consistent with the implementation.

## Commands

- Install: `npm ci`
- Fast check, before you push: `npm run typecheck`, then `npm run build && node --test <test files>` for the tests your change touches (`test/auth.test.mjs` for authentication).
- Full check, which GitHub Actions (`Check`) runs on Node 20 and 24: `npm run check`. It compiles strict TypeScript, runs the offline tests and checks the CLI contract. No separate formatter or linter is configured.
- For changes to `server/` or to the CLI's setup, team or token-service code, also run `npm ci --prefix server` (once) and `npm run check:server`. CI doesn't run it. It type-checks with tsrs, drives setup in a pseudo-terminal, and runs the Worker in Miniflare against a mock of Guesty's token endpoint. Never test it against Guesty.

## Rules for this repository

- Authentication tests must mock all network calls and private-cache reads, and prove zero OAuth requests or cache writes on failures. Never validate a change by retrieving a real token or contacting Guesty's OAuth endpoint.
- The installed `guesty` may come from a different build than this worktree. Check its resolved path before you rely on it. Install a build on purpose (`npm run link` replaces the global one), and never overwrite another session's checkout or build output.
