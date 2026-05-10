# AGENTS.md — Guide for AI agents working on this repo

This is a TypeScript CLI for the Guesty Open API. Agents (Claude, Cursor, etc.) working on this repo should follow this playbook.

## Quick architecture

```
src/
  cli.ts          # commander entry point
  auth.ts         # OAuth client_credentials with token caching (~/.guesty-cli/)
  client.ts       # HTTP wrapper with rate limiting (100 req/min) and retries
  commands/       # one file per noun: reservations, listings, calendar, ...
                  # each registers commander subcommands

scripts/
  scrape-api-docs.ts     # pulls the live Guesty docs sitemap, scrapes /reference/*.md
                          # (each .md has an embedded OpenAPI 3.0.3 JSON block)
  refresh-api-spec.ts    # compiles scraped MD into api-spec.json (the manifest)
  generate-cli-spec.mjs  # generates the larger guesty-cli-spec.json used by raw command
  build-knowledge-base.ts # builds searchable RAG knowledge base from docs

docs/
  api-reference/  # fresh scraped MD (one file per endpoint, ~319 files)
                  # NOT committed by default — regenerate via scripts/scrape-api-docs.ts
  api/            # legacy categorized layout (gitignored)

api-spec.json         # 60KB manifest: { category: [{method, path, title, slug}, ...] }
guesty-cli-spec.json  # 8MB+ generated big spec — used by `guesty raw` for validation
```

## When making changes

**Most common task: refresh the API spec to match latest Guesty API.**

```bash
cd <repo>
npx tsx scripts/scrape-api-docs.ts     # ~75 sec, fetches all 319 endpoint docs
npm run refresh:api-spec                # rebuild api-spec.json from scraped MD
npm run generate:cli-spec               # rebuild guesty-cli-spec.json
npm run build                           # tsc
```

The scrape script fetches slugs **dynamically** from `https://open-api-docs.guesty.com/sitemap.xml`. It falls back to `FALLBACK_SLUGS` (hardcoded list) if the sitemap is unreachable. Don't hardcode new slugs — re-run scrape and the sitemap fetch handles it.

**Adding a new named subcommand:**

1. Find the endpoint in `api-spec.json` to confirm method + path.
2. Read the matching file in `docs/api-reference/` for the full request/response schema.
3. Pick the right command file under `src/commands/` (or create a new one).
4. Register the subcommand using commander, calling `request()` from `src/client.ts`.
5. Wire it into `src/cli.ts` if it's a new top-level command file.
6. Build + smoke-test.

**Critical: never bypass the rate limiter** in `src/client.ts`. Guesty caps OAuth tokens at 1 per 24h and API calls at 100/min. The CLI handles both — don't shortcut.

## How to test changes

```bash
# 1) Build
npm run build && npm link   # makes 'guesty' globally callable

# 2) Auth (one-time, requires Guesty Open API client_id + secret)
guesty init                         # walks through credential setup
# OR set env:
export GUESTY_CLIENT_ID=...
export GUESTY_CLIENT_SECRET=...
# OR (recommended on macOS) use Keychain:
export GUESTY_CLIENT_ID=$(security find-generic-password -a "$USER" -s "guesty-client-id" -w)
export GUESTY_CLIENT_SECRET=$(security find-generic-password -a "$USER" -s "guesty-client-secret" -w)

# 3) Smoke test (uses cached token, no auth spend)
guesty raw GET /v1/accounts/me         # should return account JSON
guesty rs list                          # should list all rate strategies

# 4) Test new command
guesty <your-new-command> ...
```

## Pushing PRs

This repo's `origin` is the upstream (`164investments/guesty-cli`). Most contributors fork:

```bash
# One-time setup (skip if already done):
gh repo fork 164investments/guesty-cli --clone=false --remote=true   # adds 'origin' = your fork
# After fork, the original 'origin' becomes 'upstream' automatically.

# For each PR:
git checkout -b your-branch-name
# ...make changes, commit...
git push origin your-branch-name
gh pr create --base main --head your-branch-name --title "..." --body "..."
```

If you've already set up `origin` to point at your fork (and `upstream` at 164investments), use those names accordingly.

## Common pitfalls

1. **Token cap (1 per 24h)** — every test that re-auths burns the daily allowance. Reuse `~/.guesty-cli/token.json` aggressively.
2. **Stale `dist/`** — `npm run build` is required after any `src/` change. `npm link` only links the built output.
3. **Sitemap can return blank slugs** — the regex in `scrape-api-docs.ts` filters for `[a-z0-9_-]+`. If Guesty changes their slug naming convention (e.g., adds dots or capitals), update the regex.
4. **Read-only-by-design endpoints** — Guesty Open API is **read-only for rate strategies**. If you need to mutate strategy rules, use `PUT /v1/availability-pricing/api/calendar/listings/{id}` to write equivalent date-level overrides instead. The rate strategy abstraction stays vestigial; the calendar is the source of truth for what guests actually see.
5. **`--params` for query strings, `--data` for body** — easy to mix up on `guesty raw`.

## When to use raw vs named commands

- **`guesty raw`** for any endpoint not yet wrapped, or for one-off explorations.
- **Named commands** (e.g., `guesty rs list`, `guesty res list`) for stable workflows where you want better UX and validation.

If you find yourself running the same `guesty raw <method> <path>` twice, that's a signal to wrap it in a named command.

## Repo conventions

- TypeScript strict mode (see `tsconfig.json`).
- ES modules (`"type": "module"` in `package.json`).
- Commander v13 for CLI, no other deps in production.
- Auth, client, and one entry point file per noun in `commands/`.
- Tests: not currently in the repo. New PRs adding tests welcome.
