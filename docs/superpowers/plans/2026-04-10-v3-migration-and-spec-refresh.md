# Reservations V3 Migration & Spec Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make v3 reservations the default API, deprecate v1 commands with warnings, refresh `api-spec.json` from the new knowledge base, regenerate `guesty-cli-spec.json`, bump version, and publish.

**Architecture:** The reservations command currently has parallel v1 and v3 subcommands (e.g., `create` vs `v3-create`). We'll make the v3 endpoints the default names and move v1 equivalents behind a `--legacy` flag or `legacy-*` prefix with deprecation warnings. The `api-spec.json` will be rebuilt from the scraped `docs/api/` files. Version bumped to 1.1.0 as a minor (non-breaking — old commands still work via aliases).

**Tech Stack:** TypeScript, commander.js, Node.js

---

### Task 1: Build `api-spec.json` refresh script

**Files:**
- Create: `scripts/refresh-api-spec.ts`
- Modify: `package.json` (add script)

This script reads all `docs/api/{category}/*.md` files, extracts the OpenAPI JSON from each, and outputs a fresh `api-spec.json` mapping method+path+title+slug per endpoint, grouped by category.

- [ ] **Step 1: Create the refresh script**

```typescript
// scripts/refresh-api-spec.ts
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, "..", "docs", "api");
const OUTPUT = join(__dirname, "..", "api-spec.json");

interface SpecEntry {
  method: string;
  path: string;
  title: string;
  slug: string;
}

function extractFromMarkdown(content: string, slug: string): SpecEntry | null {
  const jsonMatch = content.match(/```json\s*\n(\{[\s\S]*?\})\s*\n```/);
  if (!jsonMatch) return null;

  try {
    const spec = JSON.parse(jsonMatch[1]);
    const paths = spec.paths;
    if (!paths) return null;

    const [apiPath, methods] = Object.entries(paths)[0] as [string, Record<string, any>];
    const [method, operation] = Object.entries(methods).filter(
      ([k]) => !k.startsWith("x-") && k !== "parameters"
    )[0] as [string, any];

    return {
      method: method.toUpperCase(),
      path: `/v1${apiPath}`,
      title: operation.summary ?? content.match(/^# (.+)/m)?.[1] ?? slug,
      slug,
    };
  } catch {
    return null;
  }
}

const result: Record<string, SpecEntry[]> = {};
let total = 0;

for (const category of readdirSync(DOCS_DIR)) {
  const catPath = join(DOCS_DIR, category);
  if (!statSync(catPath).isDirectory()) continue;

  const entries: SpecEntry[] = [];
  for (const file of readdirSync(catPath).filter((f) => f.endsWith(".md"))) {
    const content = readFileSync(join(catPath, file), "utf-8");
    const slug = basename(file, ".md");
    const entry = extractFromMarkdown(content, slug);
    if (entry) {
      entries.push(entry);
      total++;
    }
  }

  if (entries.length > 0) {
    entries.sort((a, b) => a.path.localeCompare(b.path));
    result[category] = entries;
  }
}

writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + "\n");
console.log(`Wrote api-spec.json: ${total} endpoints across ${Object.keys(result).length} categories`);
```

- [ ] **Step 2: Add npm script to package.json**

In `package.json`, add to `"scripts"`:
```json
"refresh:api-spec": "npx tsx scripts/refresh-api-spec.ts"
```

- [ ] **Step 3: Run it and verify output**

Run: `cd ~/projects/guesty-cli && npm run refresh:api-spec`
Expected: `Wrote api-spec.json: ~308 endpoints across ~55 categories`

Spot-check the output:
```bash
cat api-spec.json | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log('Categories:',Object.keys(j).length);console.log('Total:',Object.values(j).flat().length);console.log('Sample:',JSON.stringify(j.reservations?.[0],null,2))"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/refresh-api-spec.ts api-spec.json package.json
git commit -m "feat: add api-spec.json refresh script, update spec from scraped docs"
```

---

### Task 2: Refactor reservations — make v3 the default

**Files:**
- Modify: `src/commands/reservations.ts`

The current file has v1 commands as the "default" names (`get`, `create`, `approve`, `decline`, `custom-fields`, `set-custom-fields`, `custom-field`, `delete-custom-field`) and v3 commands with `v3-` prefix. We're going to:

