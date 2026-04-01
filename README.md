# Guesty CLI

Command-line access to the Guesty Open API with OAuth token caching, rate limiting, and a `raw` escape hatch for endpoints that are not wrapped by a named command.

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

Run:

```bash
guesty init
```

The CLI stores credentials in `~/.guesty-cli/.env` and caches tokens in `~/.guesty-cli/token.json`.

You can also set:

```bash
export GUESTY_CLIENT_ID=...
export GUESTY_CLIENT_SECRET=...
```

Optional shared-token support:

```bash
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
```

## Examples

```bash
guesty reservations list --limit 5
guesty listings get <listingId>
guesty reviews reply <reviewId> --body "Thank you for the feedback."
guesty tasks delete <taskId>
guesty owners reservation <ownerReservationId>
```

## Raw Requests

`raw` supports JSON, text, CSV, and binary request/response flows.

JSON request:

```bash
guesty raw POST /v1/contacts --data '{"firstName":"Ada","lastName":"Lovelace"}'
```

CSV or text response:

```bash
guesty raw POST /v1/reservations.csv --accept text/csv --output reservations.csv
```

Binary upload:

```bash
guesty raw POST /v1/properties-api/property-photos/property-photos/<propertyId>/upload/blob \
  --data-file ./photo.jpg \
  --content-type image/jpeg
```

Custom headers:

```bash
guesty raw GET /v1/listings --header 'X-Debug: 1'
```

## Notes

- Named commands cover common Guesty workflows, not every documented endpoint.
- `guesty raw` is intended to cover the remaining API surface, including endpoints that return non-JSON data.
- The CLI targets Node.js 18+.
