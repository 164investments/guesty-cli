# Guesty CLI 1.3.0

Version 1.3.0 lets a whole team share one Guesty token. Guesty allows five new tokens per client ID in any 24 hours, so a team that requested one per person could lock its account out for a day. `guesty setup` connects the CLI to a token service that keeps one token per team and hands it to every teammate's CLI.

## Install or update

```bash
npm install -g https://github.com/164investments/guesty-cli/releases/download/v1.3.0/guesty-cli-1.3.0.tgz
guesty setup
```

Users on 1.2.0 or later can run `guesty update` instead. The release includes `SHA256SUMS` for the compiled tarball.

## Share one token across a team

- `guesty setup` offers three choices: create a team on Simply VRM's free hosted token service (`https://guesty-tokens.simplyvacationrentalmanagement.com`), create a team on a token service you run yourself, or join a team with an invite code.
- The admin enters the Guesty Open API client ID and secret once, plus optional booking-engine credentials. Guesty confirms them before the service saves them. Teammates never see the secret.
- `guesty team invite "Name"` prints an invite code, and the teammate runs `guesty team join <code>`. `guesty team` also handles `revoke`, `status`, `refresh`, `credentials`, `limit` and `delete`.
- The CLI saves only the service URL and the access key, in `~/.guesty-cli/.env`, readable only by you. When those are set, `guesty token` and every API command use the team's token.

## How the token service protects the allowance

- It requests a new token only when a teammate needs one and the cached token has less than an hour left, so a busy team uses about one token a day. Teammates asking at the same moment share one request.
- Team renewals are limited to three requests per Guesty client in any 24 hours, counting failures; `guesty team limit` changes that. Sign-up attempts have their own small allowance. Together they never exceed Guesty's five. Requests pause after a failure, for two hours after a 429.
- There is one team per Guesty client, and the request history survives deleting a team. Recovering admin access requires Guesty to accept the current client secret.
- Credentials and tokens are encrypted at rest, and access keys are stored only as keyed hashes.

The service is in [`server/`](server), a Cloudflare Worker with a D1 database that runs on Cloudflare's free plan. The README explains how to run your own.

## Unchanged

The CLI still never requests OAuth tokens. The existing `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` cache works as before, and the `token`, `raw` and 401 behavior is the same. The bundled API catalog is the 2026-10-18 rebuild of Guesty's documentation, with 346 Open API operations.

## Verification

`npm run check` runs strict TypeScript 7 checks, 504 offline tests and the CLI contract check. `npm run check:server` type-checks the token service with tsrs, runs 24 tests of the Worker in Miniflare against a mock of Guesty's token endpoint, and drives the built CLI through setup, invites, revocation, recovery and team deletion. No test contacts Guesty.
