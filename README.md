# Guesty CLI

Command-line access to the [Guesty](https://guesty.com) Open API with read-only cached-token authentication, rate limiting, and a `raw` escape hatch for resource endpoints.

## Quick Start

```bash
npm install -g https://github.com/164investments/guesty-cli/releases/download/v1.2.1/guesty-cli-1.2.1.tgz
guesty init
```

This installs the CLI and displays cache setup instructions. The CLI does not request OAuth tokens or collect Guesty client credentials. To share one token across a team, see [Share one token across a team](#share-one-token-across-a-team).

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

```bash
guesty init
```

The CLI reads a cached token from one of two places. It reads these environment variables, or loads them from `~/.guesty-cli/.env`:

- **A team token cache** in a Supabase project your team owns, set up with the steps in [Share one token across a team](#share-one-token-across-a-team):

  ```bash
  export GUESTY_TEAM_CACHE_URL=https://<project-ref>.supabase.co
  export GUESTY_TEAM_CACHE_API_KEY=...      # the project's publishable (or legacy anon) key
  export GUESTY_TEAM_CACHE_ACCESS_KEY=...   # your personal access key
  ```

- **A server-managed `guesty_tokens` table**, kept current by your own refresh service:

  ```bash
  export SUPABASE_URL=...
  export SUPABASE_SERVICE_ROLE_KEY=...
  ```

When any `GUESTY_TEAM_CACHE_` variable is set, the CLI reads only the team cache and ignores `SUPABASE_URL`. Keep secret files private and outside Git. `guesty init` prints guidance only; it does not write files, verify credentials, or refresh tokens. Existing Guesty client credentials are unused by the CLI.

## Share one token across a team

Guesty allows five OAuth tokens per client in any 24 hours. If everyone on a team requests their own, five people use the whole allowance, and one more request locks the account out for a day. A team token cache keeps one token in a Supabase project your team owns, and everyone's CLI reads that token. The team cache needs a CLI release newer than 1.2.1.

### How it works

- A scheduled job in the project requests a new token when the cached one has less than an hour left, so the team uses about one token a day. The Guesty credentials stay in Supabase Vault; members never see them.
- The job makes at most three token requests in any 24 hours, counting failures, which leaves two of Guesty's five for anything else. After a failed request it waits 30 minutes, or two hours after a 429. It records every request in `guesty_cli.token_requests`.
- Each member has a personal access key. The CLI sends it to one database function, `guesty_cli_token`, which returns the shared token and records when the key was last used. A revoked key gets no further tokens; a token the member already has works until it expires, at most 24 hours later.
- The CLI still never requests a token itself.

### Set up the cache (admin, once)

1. Create a Supabase project for the cache. A dedicated project keeps the cache apart from other data.
2. In its SQL editor, run the setup SQL. Print it with `guesty init --team-sql`, or copy [`sql/team-token-cache.sql`](./sql/team-token-cache.sql).
3. In **Integrations → Vault**, add your Guesty Open API credentials as secrets named `guesty_openapi_client_id` and `guesty_openapi_client_secret`. For booking-engine tokens (`guesty token --beapi`), also add `guesty_beapi_client_id` and `guesty_beapi_client_secret`.
4. Get the first token now instead of at the next scheduled run, which happens every 10 minutes, and check the result:

   ```sql
   select * from guesty_cli.refresh_due_tokens();
   select * from guesty_cli.status;
   ```

5. For each member, create an access key and send it to them privately, for example through your password manager. It is shown only once.

   ```sql
   select guesty_cli.create_access_key('Alex Smith');
   ```

6. Give members the project URL and its publishable key from **Project Settings → API Keys**.

Use credentials that nothing else refreshes. Every service that requests tokens with the same credentials draws from the same five.

### Connect a member's CLI

Add the three values to `~/.guesty-cli/.env`:

```bash
GUESTY_TEAM_CACHE_URL=https://<project-ref>.supabase.co
GUESTY_TEAM_CACHE_API_KEY=<publishable key>
GUESTY_TEAM_CACHE_ACCESS_KEY=<your access key>
```

Then check it with `guesty token --json`, which prints the token and its expiry. The URL must use HTTPS; plain HTTP is accepted only for `localhost` and `127.0.0.1`.

### Look after the cache

| Task | SQL |
|------|-----|
| Check each token's expiry and the last request | `select * from guesty_cli.status;` |
| List members' keys | `select label, created_at, last_used_at, revoked_at from guesty_cli.access_keys;` |
| Remove a member | `select guesty_cli.revoke_access_key('Alex Smith');` |
| Replace a token Guesty rejected (the CLI reports a 401) | `select guesty_cli.refresh_token('openapi', true);` |
| Change the limits | `update guesty_cli.settings set max_requests_per_day = 4;` (1 to 5) |

Replacing a token uses one of the day's requests. Running the setup SQL again is safe and applies updates.

## Getting a raw token

Need the token for an ad-hoc `curl` or a script? Use `guesty token` — never query the
`guesty_tokens` table by hand, or you may grab a `beapi` token and get 401s on Open API calls.

```bash
TOK=$(guesty token)                 # cached Open API token (for /v1/* endpoints)
guesty token --beapi                # cached BEAPI (booking-engine) token
guesty token --json                 # token + expiry metadata
```

Both token types must have more than five minutes remaining. Missing, expired, rejected, malformed, or incorrectly typed cache entries produce an error and no token output. The team cache's scheduled job or your server refresh workflow restores the cache; the CLI cannot create a replacement.

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
| `init` | | Show cache setup instructions; `--team-sql` prints the team-cache setup SQL |
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

Authentication is read-only throughout the CLI, including `init`, normal API commands, and 401 recovery. Guesty allows only **5 OAuth tokens per 24 hours**, so token creation and refresh belong exclusively to the team cache's scheduled job or the designated server workflow. The CLI never calls an OAuth endpoint or writes to the shared or local token cache. `raw` also rejects OAuth paths.

Open API commands use `token_type=openapi`; `guesty token --beapi` reads only `token_type=beapi`. Each cache read requests one type and validates the returned row's type, token string, and numeric `expires_at` timestamp in milliseconds. Custom Authorization headers cannot override that scope. A 401 clears only the process's copy and permits one retry if a different valid cached token is available.

For Open API only, an existing `~/.guesty-cli/token.json` may supply a token in the shape `{ "token": { "token_type": "openapi", "access_token": "...", "expires_at": 1800000000000 } }`. Legacy files without an explicit `token_type` are ignored because their API scope cannot be verified. The CLI then reads the shared cache. It retains tokens in memory for the current process but does not rewrite disk caches. BEAPI never uses the Open API disk cache.

## Development checks

```bash
npm ci
npm run check
```

The check compiles strict TypeScript, runs offline authentication, transport, command, and update regression tests, and verifies that the generated CLI contract matches the source. Authentication tests replace all network calls and private-cache reads with fake data and prove that cache failures cannot request OAuth tokens. Endpoint tests assert methods, paths, query parameters, bodies, and meaningful validation failures. Live write tests are not part of this suite.

`npm run test:team-cache` tests the team-cache SQL against a local Supabase stack (`supabase start`) and a mock OAuth server; it never contacts Guesty. Set `TEAM_CACHE_API_KEY` to the local stack's publishable or anon key. It resets the cache tables, so it refuses any database that is not on this machine.

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
