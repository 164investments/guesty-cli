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

## Where the shared core plugs in

`src/mcp.rs` is the boundary. The Worker authenticates, parses one JSON-RPC message and calls
`McpHandler::handle(&backend, &request)`, which returns `McpOutcome::Response(json)` or
`McpOutcome::Unauthorized` (answered 401 `invalid_token`). `StubHandler` answers `initialize`,
`ping`, `tools/list` and a `key_check` tool until the core's dispatcher replaces it (the `HANDLER`
constant in `src/app/mcp_route.rs`).

The handler gets a `HostedBackend` (`src/app/backend.rs`, `WorkerBackend`):

- `guesty_token(TokenType)`: the team's token from the token service with the grant's member key,
  on every call (S2). A 401 revokes the grant and returns `BackendError::Revoked`.
- `team_service(method, path, body)`: `/v1/team…` endpoints with the member key; 401 as above.
- `http(OutboundRequest, FetchLimits)`: one outbound request (`src/transport.rs`).
- `grant()` (team, role, `read_only`) and `deadline()` (50 s per call, S8).

`impl guesty_core::Backend for WorkerBackend` goes in `src/app/backend.rs`.

## Tests

```sh
cargo test                      # unit tests: OAuth rules, crypto, the store on SQLite, the MCP boundary
npm ci --prefix ../../server    # once: Miniflare and wrangler for the token service
npm test                        # worker-build, build the token service, Miniflare integration suite
```

`npm test` needs `worker-build` (`cargo install worker-build --version 0.8.7 --locked`) and the
`wasm32-unknown-unknown` target. The suite runs this Worker with the real token service from
`server/` and mocks of Guesty's token endpoint and of the client-metadata hosts; any other outbound
request fails it.

## Deploy

See the comments at the top of `wrangler.toml`: create the D1 database `guesty-mcp`, put its id in
`env.hosted`, apply `migrations/`, set the `MCP_KEY` secret (32 random bytes, base64), deploy with
`--env hosted`. Deploys need Trevor's or Hayden's authorization.
