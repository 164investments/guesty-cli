# Guesty CLI

A Rust CLI (and stdio MCP server) for Guesty's Open API and Booking Engine API. Version 2 is a port of the 1.x TypeScript CLI with the same commands, options, output and exit codes; agents and scripts depend on that text, so changes to it are interface changes. It ships as the npm package `guesty-cli` with prebuilt binaries. `server/` is the token service it can read from (still TypeScript). This repository is public.

## Authentication is cache-only

- Never mint or request a Guesty OAuth token in a CLI command, script, curl or agent workflow. Guesty allows only five tokens per 24 hours. Token refresh belongs to the designated server workflow or the team token service in `server/`, outside the CLI.
- The CLI reads one of two caches. Either `GUESTY_TOKEN_SERVICE_*` variable selects the token service, which it reads only through `POST /v1/token` with the member's access key; it must never fall back to `SUPABASE_URL`. Otherwise it reads the server-managed `guesty_tokens` table with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- `guesty setup` and `guesty team credentials` are the only commands that take Guesty client credentials. They send them to the token service and never store them locally. The CLI saves only the service URL and access key, in `~/.guesty-cli/.env` with mode 0600.
- For authorized scripts, use `guesty token` for Open API `/v1/*` calls and `guesty token --beapi` for booking-engine calls. Never choose the newest `guesty_tokens` row without a `token_type` filter; the types are not interchangeable.
- `src/auth.rs` owns cache validation for both types. `get_token()` is the Open API string interface; `get_cached_token()` also returns type and expiry. Cache reads must verify the token string, explicit type and expiry with the five-minute buffer. Untyped legacy disk tokens are unusable.
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
- A CLI release is a `v*` tag on `main` that matches the version in `package.json` and `Cargo.toml`. `.github/workflows/release.yml` builds the binaries for macOS and Linux (arm64, x64) and Windows (x64), packs them into `guesty-cli-<version>.tgz` (`scripts/pack.mjs`), installs that package on each platform (`scripts/smoke-install.mjs`) and publishes a GitHub release with `RELEASE_NOTES.md` as its notes. It also runs, without publishing, on pull requests that touch the build.
- The package's `dist/bin.js` is a Node launcher (`npm/launcher.js`). On macOS and Linux its first run copies the native binary over itself, so later runs start the binary directly; npm 12 blocks install scripts, so this can't happen in a postinstall. `dist/cli.js` stays a launcher because 1.x's `guesty update` checks for it.
- The hosted token service is the `hosted` environment in `server/wrangler.jsonc`, deployed by hand. Its production deploys need Trevor's or Hayden's authorization.

## Code map

- `src/cli.rs` is a commander-13-compatible parser and help renderer (same option syntax, help layout, error text and exit codes as the Node CLI); `src/commands/` defines commands with its commander-like builder; `src/client.rs` centralizes API requests, retries and rate limiting; `src/json.rs` reads and writes JSON exactly as JavaScript did (key order, number formatting); `src/env.rs` loads configuration; `src/mcp/` is `guesty mcp`. Check the relevant source before changing behavior.
- `src/prompt.rs` owns prompts and messages for `setup`, `team` and `mcp install`. At a terminal it uses `cliclack`; with piped input it prints plain prompts and reads one line per question, which tests and scripts rely on. Keep both paths asking the same questions in the same order. Keep results on stdout and everything else on stderr.
- `src/hooks.rs` holds the test hooks (`--features test-hooks`: requests redirected to a local mock, a fake clock, recorded sleeps). Release builds never include them; the release workflow checks that.
- For command or option changes, regenerate the machine-readable contract with `npm run generate:cli-spec` (it reads the command tree from `guesty __contract` and each command's requests from `scripts/cli-contract-requests.json`; a new command needs an entry there) and inspect its diff. Keep the README's authentication and setup guidance consistent with the implementation.

## Commands

- Install: `npm ci` (test and tooling dependencies only) and a Rust toolchain (`rustup`, stable).
- Fast check, before you push: `cargo fmt --check`, `cargo test --features test-hooks -- --test-threads=1`, then `npm run build:test-hooks && node --test <test files>` for the tests your change touches (`test/auth.test.mjs` for authentication), and `npm run check:parity` for any change to output, errors or requests.
- Full check, which GitHub Actions (`Check`) runs on Node 20 and 24: `npm run check`. It checks formatting, runs the Rust tests, runs the offline tests against a test-hooks build, checks the CLI contract, and replays the recorded 1.x cases in `scripts/parity/cases/` (and the MCP ones) against the binary. No linter is configured.
- `scripts/parity/` holds those recorded cases: each line is an argv (with stdin and mock replies) and the 1.x CLI's exit code, stdout, stderr and requests. A change that should alter output updates the case's `expected` by hand, with the reason in the PR; never re-record over a difference you didn't intend.
- For changes to `server/` or to the CLI's setup, team or token-service code, also run `npm ci --prefix server` (once) and `npm run check:server`. CI doesn't run it. It type-checks with tsrs, drives `guesty setup` (the binary) in a pseudo-terminal, and runs the Worker in Miniflare against a mock of Guesty's token endpoint. Never test it against Guesty.
- Release builds of every platform, the package and its install are checked by `.github/workflows/release.yml` on pull requests that touch the build; `npm run pack` and `npm run smoke:install` run the same steps locally.

## Rules for this repository

- Authentication tests must mock all network calls and private-cache reads, and prove zero OAuth requests or cache writes on failures. Never validate a change by retrieving a real token or contacting Guesty's OAuth endpoint.
- The installed `guesty` may come from a different build than this worktree. Check its resolved path before you rely on it. Install a build on purpose (`cargo install --path .` puts one in `~/.cargo/bin`), and never overwrite another session's checkout or build output.
- The test hooks (`src/hooks.rs`, `--features test-hooks`) must never reach a release build: they redirect requests and fake the clock. Keep every hook behind that feature.
