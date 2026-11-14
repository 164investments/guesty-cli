# guesty-mcp-worker

The hosted Guesty MCP server, `https://guesty-mcp.staykit.ai/mcp`, as a Rust Cloudflare Worker
(workers-rs 0.8.7). It holds everything around the MCP tools: routing, the OAuth 2.1
authorization server, D1 storage, the sign-in page, per-request member-key checks against the
team token service, and outbound HTTP. The plan is `PLAN-hosted-mcp.md`; its ledger items are
marked `S1`–`S13` in the code.

## Routes

| Route | What it does |
| --- | --- |
| `POST /mcp` | Streamable HTTP, stateless JSON. Bearer auth (401 + `WWW-Authenticate: Bearer resource_metadata=…`), Origin check, 1 MB body cap, one message per request, notifications 202, `GET`/`DELETE` 405. |
| `/.well-known/oauth-protected-resource[/mcp]` | RFC 9728 metadata. |
| `/.well-known/oauth-authorization-server` | RFC 8414 metadata (S256 only, `none` auth only, RFC 9207 `iss`, client ID metadata documents). |
| `POST /register` | RFC 7591, public clients only. |
| `GET`/`POST /authorize` | The sign-in page and its submission. |
| `POST /token` | `authorization_code` and rotating `refresh_token`. |
| `POST /revoke` | RFC 7009; either token revokes the grant. |
| `GET /` | Landing page. |

## The tools

`/mcp` runs the shared core's MCP server (`guesty_core::mcp::Server`), so the five tools, their
input schemas and their answers are the local `guesty mcp`'s, byte for byte (the Miniflare suite
compares them). `serverInfo` is `guesty-cli` with the title "Guesty"; the instructions are the
CLI's except that a lost sign-in is fixed by reconnecting the server in the app. Read-only sign-ins
refuse writes and invites.

`src/mcp.rs` is the boundary: the Worker authenticates, parses one JSON-RPC message (nesting is
checked before parsing, at most 128 levels) and calls `McpHandler::handle(&backend, &request)`,
which returns the core's reply text or `McpOutcome::Unauthorized` (401 `invalid_token`).
`src/hosted.rs` is the handler (`CoreHandler`) and the core's `Backend` (`Hosted`) over the
request's `HostedBackend` (`src/app/backend.rs`, `WorkerBackend`). Each Guesty request runs the
core's own decisions (`prepare_*`, `Attempts`), as the CLI's client does:

- every attempt gets the team's token from the token service with the member key (S2, no cache);
- manual redirects: a Guesty 3xx comes back as a response and the core says redirects aren't
  followed (the token service and metadata documents treat a redirect as an error);
- the timeout is the smaller of the request's 60 s and what's left of the call's 50 s (S8); reads
  retry network errors, timeouts, 408 and 5xx, any request retries a 429 after Retry-After, and
  only when the wait fits; a write that times out says its outcome is unknown;
- a 401 re-reads the token once; the same token again fails with what an admin can do;
- response bodies over 8 MB, or with more than 300,000 JSON values, are refused before parsing, and all_pages keeps one page in memory at a time (S7), error bodies lose the tokens sent and the member key;
- one tool call makes at most 50 requests, token lookups included (S7); `all_pages` stops past
  2,000 results or 32 MB, or when the deadline would pass, with no partial result;
- a revoked member key anywhere in a call answers the whole request 401 `invalid_token`.

`team_status` and `invite_teammate` go to the token service's `/v1/team…` endpoints; invite links
it returns must point at its public URL (the first of `TOKEN_SERVICE_ORIGINS`), not the binding's
placeholder host.

## Sign-in redirects

Apps that register (RFC 7591) may use https, http on a loopback host (any port, RFC 8252 §8.4), or
their own URI scheme (RFC 8252 §7.1), such as Cursor's
`cursor://anysphere.cursor-mcp/oauth/callback`. Schemes a browser handles itself (`javascript`,
`data`, `file`, `blob`, `vbscript`, `about`, `view-source`, `filesystem`) are refused. The sign-in
page names such an app "a desktop app (cursor://…)", and its CSP `form-action` allows exactly that
scheme (`cursor:`), since browsers check form-action on the redirect after the post.

## Tests

```sh
cargo test -p guesty-mcp-worker   # unit tests: OAuth rules, crypto, the store on SQLite, the request loop
npm ci --prefix ../../server      # once: Miniflare and wrangler for the token service
npm test                          # worker-build, the token service, the CLI, then the Miniflare suite
```

`npm test` needs `worker-build` (`cargo install worker-build --version 0.8.7 --locked`), the
`wasm32-unknown-unknown` target and Node 22 or later. The suite runs this Worker with the real
token service from `server/`, mocks of Guesty's token endpoint, of `open-api.guesty.com` and
`booking.guesty.com`, and of the client-metadata hosts; any other outbound request fails it. A
second copy of the Worker on the same database sets `CALL_BUDGET_MS` (8 s) and `GUESTY_TIMEOUT_MS`
(1 s) so timeout and deadline cases take seconds; both variables only lower a limit and are unset
in production. The suite also runs `target/debug/guesty mcp` and checks that `tools/list`, dozens
of searches and a sample of describes answer byte for byte as they do here.

The Worker is a member of the repository's Cargo workspace (not a default member). The root
release profile applies to its wasm, except `strip`, which would remove what wasm-bindgen needs.
The bundle is about 7.7 MB of wasm, 1.0 MB gzipped (most of it the embedded API documents).

## Deploy

See the comments at the top of `wrangler.toml`: create the D1 database `guesty-mcp`, put its id in
`env.hosted`, apply `migrations/`, set the `MCP_KEY` secret (32 random bytes, base64), deploy with
`--env hosted`. Deploys need Trevor's or Hayden's authorization.
