# Endpoint coverage, 2026-10-21

Every operation in Guesty's current reference documentation now has a named CLI command. That covers all 362 Open API operations and all 19 Booking Engine API operations. No documented operation is left to `raw`. This record covers the changes since the 2026-10-18 refresh (SIM-151), the counts, the conflicts in Guesty's documentation, and how the CLI handles each one. The work is tracked as SIM-179.

## Sources

- The Open API catalog was rebuilt with `npm run refresh:api-spec` on 2026-10-21. It read all 362 reference pages from `https://open-api-docs.guesty.com/reference`, with no retries and no rate limiting. Guesty's documentation reports an update time of 2026-10-21 16:01 UTC.
- The Booking Engine catalog was built the same way with the new `npm run refresh:booking-engine-spec`. It read all 19 reference pages from `https://booking-api-docs.guesty.com/reference`. Guesty's API definition there was last updated on 2026-06-01.
- The Booking Engine guides and recipes were read in full (`node scripts/scrape-api-docs.mjs --booking`, 44 pages). Its changelog has no entry after 2026-05-18, which added the upsell guide. The Open API changelog entry for [2026-10-21](https://open-api-docs.guesty.com/changelog/2026-10-21) confirms the differences found below.
- No request went to Guesty's API or OAuth endpoints, and no token was read. Every test fakes the network and the token cache.

## Counts

| | 2026-10-18 | 2026-10-21 |
| --- | --- | --- |
| Open API operations in Guesty's reference | 346 in 62 groups | 362 in 65 groups |
| Open API operations with a named command | 322 | 362 |
| Booking Engine operations in Guesty's reference | not cataloged | 19 in 6 groups |
| Booking Engine operations with a named command | 0 | 19 |
| CLI commands (actions) in the contract | 337 in 39 groups | 396 in 42 groups |
| Commands marked deprecated | 8 | 34 |

The contract checks coverage itself: `referenceCoverage` for the Open API and `bookingEngineReferenceCoverage` for the Booking Engine API. Both `missingImplementedEndpoints` lists are empty.

## What changed in the Open API documentation since 2026-10-18

Guesty added 16 operations and removed none. No operation gained or lost its deprecation flag, and no operation's parameters changed.

The 16 new operations form a new Payments API in three new groups:

- Reservation payments (9): list, get, create, update, charge (`/pay`), cancel, capture an authorization hold, refund, and record a chargeback.
- Recorded payments (4): record an offline payment, update it, record an offline refund, and update that refund.
- Payment methods (3): list for a guest or a reservation, get, and vault a tokenized card.

Guesty says these replace the per-reservation payment endpoints under `/reservations/{id}/payments` and the guest payment-method endpoints under `/guests/{id}/payment-methods`.

Ten existing operations changed only in their wording. None of these changes affects a CLI command:

- Basic fees (5 pages): listings with no basic fees are left out of results, and the descriptions use clearer terms.
- Channel commissions v2 (3 pages): a parent unit type ID reads and updates the same listing-level commissions.
- Manual price adjustment: `parentInvoiceItemId` is now described as optional. `guesty price-adjustments create` never required it, so it needs no change.
- Total amount adjustments: the response now lists that ID as always present.

## New commands

The 24 operations that were reachable only through `raw` on 2026-10-18 now have commands:

- `basic-fees` (`bf`), a new group: `list`, `get`, `channel`, `set`, `delete`.
- `channel-commission`: the v2 API as `account-v2`, `account-update-v2`, `create-v2`, `update-v2`, `delete-v2`, `listing-v2`, `listing-update-v2`, `listing-effective-v2`, `listing-level-v2`, `listing-level-update-v2`, and `reservation-update-v2`.
- `owners`: `payout-method`, `create-payout-method`, `update-payout-method`, `bulk-create-payout-methods`.
- `accounting`: `update-business-model`, `create-vendor`, `update-vendor`. These need Guesty's accounting add-on, as Guesty's group names say.
- `financials`: `folio-settings-snapshot`.

The 16 new Payments API operations are in a new `payments` (`pay`) group: `list`, `get`, `create`, `update`, `charge`, `cancel`, `capture`, `refund`, `chargeback`, `record`, `update-recorded`, `record-refund`, `update-recorded-refund`, `methods`, `method`, and `create-method`.

Each command checks the documented required fields, ranges and enums before it reads a token. For example, payment amounts must be at least 1, notes at most 500 characters, and a security deposit needs a release time.

## Deprecated commands

Guesty flags 31 Open API operations as deprecated. Before this change, only the eight `reservations legacy-*` commands said so. The 24 other commands that call a flagged endpoint are now marked. So are the two guest payment-method commands, which Guesty's changelog says the Payments API replaces (see conflict 4). Each one still works. Its help text starts with `[deprecated]`, and it prints a notice on stderr that names the replacement. Stdout is unchanged, so scripts keep working.

| Commands | Replacement |
| --- | --- |
| `reservations add-payment`, `update-payment`, `refund-payment`, `cancel-payment` | `payments create`, `record`, `update`, `refund`, `record-refund`, `cancel` |
| `guests payment-methods`, `guests add-payment-method` | `payments methods`, `payments create-method` |
| `channel-commission account`, `account-update`, `listings`, `listings-update` | the `-v2` commands |
| `listings custom-fields`, `set-custom-fields`, `custom-field`, `delete-custom-field` | the matching `properties` custom-field commands |
| `reservations list`, `search` | `reservations list-v3` |
| `reservations update` | `update-dates`, `update-guests`, `update-status`, `relocate`, `update-notes` |
| `reservations add-invoice-item` | `invoice-items create` |
| `reservations request-cancellation-sync` | `reservations request-cancellation` |
| `owners reservation` | `reservations get` |
| `owners reservations`, `owners update-reservation`, `reservations export-csv`, `export-email`, `integrations create`, `integrations update` | none documented |

## Booking Engine API

The new `booking-engine` (`be`) group has one command for each of the 19 operations:

- Listings: `listings` (search, and availability with `--check-in` and `--check-out`), `listing`, `cities`, `calendar`, `payment-provider`.
- Quotes and reservations: `create-quote`, `quote`, `set-quote-coupons`, `create-instant-reservation`, `create-inquiry-reservation`, `create-instant-charge-reservation`, `reservation`, `verify-payment`.
- Other: `payouts-schedule`, `reviews`, `upsell-fees`, `set-quote-upsells`, `metasearch-config`, `set-metasearch-config`.

These facts come from the Booking Engine documentation:

- Server: `https://booking.guesty.com`, with every path under `/api/`. See the first conflict below.
- Authentication: `Authorization: Bearer <token>`, with a `booking_engine:api` token. The CLI reads only the cached `beapi` token through `getCachedToken("beapi")`. It never reads the Open API disk cache, and it never requests a token.
- Rate limits: 5 requests per second, 275 per minute, and 16,500 per hour. Every page that states limits gives these numbers. The CLI keeps a separate count from the Open API's limits, and it honors `Retry-After` on a 429.
- A 401 marks the rejected token for this process and re-reads the cache once, as Open API requests do. It never writes a cache.

The request path is a new `bookingEngineFetch` function in `src/client.ts`. The Open API path is unchanged. The only shared edit is that the rate limiter now takes its request history and limits as arguments. The Open API passes its own values by default.

Guesty removed the old booking flow resources from the documentation on 15 January 2026 and turned them off on 31 March 2026. Those were `/api/reservations`, `/api/reservations/money`, `/api/reservations/{id}` and `/api/listings/availability`. They are not in the reference, so they have no commands.

## Conflicts in Guesty's documentation

1. **Booking Engine host.** All 19 reference definitions, the upsell guide and the OAuth examples use `https://booking.guesty.com`. The quick start guide gives the base URL as `https://booking-api.guesty.com/api` and shows a search at `https://booking-api.guesty.com/v1/search`. The traffic-management recipe also uses `booking-api.guesty.com`. The CLI uses `https://booking.guesty.com`, for three reasons. The reference definitions are the machine-readable contract and they agree with each other. Our existing Booking Engine integration, outside this repository, uses the same host. And `booking-api.guesty.com` had no DNS record on 2026-10-21. The `/v1/search` operation has no reference page; its link, `reference/getsearch`, returns 404.
2. **Booking Engine token renewals.** The quick start says a token can be renewed 5 times in 24 hours, and then says 3 times. The authentication guide says 3. This does not affect the CLI, which never requests a token.
3. **Instant-charge reservations.** The schema marks `confirmationToken` as required. The descriptions of both `confirmationToken` and `initialPaymentMethodId` say exactly one of the two is required: Stripe uses the first, GuestyPay the second. The CLI follows the descriptions. It requires exactly one, so GuestyPay bookings are not blocked.
4. **Guest payment methods.** The 2026-10-21 changelog and the new payment-method pages say the new endpoints replace `/guests/{id}/payment-methods`. The reference pages for those older operations carry no deprecation flag. The CLI follows the changelog. It marks `guests payment-methods` and `guests add-payment-method` as deprecated and keeps them working.
5. **Owner payout methods.** The owner payout-method schema lists `IBAN` and `code` as required for every payout type, including US bank accounts. The vendor payout-method schema does not require them. The CLI checks only the five fields both schemas require: `type`, `accountHolderName`, `bankName`, `accountNumber`, and `accountType`. Guesty validates the rest.
6. **"Soon to be deprecated."** Many flagged operations say they "will be" or are "soon to be" deprecated. The CLI follows the flag and marks those commands as deprecated.

## Operations without a command

None. `raw` is still available for Open API paths and payload shapes that the named commands do not cover. It does not reach the Booking Engine API.

## Verification

- `npm ci && npm run check` passes. It runs the TypeScript 7 type check, the offline test suite, and the contract check.
- The new endpoint tests check the method, path, query parameters and body of every new command, and the validation failures that must stop a request before any token read. Deprecation tests check, for six of the marked commands, that the command still calls its endpoint and names its replacement on stderr.
- The Booking Engine transport tests check the host, the `beapi` cache query, and the bearer header. They also check that the Open API disk cache is never read, that OAuth and other paths outside `/api/` are rejected, and the 401, 429, retry, redirect and redaction behavior. They check the five-per-second limit and that it is counted apart from the Open API.
- The refresh test checks that the Booking Engine refresh reads only its own site and refuses a page that names the Open API server. It writes only the two Booking Engine files.

## Follow-up after SIM-178 merges

- Regenerate `guesty-cli-spec.json` with `npm run generate:cli-spec`. Both branches change it.
- Combine the two `./auth.js` imports at the top of `src/client.ts`. They are separate so that the branches merge without a conflict.
- Add the token-service key that SIM-178 redacts from Open API error bodies (`GUESTY_TOKEN_SERVICE_KEY` on 2026-10-21) to the Booking Engine redaction list in `bookingEngineFetch`.
- Use SIM-178's `cacheGuidance("beapi")` in the Booking Engine 401 message, as its Open API 401 message does.
