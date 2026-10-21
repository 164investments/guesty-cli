# Guesty CLI 1.4.0

Version 1.4.0 gives every operation in Guesty's current API documentation a named command: all 362 Open API operations and all 19 Booking Engine API operations. Nothing documented is left to `guesty raw`. Version 1.3.0's shared team token works the same way.

## Install or update

```bash
npm install -g https://github.com/164investments/guesty-cli/releases/download/v1.4.0/guesty-cli-1.4.0.tgz
guesty setup
```

Users on 1.2.0 or later can run `guesty update` instead. The release includes `SHA256SUMS` for the compiled tarball.

## New commands

- **`payments`:** Guesty's new Payments API, with 16 operations. It covers payments, holds, captures, refunds, chargebacks, recorded offline payments and saved payment methods. Guesty's changelog says it replaces the old per-reservation payment endpoints and the guest payment-method endpoints.
- **`booking-engine` (alias `be`):** every Booking Engine API operation, using the cached booking-engine token (`guesty token --beapi`), `https://booking.guesty.com` and its own rate limits (5 a second, 275 a minute, 16,500 an hour).
- **`basic-fees`, the channel commission `-v2` commands, owner payout methods, vendor create and update, and the rest of the operations that were reachable only through `raw`.**

## Deprecated commands

26 more commands are marked deprecated, because Guesty deprecated their endpoints or its changelog names a replacement. They still work. Each prints a notice on stderr naming its replacement and leaves stdout unchanged, so scripts keep working. [`docs/endpoint-coverage-2026-10-21.md`](docs/endpoint-coverage-2026-10-21.md) lists each one and its replacement, along with the places where Guesty's documentation contradicts itself and how the CLI handles them.

## Unchanged

The CLI still never requests OAuth tokens. The team token service from 1.3.0 (`guesty setup`, `guesty team`), the `SUPABASE_URL` cache, and the `token`, `raw` and 401 behavior are unchanged.

## Verification

`npm run check` runs strict TypeScript 7 checks, 657 offline tests and the contract check. The contract confirms that every documented Open API and Booking Engine operation has a command. `npm run check:server` type-checks and tests the token service and drives this CLI through team setup against it. No test contacts Guesty, and the new write commands are tested offline only.
