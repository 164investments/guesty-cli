# Guesty CLI

Command-line access to the [Guesty](https://guesty.com) Open API with OAuth token caching, rate limiting, and a `raw` escape hatch for any endpoint.

## Quick Start

```bash
npm install -g guesty-cli && guesty init
```

This installs the CLI and walks you through entering your Guesty Open API credentials. Get them from **Guesty Dashboard > Marketplace > Open API**.

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

The CLI stores credentials in `~/.guesty-cli/.env` and caches tokens in `~/.guesty-cli/token.json`.

You can also set environment variables directly:

```bash
export GUESTY_CLIENT_ID=...
export GUESTY_CLIENT_SECRET=...
```

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
| `init` | | Set up credentials |
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

Tokens are cached to disk and auto-refresh when they expire. Guesty enforces a strict **5 tokens per 24 hours** limit — the CLI tracks this locally and will block requests rather than burn tokens.

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