1. Rename the current v1 commands to `legacy-*` with deprecation warnings
2. Rename the `v3-*` commands to the clean names
3. Keep payment commands on v1 (payments API hasn't moved to v3)
4. Keep `list` and `search` on v1 (v3 only supports get-by-ID, not search/filter)

**Commands that move to v3 as default:**

| Old name | New default (v3) | Old v1 → legacy name |
|----------|-----------------|---------------------|
| `get <id>` | v3 get by ID | `legacy-get <id>` |
| `create` | v3 create without quote | `legacy-create` |
| `approve <id>` | v3 approve | `legacy-approve <id>` |
| `decline <id>` | v3 decline | `legacy-decline <id>` |
| `custom-fields <id>` | v3 custom-fields | `legacy-custom-fields <id>` |
| `set-custom-fields <id>` | v3 set-custom-fields | `legacy-set-custom-fields <id>` |
| `custom-field <id> <fieldId>` | v3 custom-field | `legacy-custom-field <id> <fieldId>` |
| `delete-custom-field <id> <fieldId>` | v3 delete-custom-field | `legacy-delete-custom-field <id> <fieldId>` |

**Commands that stay on v1 (no v3 equivalent):**
- `list` — v3 only supports get-by-ID, v1 has search/filter
- `search` — same reason
- `update` — v3 has granular updates (dates, source, notes) not a single PUT
- `balance` — accounting API, not reservations API
- `add-payment`, `update-payment`, `refund-payment`, `cancel-payment` — payment API
- `add-invoice-item` — invoice API
- `request-cancellation-sync` — v1 only
- `export-csv`, `export-email`, `report` — export APIs

**New v3 commands promoted to clean names:**
- `v3-create-from-quote` → `create-from-quote`
- `v3-group-get` → `group-get`
- `v3-group-create` → `group-create`
- `v3-owner-reservation` → `owner-reservation`
- `v3-guest-stay` → `guest-stay`
- `v3-update-source` → `update-source`
- `v3-update-notes` → `update-notes`
- `v3-update-dates` → `update-dates`
- `v3-relocate` → `relocate`
- `v3-update-status` → `update-status`
- `v3-update-confirmation-code` → `update-confirmation-code`
- `v3-update-guests` → `update-guests`
- `v3-update-custom-fields` → `update-custom-fields`
- `v3-mid-stay` → `mid-stay`
- `v3-pre-approve` → `pre-approve`
- `v3-request-cancellation` → `request-cancellation`

- [ ] **Step 1: Add deprecation helper at top of file**

After the imports, add:

```typescript
function deprecated(name: string, replacement: string) {
  process.stderr.write(
    `\x1b[33m[deprecated]\x1b[0m "guesty res ${name}" uses the legacy v1 API. Use "guesty res ${replacement}" instead.\n`
  );
}
```

- [ ] **Step 2: Rename v1 get/create/approve/decline to legacy-* with deprecation warnings**

Replace the v1 `get`, `create`, `approve`, `decline` commands. Each one keeps the same implementation but gets renamed and adds a `deprecated()` call at the top of its action handler.

For example, the current `get <id>` command (lines 51-60) becomes:

```typescript
reservations
  .command("legacy-get <id>")
  .description("[deprecated] Get reservation via v1 API — use 'get' instead")
  .option("--fields <fields>", "Comma-separated fields to return")
  .action(async (id: string, opts) => {
    deprecated("legacy-get", "get");
    const params: Record<string, string> = {};
    if (opts.fields) params.fields = opts.fields;
    const data = await guestyFetch(`/v1/reservations/${id}`, { params });
    print(data);
  });
```

Apply same pattern to: `create` → `legacy-create`, `approve` → `legacy-approve`, `decline` → `legacy-decline`.

- [ ] **Step 3: Rename v1 custom-field commands to legacy-***

Rename: `custom-fields` → `legacy-custom-fields`, `set-custom-fields` → `legacy-set-custom-fields`, `custom-field` → `legacy-custom-field`, `delete-custom-field` → `legacy-delete-custom-field`. Add `deprecated()` call to each.

- [ ] **Step 4: Promote v3 commands to clean names**

Remove the `v3-` prefix from all v3 commands. For example:

`v3-get <ids...>` becomes `get <ids...>` with updated description:
```typescript
reservations
  .command("get <ids...>")
  .description("Retrieve reservations by ID (up to 10 IDs)")
  .option("--fields <fields>", "Comma-separated fields to return")
  .action(async (ids: string[], opts) => {
    const idParams: Record<string, string> = {};
    ids.forEach((id, i) => { idParams[`reservationIds[${i}]`] = id; });
    if (opts.fields) idParams.fields = opts.fields;
    const data = await guestyFetch("/v1/reservations-v3", { params: idParams });
    print(data);
  });
```

Apply to all `v3-*` commands: remove the `v3-` prefix, keep the action handler unchanged, update description to remove "(v3)" suffix.

Full rename list:
- `v3-create` → `create`
- `v3-create-from-quote` → `create-from-quote`
- `v3-group-get` → `group-get`
- `v3-group-create` → `group-create`
- `v3-owner-reservation` → `owner-reservation`
- `v3-guest-stay` → `guest-stay`
- `v3-update-source` → `update-source`
- `v3-update-notes` → `update-notes`
- `v3-update-dates` → `update-dates`
- `v3-relocate` → `relocate`
- `v3-update-status` → `update-status`
- `v3-update-confirmation-code` → `update-confirmation-code`
- `v3-update-guests` → `update-guests`
- `v3-update-custom-fields` → `update-custom-fields`
- `v3-custom-fields` → `custom-fields`
- `v3-custom-field` → `custom-field`
- `v3-delete-custom-field` → `delete-custom-field`
- `v3-mid-stay` → `mid-stay`
- `v3-approve` → `approve`
- `v3-decline` → `decline`
- `v3-pre-approve` → `pre-approve`
- `v3-request-cancellation` → `request-cancellation`

- [ ] **Step 5: Reorganize the file sections**

Reorder commands into logical groups with section comments:

```typescript
// ─── list / search (v1 — no v3 equivalent) ─────────────────────────────────
// list, search

// ─── get / create (v3) ──────────────────────────────────────────────────────
// get, create, create-from-quote

// ─── reservation actions (v3) ───────────────────────────────────────────────
// approve, decline, pre-approve, request-cancellation

// ─── reservation updates (v3) ───────────────────────────────────────────────
// update-dates, update-source, update-notes, update-status,
// update-confirmation-code, update-guests, relocate, guest-stay

// ─── custom fields (v3) ─────────────────────────────────────────────────────
// custom-fields, custom-field, update-custom-fields, delete-custom-field

// ─── groups & owner reservations (v3) ───────────────────────────────────────
// group-get, group-create, owner-reservation, mid-stay

// ─── payments & invoices (v1 — no v3 equivalent) ───────────────────────────
// balance, add-payment, update-payment, refund-payment, cancel-payment
// add-invoice-item

// ─── update (v1 — use granular v3 updates instead) ─────────────────────────
// update (kept for backwards compat, uses v1 PUT)

// ─── export / report ────────────────────────────────────────────────────────
// export-csv, export-email, report

// ─── airbnb-specific ────────────────────────────────────────────────────────
// request-cancellation-sync, airbnb-pre-approve

// ─── legacy v1 commands (deprecated) ────────────────────────────────────────
// legacy-get, legacy-create, legacy-approve, legacy-decline
// legacy-custom-fields, legacy-set-custom-fields, legacy-custom-field, legacy-delete-custom-field
```

- [ ] **Step 6: Build and verify**

Run:
```bash
cd ~/projects/guesty-cli && npm run build
```
Expected: no TypeScript errors.

Quick smoke test:
```bash
node dist/cli.js res --help
```
Expected: see all new command names without `v3-` prefix. Legacy commands show `[deprecated]` in descriptions.

- [ ] **Step 7: Commit**

```bash
git add src/commands/reservations.ts
git commit -m "feat: promote v3 reservations to default, deprecate v1 equivalents"
```

---

### Task 3: Add missing `report` options

**Files:**
- Modify: `src/commands/reservations.ts`

The `report <viewId>` command is missing `--timezone`, `--limit`, `--skip` options that the API supports.

- [ ] **Step 1: Update the report command**

Find the `report <viewId>` command and replace with:

```typescript
reservations
  .command("report <viewId>")
  .description("Get reservations report by view ID")
  .option("--timezone <tz>", "Timezone (e.g. America/Los_Angeles)")
  .option("--limit <n>", "Max results")
  .option("--skip <n>", "Offset")
  .action(async (viewId: string, opts) => {
    const params: Record<string, string | number> = {};
    if (opts.timezone) params.timezone = opts.timezone;
    if (opts.limit) params.limit = parseInt(opts.limit);
    if (opts.skip) params.skip = parseInt(opts.skip);
    const data = await guestyFetch(`/v1/reservations-reports/${viewId}`, { params });
    print(data);
  });
```

- [ ] **Step 2: Add missing `--from`/`--to` to `airbnb resolutions`**

In `src/commands/airbnb.ts`, update the `resolutions` command:

```typescript
airbnb
  .command("resolutions <guestyReservationId>")
  .description("List Airbnb resolutions for a reservation")
  .option("--from <date>", "From date (YYYY-MM-DD)")
  .option("--to <date>", "To date (YYYY-MM-DD)")
  .action(async (guestyReservationId: string, opts) => {
    const params: Record<string, string> = {};
    if (opts.from) params.from = opts.from;
    if (opts.to) params.to = opts.to;
    const data = await guestyFetch(
      `/v1/airbnb-resolutions-center/reservations/${guestyReservationId}/resolutions`,
      { params },
    );
    print(data);
  });
```

- [ ] **Step 3: Add missing `--from`/`--to`/`--user`/`--fields` to properties logs**

In `src/commands/properties.ts`, find the property logs command and update:

```typescript
properties
  .command("logs <id>")
  .description("Get property logs")
  .option("--from <date>", "From date (ISO 8601)")
  .option("--to <date>", "To date (ISO 8601)")
  .option("--user <userId>", "Filter by user ID")
  .option("--fields <fields>", "Comma-separated fields")
  .option("--limit <n>", "Max results")
  .option("--skip <n>", "Offset")
  .action(async (id: string, opts) => {
    const params: Record<string, string | number> = {};
    if (opts.from) params.from = opts.from;
    if (opts.to) params.to = opts.to;
    if (opts.user) params.user = opts.user;
    if (opts.fields) params.fields = opts.fields;
    if (opts.limit) params.limit = parseInt(opts.limit);
    if (opts.skip) params.skip = parseInt(opts.skip);
    const data = await guestyFetch(`/v1/property-logs/${id}`, { params });
    print(data);
  });
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/commands/reservations.ts src/commands/airbnb.ts src/commands/properties.ts
git commit -m "feat: add missing options to report, airbnb resolutions, and property logs"
```

---

### Task 4: Regenerate CLI spec and version bump

**Files:**
- Modify: `package.json` (version bump)
- Regenerate: `guesty-cli-spec.json`

- [ ] **Step 1: Bump version to 1.1.0**

In `package.json`, change:
```json
"version": "1.1.0"
```

- [ ] **Step 2: Build the CLI**

Run: `cd ~/projects/guesty-cli && npm run build`
Expected: clean build.

- [ ] **Step 3: Regenerate the CLI spec**

Run: `npm run generate:cli-spec`
Expected: `Wrote guesty-cli-spec.json` with updated operations reflecting the v3 migration.

- [ ] **Step 4: Verify the spec looks right**

```bash
node -e "const s=require('./guesty-cli-spec.json');const ops=s.operations.filter(o=>o.fullCommand.includes('res '));console.log('Reservation operations:',ops.length);const v3=ops.filter(o=>o.fullCommand.includes('v3-'));console.log('Still v3-prefixed:',v3.length);const legacy=ops.filter(o=>o.fullCommand.includes('legacy-'));console.log('Legacy:',legacy.length)"
```
Expected: `Still v3-prefixed: 0`, `Legacy: 8` (the deprecated v1 commands).

- [ ] **Step 5: Commit**

```bash
git add package.json guesty-cli-spec.json api-spec.json
git commit -m "chore: bump to 1.1.0, regenerate cli spec"
```

---

### Task 5: Build, link, and smoke test

**Files:** None (testing only)

- [ ] **Step 1: Build and link locally**

```bash
cd ~/projects/guesty-cli && npm run link
```

- [ ] **Step 2: Smoke test new reservation commands**

```bash
guesty res --help
guesty res get --help
guesty res create --help
guesty res approve --help
guesty res update-dates --help
guesty res create-from-quote --help
guesty res legacy-get --help  # should show deprecation note in description
```

- [ ] **Step 3: Test deprecation warning output**

```bash
guesty res legacy-get test-id 2>&1 | head -2
```
Expected: First line should be the yellow `[deprecated]` warning, then the API response (or error if test-id doesn't exist).

- [ ] **Step 4: Verify list/search still work (v1, no change)**

```bash
guesty res list --limit 1
guesty res search "test" --limit 1
```

---

### Task 6: Publish

**Files:** None

- [ ] **Step 1: Final build**

```bash
cd ~/projects/guesty-cli && npm run build
```

- [ ] **Step 2: Publish to npm**

```bash
npm publish
```

- [ ] **Step 3: Verify published version**

```bash
npm view guesty-cli version
```
Expected: `1.1.0`

- [ ] **Step 4: Commit any remaining changes and push**

```bash
git push origin main
```
