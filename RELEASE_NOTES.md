# Guesty CLI 1.2.0

This release repairs commands that sent ignored filters, incomplete requests, or the wrong payload format, and updates the bundled reference to Guesty's 333 currently documented Open API operations.

## Install or update

```bash
npm install -g https://github.com/164investments/guesty-cli/releases/download/v1.2.0/guesty-cli-1.2.0.tgz
guesty --version
```

Existing users can run `guesty update`. Older versions install from GitHub; Git installs now build automatically. Starting with 1.2.0, updates use the latest stable GitHub release package. A source checkout or custom package prefix is preserved; the updater gives a separate installation command instead of changing that workspace.

GitHub Releases is the current distribution channel. The npm registry release remains 1.1.0; `npm update -g guesty-cli` alone does not obtain this release. The release includes `SHA256SUMS` for the compiled tarball.

## New commands

- Reservation v3 search (`res list-v3`, alias `search-v3`), comments, booking-date and travel-information updates, and reservation activity logs.
- Accounting disbursements, owner statements, selected guest-folio totals and invoice items, and adjustable reservation line items.
- Options for financial response components, optimized-calendar detail/allotment, accounting filters, and current report pagination.

## Corrected behavior and migration notes

- `res search CODE` now searches an exact confirmation code. Use `--guest-name` for an exact guest full name. The old `q` parameter was ignored by Guesty and could return unrelated reservations.
- `res list` retains its legacy response format with corrected JSON filters. Use `list-v3` for the new API's response shape. Guesty has announced retirement of legacy reservation resources; payment replacements remain pending in its documentation.
- `res get` accepts at most ten IDs. Its old `--fields` option is rejected because Guesty ignored it and returned full records; use `legacy-get --fields` or explicitly project the v3 result in your consumer.
- Calendar updates use `startDate` and `endDate`, with inclusive end dates. Blocking supplies the documented reason. `cal minified` and `cal list` require dates; `cal list` requires listing IDs.
- Guest reports use documented columns and `--filters`; unsupported `guests list --q` fails clearly. Tasks also use explicit report filters. `res report` requires an IANA timezone.
- Messaging requires `--module`; review replies send `reviewReply`. Photo uploads and owner documents use multipart form data. Owner document creation requires a PDF file and name.
- `fin owner-statement` now returns real owner statements instead of listing financial settings. Statement filtering uses explicit period options. Guesty Pay reports use their documented date/confirmation filters and `take` pagination.
- Required language, channel, property IDs, webhook URL, and iCalendar deletion-strategy parameters are exposed or enforced where the API requires them.
- JSON input errors omit private input snippets. Raw JSON primitives, content types, existing query strings, binary/text output, and empty responses are handled correctly.

## Reliability and authentication

Authentication is cache-only across normal commands, `token`, `init`, raw requests, and 401 recovery. The CLI never requests OAuth tokens or writes token caches. Both cached token types are validated independently.

The client observes the documented Open API limits of 15 requests/second, 120/minute, and 5,000/hour. It honors `Retry-After`, times out requests, retries transient read failures, and avoids repeating mutations with uncertain outcomes. Pagination respects the requested starting offset, page size, server caps, and v3 completion metadata; incomplete or repeated pages fail instead of silently returning a misleading partial result.

## Verification and API limitations

Every changed or added endpoint has offline request-contract coverage. Live verification uses reads only; messaging, reservation changes, calendar writes, payments, uploads, and other business mutations are never exercised against production as tests.

Guesty's reservation-log service returned 503 (`name resolution failed`) during live verification, and the expense API returned 403 for the available account. Their request contracts are covered offline; successful live responses for these capabilities could not be established. The journal endpoints still require `transactionDate` in live requests despite a changelog announcing it as optional, so this release retains the required date filter.

See the [audit record](docs/api-audit-2026-09-07.md) and [endpoint test matrix](docs/endpoint-tests-2026-09-07.md) for detailed evidence and remaining API candidates. The Booking Engine API was reviewed separately and remains outside normal CLI request scope.
