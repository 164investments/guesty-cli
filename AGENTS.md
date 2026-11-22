# Guesty CLI

Public Rust CLI (and stdio MCP server) for Guesty's Open API and Booking Engine API. Version 2 is a Rust port of the 1.x TypeScript CLI with identical commands, options, output, and exit codes — agents and scripts depend on that text, so changing it is an interface change. Ships as the npm package `guesty-cli` with prebuilt native binaries. `server/` is the TypeScript token service; `crates/guesty-mcp-worker` is the Rust hosted MCP Cloudflare Worker.

## Authentication is cache-only

- Never mint or request a Guesty OAuth token in a CLI command, script, curl, or agent workflow. Guesty allows only **5 tokens per 24 hours**. Token refresh belongs solely to the designated server workflow or `server/`.
- The CLI reads one of two caches. If either `GUESTY_TOKEN_SERVICE_*` variable is set, it reads only the token service via `POST /v1/token` with the member access key and must never fall back to `SUPABASE_URL`. Otherwise it reads the server-managed `guesty_tokens` table via `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Only `guesty setup` and `guesty team credentials` accept Guesty client credentials; they send them to the token service and never store them locally. The CLI saves only the service URL and access key in `~/.guesty-cli/.env` (mode `0600`).
- For authorized scripts, use `guesty token` for Open API (`/v1/*`) and `guesty token --beapi` for Booking Engine calls. Never select the newest `guesty_tokens` row without filtering `token_type`; types are not interchangeable.
- `src/auth.rs` owns cache validation for both types (`get_token()` returns the Open API string; `get_cached_token()` also returns type and expiry). Cache reads must verify token string, explicit type, and expiry with the 5-minute buffer. Untyped legacy disk tokens are unusable.
- Keep authentication read-only. Missing, expired, rejected, malformed, or unavailable caches must fail with an actionable error and no token output. A 401 may invalidate the process's copy and retry a different cached token once; it must never mutate shared/disk caches or request a replacement token.
- `init` displays configuration guidance only. `raw` must reject OAuth paths. Never restore credential verification, token creation, or a "last resort" OAuth fallback.
- Never print tokens, credentials, private cache contents, or upstream auth-error bodies, and never commit `.env` files or token caches. Keep `guesty token` output out of logs and notes.

## Token service (`server/`)

Cloudflare Worker + D1 database; the only component that requests tokens. Preserve every protection:

- Per-client request caps count every request, including failures.
- Sign-up requests have their own cap separate from team renewals; a combined cap keeps every client within Guesty's 5/24h limit.
- Only a failure from the same source starts a pause; requests pause after failures.
- Record each request before sending it; keep history keyed by client fingerprint even after team deletion.
- One team per Guesty client; admin recovery requires Guesty to accept the submitted secret.
- A lease prevents concurrent refreshes.
- Encrypt or hash credentials, tokens, and keys with keys derived from `CREDENTIALS_KEY`; never emit secrets in responses, logs, or errors.
- **Invites:** store codes only as keyed hashes, spend once inside a single batch, and expire them (opening the join page never spends a code); rate-limit wrong codes per address; enforce per-team, per-address, and service-wide daily email caps in one statement keyed by Guesty client (surviving team deletion); revoking a key cancels its invites; keep admin-typed names out of email subjects, HTML-escape them, and strip control/zero-width/bidi characters.
- The CLI validates every key and invite link returned by a token service before saving or printing it (a self-hosted service may be untrusted).

## Hosted MCP server (`crates/guesty-mcp-worker`)

Rust Cloudflare Worker (`guesty-mcp.staykit.ai`, OAuth 2.1 authorization server + MCP server, member of the Cargo workspace but not a default member; details in [crates/guesty-mcp-worker/README.md](crates/guesty-mcp-worker/README.md)):

- Guesty data passes through and is never stored or logged. Invocation logs and traces stay off; log only short error codes.
- Every tool call validates the member key with the token service via the `TOKENS` service binding (no token cache, so revoking a key ends access and sign-in immediately).
- PKCE `S256` only; exact redirect URI match except loopback `http` port; codes and refresh tokens are bound to client, redirect URI, resource, and grant, spent in one statement, and reuse revokes the grant.
- Client ID metadata documents are read only from allowed origins; other apps register dynamically.
- Member keys are sealed and codes/tokens hashed with keys derived from `MCP_KEY` (changing it signs everyone out).
- Tools come from `guesty-core` with `Limits::HOSTED`, matching `guesty mcp` except instructions text and hosted limits.

## Release lane

- **Merging to `main` releases nothing.**
- **CLI release:** push a `v*` tag on `main` matching `package.json` and `Cargo.toml`. `.github/workflows/release.yml` builds macOS/Linux (arm64, x64) and Windows (x64) binaries, packs `guesty-cli-<version>.tgz` (`scripts/pack.mjs`), smoke-installs on each platform (`scripts/smoke-install.mjs`), and publishes a GitHub release using `RELEASE_NOTES.md`. It also runs (without publishing) on PRs touching build files.
- `dist/bin.js` is a Node launcher (`npm/launcher.js`) that replaces itself with the native binary on first run on macOS/Linux (npm 12 blocks postinstall scripts). Keep `dist/cli.js` as a launcher because 1.x `guesty update` checks for it.
- **Hosted Cloudflare Workers:** `server/wrangler.jsonc` (`hosted` env) and `crates/guesty-mcp-worker/wrangler.toml` (`hosted` env, D1 `guesty-mcp`, `MCP_KEY`, `TOKENS` binding) are deployed by hand. Never deploy either or create Cloudflare resources without Trevor's or Hayden's authorization.

## Code map

- **Cargo workspace:** root package is the CLI; `crates/guesty-core` is the I/O-free core (no network, fs, env, terminal, or threads; must compile with `cargo build -p guesty-core --target wasm32-unknown-unknown`) holding JSON parity (`json.rs`), request/retry/redaction/pagination rules (`request.rs`), token-service/invite validation, compile-time operation catalog (`build/`), and async MCP protocol/tools (`mcp/` over `Backend`). `src/client.rs`, `src/token_service.rs`, `src/mcp/mod.rs`, and `crates/guesty-mcp-worker/src/hosted.rs` wrap it with I/O — changes to messages or rules belong in `guesty-core`.
- **CLI:** `src/cli.rs` (commander-13-compatible parser/help/exit codes), `src/commands/` (command definitions), `src/env.rs` (config), `src/prompt.rs` (`cliclack` interactively, one-line plain prompts when piped — keep question order identical; results on stdout, everything else on stderr), `src/hooks.rs` (`--features test-hooks` for local mock redirect, fake clock, recorded sleeps).
- **Contract:** after command/option changes, run `npm run generate:cli-spec` (reads `guesty __contract` and `scripts/cli-contract-requests.json`; new commands need an entry there) and inspect the diff. Keep `README.md` auth/setup guidance consistent with the code.

## Commands and CI

- **Install:** `npm ci` (test/tooling deps) and stable Rust (`rustup`). For token-service checks: `npm ci --prefix server`.
- **Fast check** (before pushing): `cargo fmt --check`, `cargo test --features test-hooks -- --test-threads=1`, targeted `npm run build:test-hooks && node --test <test files>` (`test/auth.test.mjs` for auth), and `npm run check:parity` when changing output, errors, or requests. For `server/` or setup/team/token-service changes, run `npm run check:server` (tsrs type-check + Miniflare mock of Guesty + PTY `guesty setup`). For `guesty-mcp-worker` changes, run `cargo test -p guesty-mcp-worker` and `npm --prefix crates/guesty-mcp-worker test`.
- **CI (`.github/workflows/check.yml`, GitHub Actions `ubuntu-latest`):** let CI run the full matrix rather than running full suites repeatedly on shared dev machines:
  - `check` (Node 22, 24, 26): `npm run check` (`cargo fmt --check`, Rust tests, offline CLI + script tests, `check:cli-spec`, `check:parity`) + `cargo build -p guesty-core --target wasm32-unknown-unknown`.
  - `worker` (Node 24): `cargo test -p guesty-mcp-worker`, `cargo clippy -p guesty-mcp-worker --no-deps` (both `wasm32-unknown-unknown` and `--tests`, `-D warnings`), `npm --prefix crates/guesty-mcp-worker test`, and `npm run check:server`.
- **Parity cases (`scripts/parity/cases/`):** recorded 1.x argv/stdin/mock replies and expected exit code, stdout, stderr, and requests. Update `expected` by hand with the reason in the PR for intentional output changes; never re-record over unintended diffs.
- **Local release smoke:** `npm run pack` and `npm run smoke:install`.

## Rules for this repository

- Authentication tests must mock all network calls and private-cache reads, proving zero OAuth requests or cache writes on failure. Never test against Guesty's real OAuth endpoint.
- Check which `guesty` binary is on `PATH` before relying on it; install deliberately (`cargo install --path .` installs to `~/.cargo/bin`) and never overwrite another session's build output.
- Test hooks (`src/hooks.rs`, `--features test-hooks`) must never enter a release build; keep every hook behind that feature (`release.yml` verifies release binaries ignore `GUESTY_TEST_REDIRECT`).
