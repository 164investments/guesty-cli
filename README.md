# Guesty CLI

Command-line access to the [Guesty](https://guesty.com) Open API with read-only cached-token authentication, rate limiting, and a `raw` escape hatch for resource endpoints.

## Quick Start

```bash
npm install -g https://github.com/164investments/guesty-cli/releases/download/v1.2.1/guesty-cli-1.2.1.tgz
guesty setup
```

`guesty setup` connects the CLI to a token service, so everyone on your team shares one Guesty token. You can use Simply VRM's hosted service for free or run your own. See [Share one token across a team](#share-one-token-across-a-team). The CLI itself never requests OAuth tokens. `guesty setup` and `guesty team` need a CLI release newer than 1.2.1.

## Install

```bash
npm install -g https://github.com/164investments/guesty-cli/releases/download/v1.2.1/guesty-cli-1.2.1.tgz
```

Download the compiled package and checksum from [GitHub Releases](https://github.com/164investments/guesty-cli/releases). GitHub is the current release channel; the npm registry's `guesty-cli` package may lag behind these releases.

To upgrade an older installation (including npm version 1.1.0), run the compiled-package installation command above. For version 1.2.0 and later:

```bash
guesty update
guesty --version
```

Older CLI versions use a Git-based updater that can fail during npm 11 global dependency preparation. Installing the compiled tarball avoids that npm issue. Version 1.2.0 and later install the latest stable GitHub release package. Interactive commands display an update notice when a newer release is available. Help, version, token output, and scripted commands do not wait for an update check.

For an npm-linked source checkout or a custom installation prefix, update with its original package manager or use the separate GitHub package installation command above. The 1.2.0 updater preserves these installations and prints the applicable command.

Or build from this repo:

```bash
npm install
npm run build
npm link
```

## Configure

`guesty setup` is the easiest way to configure the CLI. It saves its settings in `~/.guesty-cli/.env`. The CLI reads a cached token from one of two places, set either in your shell or in that file:

- **A team token service**, which `guesty setup` configures:

  ```bash
  GUESTY_TOKEN_SERVICE_URL=https://guesty-tokens.simplyvrm.com   # or your own service
  GUESTY_TOKEN_SERVICE_KEY=gts_...                              # your personal access key
  ```

- **A server-managed `guesty_tokens` table**, kept current by your own refresh service:

  ```bash
  export SUPABASE_URL=...
  export SUPABASE_SERVICE_ROLE_KEY=...
  ```

When either `GUESTY_TOKEN_SERVICE_` variable is set, the CLI reads only the token service and ignores `SUPABASE_URL`. Keep secret files private and outside Git. `guesty init` prints this guidance; it does not write files, verify credentials, or refresh tokens.

## Share one token across a team

Guesty allows five OAuth tokens per client ID in any 24 hours. If everyone on a team requests their own, five people use the whole allowance, and one more request locks the account out for a day. A token service keeps one token per team, and every teammate's CLI reads it.

### Set up a team

The admin runs `guesty setup` and chooses where the team's token lives:

1. **Simply VRM's hosted token service.** It's free, and there's nothing to run.
2. **A token service you run yourself.** See [Run your own token service](#run-your-own-token-service).

Setup asks for a team name, your name, and the Guesty Open API client ID and secret; Guesty's help article "Using Guesty's Open API" shows how to create them. Booking-engine API credentials are optional. The service checks the credentials with Guesty before saving them. That check uses one of the day's five tokens, and the team then uses that token.

Then invite each teammate:

```bash
guesty team invite "Alex Smith"      # prints an invite code; send it privately
```

The teammate runs `guesty team join <code>`, or `guesty setup` and chooses **Join a team**. Their CLI then uses the team's token.

### How the service protects the allowance

- It requests a new token only when a teammate needs one and the cached token has less than an hour left, so a busy team uses about one token a day. Teammates asking at the same moment share one request.
- A team's renewals make at most three token requests per Guesty client in any 24 hours, counting failures. After a failed request the service waits 30 minutes, or two hours after a 429. A rejected client ID or secret doesn't trigger the wait, so a typo can be fixed straight away.
- Sign-up attempts, made before anyone has a key, have their own allowance: two a day for a new team, so a typo can be fixed, and one a day to recover a team. That way someone who only knows a client ID can't use up a team's renewals, and a client never makes more than Guesty's five requests in a day.
- One team per Guesty client. The request history is kept even after a team is deleted, so recreating a team can't reset the count. If an admin loses their key, running `guesty setup` again with the current client ID and secret gives them a new admin key once Guesty accepts the secret. That can't happen on the day the team was created; before then, ask another admin for an invite.
- The service encrypts Guesty credentials and tokens at rest, with a key kept outside the database. It stores access keys only as keyed hashes. Teammates never see the client secret.

### Team commands

| Command | What it does |
|---------|--------------|
| `guesty team invite <name> [--admin]` | Creates a teammate's access key and prints their invite code |
| `guesty team join <code>` | Joins a team |
| `guesty team status` | Shows token expiry, recent token requests and every key (admin) |
| `guesty team revoke <name>` | Revokes a key. A token the teammate already has works until it expires, at most 24 hours later |
| `guesty team refresh [--beapi]` | Replaces a token Guesty rejected before it expired; uses one of the day's requests (admin) |
| `guesty team credentials [--beapi]` | Adds or replaces Guesty credentials, after Guesty confirms them (admin) |
| `guesty team limit <1-5>` | Changes the team's token requests per 24 hours (admin) |
| `guesty team delete` | Deletes the team, its stored credentials and every key (admin) |

Use credentials that nothing else refreshes. Every service that requests tokens with the same client ID draws from the same five.

### Run your own token service

The service in [`server/`](./server) is a Cloudflare Worker with a D1 database, and it runs on Cloudflare's free plan. To run your own copy:

```bash
git clone https://github.com/164investments/guesty-cli.git
cd guesty-cli/server
npm ci
npx wrangler login
npx wrangler d1 create guesty-token-service   # add the database_id it prints to wrangler.jsonc
openssl rand -base64 32 | npx wrangler secret put CREDENTIALS_KEY
npm run deploy                                 # type-checks, tests, applies the migration, deploys
```

Then run `guesty setup`, choose **A token service you run yourself**, and enter the Worker's URL. Keep a copy of `CREDENTIALS_KEY` somewhere safe: without it, the stored credentials can't be decrypted, and every team must be set up again.

## Getting a raw token

Need the token for an ad-hoc `curl` or a script? Use `guesty token` — never query the
`guesty_tokens` table by hand, or you may grab a `beapi` token and get 401s on Open API calls.

```bash
TOK=$(guesty token)                 # cached Open API token (for /v1/* endpoints)
guesty token --beapi                # cached BEAPI (booking-engine) token
guesty token --json                 # token + expiry metadata
```

Both token types must have more than five minutes remaining. Missing, expired, rejected, malformed, or incorrectly typed cache entries produce an error and no token output. The token service or your server refresh workflow restores the cache; the CLI cannot create a replacement.

## Examples

```bash
# List reservations
guesty res list --limit 10

# Get a specific listing
guesty ls get <listingId>

# Search by reservation confirmation code
guesty res search CONFIRMATION_CODE

# Use the current v3 reservation search
guesty res list-v3 --listing <listingId> --status confirmed --limit 10

# Update calendar data
guesty cal update <listingId> --data '{"startDate":"2026-10-01","endDate":"2026-10-31","price":200}'

# Create a reservation (v3 API)
guesty res create --data '{"listingId":"...","checkInDateLocalized":"2026-10-01","checkOutDateLocalized":"2026-10-03","guestsCount":2,"source":"manual","status":"inquiry"}'

# Manage iCalendar imports
guesty ical list-imported
guesty ical import --data '{"url":"https://...","listingId":"..."}'

# Raw API call for any endpoint
guesty raw GET /v1/listings --params '{"limit":5}'
guesty raw POST /v1/reservations.csv --accept text/csv --output reservations.csv

# Download an owner document
guesty owners download-document <ownerId> <documentId> --output owner-doc.pdf
```

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `setup` | | Connect to a token service: hosted, your own, or join a team |
| `team` | | Invite, revoke and manage your team's shared token |
| `init` | | Show cache setup instructions |
| `token` | | Read a valid cached Open API or BEAPI token |
| `reservations` | `res` | Reservations (v1 + v3), exports, reports |
| `listings` | `ls` | Listings CRUD, exports |
| `calendar` | `cal` | Calendar and availability |
| `guests` | | Guests, payment methods |
| `conversations` | `conv` | Messaging |
| `tasks` | | Task management |
| `financials` | `fin` | Financial data |
| `reviews` | | Reviews |
| `owners` | | Owners, documents, guests |
| `accounting` | `acct` | Accounting, expenses, vendors |
| `properties` | `prop` | Property settings, groups, photos, tours |
| `quotes` | | Quotes |
| `webhooks` | | Webhooks |
| `users` | | Users and roles |
| `integrations` | `int` | Integrations and channels |
| `contacts` | | Contact management |
| `icalendar` | `ical` | Import/export iCalendars |
| `saved-replies` | `replies` | Saved reply templates |
| `marketing` | `mkt` | Translations, languages, descriptions |
| `rate-plans` | `rp` | Revenue management rate plans |
| `rate-strategies` | `rs` | Rate strategies |
| `additional-fees` | `fees` | Additional fees |
| `taxes` | | Tax configuration |
| `payment-providers` | `pp` | Payment providers |
| `channel-commission` | `cc` | Channel commissions |
| `promotions` | `promo` | Promotions |
| `price-adjustments` | `pa` | Price adjustments |
| `accounts` | | Account custom fields |
| `invoice-items` | `ii` | Invoice items |
| `address` | | Geocoding and addresses |
| `block-logs` | | Calendar block logs |
| `guest-app` | | Guest app data |
| `guest-code` | | Guest codes |
| `user-scope` | | User scope management |
| `raw` | | Raw API call to any endpoint |

Run `guesty <command> --help` for subcommands and options.

## Raw Requests

`raw` supports JSON, text, CSV, and binary request/response flows.

```bash
# JSON request
guesty raw POST /v1/contacts --data '{"firstName":"Ada","lastName":"Lovelace"}'

# CSV/text response
guesty raw POST /v1/reservations.csv --accept text/csv --output reservations.csv

# Multipart photo upload
guesty properties upload-photo <propertyId> --data-file ./photo.jpg

# Custom headers
guesty raw GET /v1/listings --header 'X-Debug: 1'
```

## Input Methods

Commands that accept a request body support multiple input methods:

```bash
# Inline JSON
guesty res create --data '{"listingId":"...","checkInDateLocalized":"2026-10-01","checkOutDateLocalized":"2026-10-03","guestsCount":2,"source":"manual","status":"inquiry"}'

# Pipe from stdin
cat reservation.json | guesty res create

# File input (raw command only)
guesty raw POST /v1/reservations-v3 --data-file reservation.json --content-type application/json
```

## Authentication

Authentication is read-only throughout the CLI, including `init`, normal API commands, and 401 recovery. Guesty allows only **5 OAuth tokens per 24 hours**, so token creation and refresh belong exclusively to the token service or the designated server workflow. The CLI never calls an OAuth endpoint or writes to the shared or local token cache. `raw` also rejects OAuth paths.

Open API commands use `token_type=openapi`; `guesty token --beapi` reads only `token_type=beapi`. Each cache read requests one type and validates the returned row's type, token string, and numeric `expires_at` timestamp in milliseconds. Custom Authorization headers cannot override that scope. A 401 clears only the process's copy and permits one retry if a different valid cached token is available.

For Open API only, an existing `~/.guesty-cli/token.json` may supply a token in the shape `{ "token": { "token_type": "openapi", "access_token": "...", "expires_at": 1800000000000 } }`. Legacy files without an explicit `token_type` are ignored because their API scope cannot be verified. The CLI then reads the shared cache. It retains tokens in memory for the current process but does not rewrite disk caches. BEAPI never uses the Open API disk cache.

## Development checks

```bash
npm ci
npm run check
```

The check compiles strict TypeScript, runs offline authentication, transport, command, and update regression tests, and verifies that the generated CLI contract matches the source. Authentication tests replace all network calls and private-cache reads with fake data and prove that cache failures cannot request OAuth tokens. Endpoint tests assert methods, paths, query parameters, bodies, and meaningful validation failures. Live write tests are not part of this suite.

For the token service, run `npm ci --prefix server` once, then `npm run check:server`. It type-checks the Worker with tsrs and runs the bundled Worker in Miniflare with a local D1 database and a mock of Guesty's token endpoint, so it never contacts Guesty. It also drives the built CLI through setup, invites, revocation and team deletion against that Worker.

## Rate Limiting

The CLI observes Guesty's documented Open API limits of 15 requests/second, 120/minute, and 5,000/hour within each process. Guesty applies account-wide limits across tokens and processes, so the CLI also honors `Retry-After` on 429 responses. See [Guesty's current rate limits](https://open-api-docs.guesty.com/docs/rate-limits).

Requests time out after 60 seconds by default; `raw --timeout <seconds>` can adjust that limit. Transient network/server failures are retried for reads. A mutation with an uncertain network/server outcome is not automatically repeated. Explicit 401 recovery only retries with a different valid cached token.

## Machine-Readable Contract

The repo includes [`guesty-cli-spec.json`](./guesty-cli-spec.json) as the machine-readable reference for all commands, options, and the Guesty endpoints they call. Each endpoint includes a `docsUrl` linking to the official Guesty API documentation.

[`api-spec.json`](./api-spec.json) catalogs all 346 documented Open API operations (Guesty documentation of 2026-10-18); [`openapi-spec.json`](./openapi-spec.json) preserves the current full request/response schemas and deprecation flags. Booking Engine documentation is reviewed separately; normal CLI commands continue to use Open API credentials and endpoints.

Regenerate with:

```bash
npm run generate:cli-spec
```

Refresh from Guesty's current published schema before regenerating:

```bash
npm run refresh:api-spec
npm run generate:cli-spec
npm run check
```

Guesty's documentation site publishes no complete OpenAPI download; each reference page carries only its own operation. The refresh reads the reference navigation from `https://open-api-docs.guesty.com/reference`, then each reference page's Markdown copy (`/reference/<slug>.md`), one request every two seconds, and merges them into one document. It takes about 12 minutes. A 429 response waits for `Retry-After` and slows the rest of the run; other server and network errors back off and retry.

The refresh writes nothing and exits non-zero if any page cannot be read, if pages disagree, if the result does not cover every reference page, if the operation count falls below 90% of the previous `openapi-spec.json`, or if it runs past 25 minutes. Options: `--interval-ms <ms>`, `--max-minutes <minutes>`, and `--allow-shrink` after you have confirmed that Guesty removed the missing operations.

`node scripts/scrape-api-docs.mjs` downloads pages from the current documentation index into the ignored `docs/api/open` cache. Add `--booking` for Booking Engine documentation or `--guides` for guides only. The historical `.ts` script names remain compatibility entry points. `node scripts/build-knowledge-base.mjs --output <directory>` generates a condensed reference from the current schema.

See the [September 2026 audit and verification record](./docs/api-audit-2026-09-07.md) and [release notes](./RELEASE_NOTES.md) for fixes, migrations, endpoint coverage, and testing limits.

## License

MIT
