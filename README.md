# Guesty CLI

Command-line access to the [Guesty](https://guesty.com) Open API with read-only cached-token authentication, rate limiting, and a `raw` escape hatch for resource endpoints.

## Quick Start

```bash
npm install -g guesty-cli && guesty init
```

This installs the CLI and displays shared-cache setup instructions. The CLI does not request OAuth tokens or collect Guesty client credentials.

## Install

```bash
npm install -g guesty-cli
```

Or from this repo:

```bash
npm install
npm run build
npm link
```

## Configure

```bash
guesty init
```

Configure the shared cache through your existing secret source. The CLI reads these environment variables, or loads them from `~/.guesty-cli/.env`:

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
```

Keep secret files private and outside Git. `guesty init` prints guidance only; it does not write files, verify credentials, or refresh tokens. Existing Guesty client credentials are unused by the CLI.

## Getting a raw token

Need the token for an ad-hoc `curl` or a script? Use `guesty token` — never query the
`guesty_tokens` table by hand, or you may grab a `beapi` token and get 401s on Open API calls.

```bash
TOK=$(guesty token)                 # cached Open API token (for /v1/* endpoints)
guesty token --beapi                # cached BEAPI (booking-engine) token
guesty token --json                 # token + expiry metadata
```

Both token types must have more than five minutes remaining. Missing, expired, rejected, malformed, or incorrectly typed cache entries produce an error and no token output. Restore the cache through the designated server token-refresh workflow; the CLI cannot create a replacement.

## Examples

```bash
# List reservations
guesty res list --limit 10

# Get a specific listing
guesty ls get <listingId>

# Search guests
guesty guests list --q "John Smith"

# Update calendar data
guesty cal update <listingId> --data '{"dateFrom":"2026-04-01","dateTo":"2026-04-30","price":200}'

# Create a reservation (v3 API)
guesty res v3-create --data '{"listingId":"...","checkIn":"...","checkOut":"..."}'

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
| `init` | | Show shared-cache setup instructions |
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

# Binary upload
guesty raw POST /v1/properties-api/property-photos/property-photos/<propertyId>/upload/blob \
  --data-file ./photo.jpg \
  --content-type image/jpeg

# Custom headers
guesty raw GET /v1/listings --header 'X-Debug: 1'
```

## Input Methods

Commands that accept a request body support multiple input methods:

```bash
# Inline JSON
guesty res v3-create --data '{"listingId":"...","checkIn":"...","checkOut":"..."}'

# Pipe from stdin
cat reservation.json | guesty res v3-create

# File input (raw command only)
guesty raw POST /v1/reservations-v3 --data-file reservation.json
```

## Authentication

Authentication is read-only throughout the CLI, including `init`, normal API commands, and 401 recovery. Guesty allows only **5 OAuth tokens per 24 hours**, so token creation and refresh belong exclusively to the designated server workflow. The CLI never calls an OAuth endpoint or writes to the shared or local token cache. `raw` also rejects OAuth paths.

Open API commands use `token_type=openapi`; `guesty token --beapi` reads only `token_type=beapi`. Each Supabase query filters its type and validates the returned row's type, token string, and numeric `expires_at` timestamp in milliseconds. Custom Authorization headers cannot override that scope. A 401 clears only the process's copy and permits one retry if a different valid cached token is available.

For Open API only, an existing `~/.guesty-cli/token.json` may supply a token in the shape `{ "token": { "token_type": "openapi", "access_token": "...", "expires_at": 1800000000000 } }`. Legacy files without an explicit `token_type` are ignored because their API scope cannot be verified. The CLI then reads the shared cache. It retains tokens in memory for the current process but does not rewrite disk caches. BEAPI never uses the Open API disk cache.

## Development checks

```bash
npm ci
npm run check
```

The check compiles the strict TypeScript project and runs the offline authentication regression suite. Tests replace all network calls and private-cache reads with fake data, reject file writes, and prove that cache failures cannot request OAuth tokens. Never test authentication by requesting a real token or running a live `guesty init` credential verification.

## Rate Limiting

The CLI enforces Guesty's rate limit (100 requests/minute) client-side. If you hit the limit, it waits automatically and retries.

## Machine-Readable Contract

The repo includes [`guesty-cli-spec.json`](./guesty-cli-spec.json) as the machine-readable reference for all commands, options, and the Guesty endpoints they call. Each endpoint includes a `docsUrl` linking to the official Guesty API documentation.

Regenerate with:

```bash
npm run generate:cli-spec
```

## License

MIT
