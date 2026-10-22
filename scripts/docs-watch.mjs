#!/usr/bin/env node

// Compare Guesty's two documentation sites with this repository's spec files.
// The nightly MCP review in 164investments/simply-ops runs it every night.
// Two requests per site read the reference index (when Guesty last published
// its API definition, and the list of reference pages) and the changelog.
// When a site's reference changed, or with --force, it re-reads every
// reference page (refreshApiSpec), regenerates guesty-cli-spec.json and
// summarizes what Guesty changed. It contacts only the documentation sites.
//
// Usage: node scripts/docs-watch.mjs [--force] [--summary <file>]
// Prints CHANGED or UNCHANGED, then the summary. Exits 1 when a site failed.
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import {
  listOperations, listReferencePages, readDocumentationIndex, readPageData, requestMatchesEndpoint, resolvePointer,
} from "./api-reference.mjs";
import {
  BOOKING_ENGINE_DOCS, createDocsClient, OPEN_API_DOCS, refreshApiSpec, sourceUpdatedAt, writeArtifacts,
} from "./reference-refresh.mjs";

export const SITES = [OPEN_API_DOCS, BOOKING_ENGINE_DOCS];
const LIST_LIMIT = 25;

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function plainText(markdown, limit = 400) {
  const text = markdown
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&([a-z]+);/gi, (entity, name) => ENTITIES[name.toLowerCase()] ?? entity)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[*`]+/g, "")
    .replace(/[#>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > limit ? `${text.slice(0, limit).replace(/\s+\S*$/, "")}…` : text;
}

// The changelog page embeds its newest entries, with their text.
export function readChangelog(html, baseUrl) {
  const entries = readPageData(html).changelogs?.data;
  if (!Array.isArray(entries)) throw new Error(`${baseUrl}/changelog has no list of entries.`);
  return entries
    .map((entry) => ({
      slug: entry.slug, title: entry.title, createdAt: entry.created_at,
      url: `${baseUrl}/changelog/${entry.slug}`, text: plainText(entry.content?.body ?? ""),
    }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

// Entries newer than the one recorded at the last refresh. Before anything is
// recorded, entries written after the reference the spec was built from.
export function newChangelogEntries(entries, recorded, since) {
  const index = recorded ? entries.findIndex((entry) => entry.slug === recorded.latest) : -1;
  if (index !== -1) return entries.slice(0, index);
  const after = Date.parse(recorded?.createdAt ?? since ?? "");
  return Number.isNaN(after) ? [] : entries.filter((entry) => Date.parse(entry.createdAt) > after);
}

const DESCRIPTIVE = new Set(["description", "summary", "title", "example", "examples", "externalDocs", "tags", "operationId"]);

// Drop documentation-only keys, but never a property that happens to be named
// "description" or "title".
function shape(value, names = false) {
  if (Array.isArray(value)) return value.map((item) => shape(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => names || !(DESCRIPTIVE.has(key) || key.startsWith("x-")))
    .map(([key, item]) => [key, shape(item, !names && (key === "properties" || key === "patternProperties"))]));
}

// Guesty fills some date-time defaults with the time it built the page, so
// they change with every publication.
function withoutBuildTimes(value) {
  if (Array.isArray(value)) return value.map(withoutBuildTimes);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !(key === "default" && value.format === "date-time"))
    .map(([key, item]) => [key, withoutBuildTimes(item)]));
}

// A value and every component it reaches, so a change inside a shared schema
// counts for each operation that uses it.
function footprint(schema, value) {
  const components = new Map();
  (function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== "object") return;
    if (typeof node.$ref === "string" && !components.has(node.$ref)) {
      const target = resolvePointer(schema, node.$ref) ?? null;
      components.set(node.$ref, target);
      visit(target);
    }
    Object.values(node).forEach(visit);
  })(value);
  return withoutBuildTimes({ value, components: Object.fromEntries([...components].sort(([a], [b]) => a.localeCompare(b))) });
}

const request = (schema, { pathItem, operation }) => footprint(schema, {
  parameters: [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])], requestBody: operation.requestBody ?? null,
});
const response = (schema, { operation }) => footprint(schema, operation.responses ?? {});
const whole = (schema, { pathItem, operation: { deprecated, ...operation } }) => footprint(schema, { pathParameters: pathItem.parameters ?? [], operation });

// What changed between two spec files, by operation.
export function describeChanges(previous, current, api) {
  const operations = (schema) => new Map(schema ? listOperations(schema, api).map((item) => [`${item.method} ${item.path}`, item]) : []);
  const before = operations(previous);
  const after = operations(current);
  const entry = ({ method, path, operation }) => ({ method, path, title: operation.summary ?? "" });
  const changes = { previous: before.size, current: after.size, added: [], removed: [], deprecated: [], undeprecated: [], request: [], response: [], wording: [] };
  for (const [key, item] of after) if (!before.has(key)) changes.added.push(entry(item));
  for (const [key, item] of before) if (!after.has(key)) changes.removed.push(entry(item));
  for (const [key, now] of after) {
    const was = before.get(key);
    if (!was) continue;
    const deprecated = now.operation.deprecated === true;
    if (deprecated !== (was.operation.deprecated === true)) changes[deprecated ? "deprecated" : "undeprecated"].push(entry(now));
    const requestChanged = !isDeepStrictEqual(shape(request(previous, was)), shape(request(current, now)));
    const responseChanged = !isDeepStrictEqual(shape(response(previous, was)), shape(response(current, now)));
    if (requestChanged) changes.request.push(entry(now));
    if (responseChanged) changes.response.push(entry(now));
    if (!requestChanged && !responseChanged && !isDeepStrictEqual(whole(previous, was), whole(current, now))) changes.wording.push(entry(now));
  }
  for (const list of Object.values(changes)) if (Array.isArray(list)) list.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  return changes;
}

async function watchSite({ root, docs, force, fetch, sleep, now, log, refreshOptions }) {
  const previous = await readJson(join(root, docs.schemaFile));
  const catalog = await readJson(join(root, docs.catalogFile));
  const ours = previous["x-cli-source"] ?? {};
  const client = createDocsClient({ fetch, sleep, now, log });
  const index = readDocumentationIndex((await client.get(`${docs.baseUrl}/reference`, "text/html")).text);
  const changelog = readChangelog((await client.get(`${docs.baseUrl}/changelog`, "text/html")).text, docs.baseUrl);
  const livePages = listReferencePages(index.sidebar).map((page) => page.slug);
  const ourPages = new Set(Object.values(catalog).flat().map((item) => item.slug));
  const result = {
    docs, updatedAt: sourceUpdatedAt(index), previousUpdatedAt: ours.updatedAt ?? null, pages: livePages.length,
    pagesAdded: livePages.filter((slug) => !ourPages.has(slug)),
    pagesRemoved: [...ourPages].filter((slug) => !livePages.includes(slug)),
    changelog: newChangelogEntries(changelog, ours.changelog, ours.updatedAt),
    refreshed: false,
  };
  const latest = changelog[0] ? { latest: changelog[0].slug, createdAt: changelog[0].createdAt } : ours.changelog;
  if (force || result.updatedAt !== result.previousUpdatedAt || result.pagesAdded.length || result.pagesRemoved.length) {
    await refreshApiSpec({ root, docs, fetch, sleep, now, log, source: latest ? { changelog: latest } : {}, ...refreshOptions });
    result.refreshed = true;
    result.changes = describeChanges(previous, await readJson(join(root, docs.schemaFile)), docs.api);
  } else if (latest && !isDeepStrictEqual(ours.changelog, latest)) {
    await writeArtifacts(root, [[docs.schemaFile, { ...previous, "x-cli-source": { ...ours, changelog: latest } }]]);
  }
  return result;
}

// One failed site never stops the other, and leaves its own files untouched.
export async function watchDocs({ root, sites = SITES, force = false, fetch, sleep, now, log = () => {}, refreshOptions = {} }) {
  const results = [];
  for (const docs of sites) {
    try {
      results.push(await watchSite({ root, docs, force, fetch, sleep, now, log, refreshOptions }));
    } catch (error) {
      results.push({ docs, error: error.message });
    }
  }
  return results;
}

const pacific = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
});
const when = (iso) => (iso && !Number.isNaN(Date.parse(iso)) ? pacific.format(new Date(iso)) : "an unknown date");
const host = (docs) => new URL(docs.baseUrl).host;
const apiName = (docs) => (docs === BOOKING_ENGINE_DOCS ? "booking-engine" : "open-api");

function list(label, items, format) {
  if (!items.length) return [];
  const shown = items.slice(0, LIST_LIMIT).map((item) => `  - ${format(item)}`);
  if (items.length > LIST_LIMIT) shown.push(`  - and ${items.length - LIST_LIMIT} more`);
  return [`- **${label} (${items.length}):**`, ...shown];
}

const operationLine = (item) => `\`${item.method} ${item.path}\`${item.title ? ` ${item.title}` : ""}`;

// Commands whose requests match one of the operations.
function commandsCalling(cliSpec, docs, operations) {
  const found = [];
  for (const operation of operations) {
    for (const command of cliSpec?.operations ?? []) {
      if (command.requests.some((item) => item.api === apiName(docs) && requestMatchesEndpoint(item, operation))) {
        found.push({ command: command.fullCommand, operation });
      }
    }
  }
  return found;
}

function siteSection(result, cliSpec) {
  const { docs } = result;
  const lines = [`## ${docs.api.label} (${host(docs)})`, ""];
  if (result.error) return [...lines, `The check failed, so its spec files were not changed: ${result.error}`, ""];
  if (!result.refreshed) {
    lines.push(`Unchanged: Guesty last published this reference on ${when(result.updatedAt)} (${result.pages} pages).`);
  } else {
    const { changes } = result;
    const published = result.updatedAt === result.previousUpdatedAt
      ? `Guesty last published this reference on ${when(result.updatedAt)}, unchanged since the last refresh; every page was read again.`
      : `Guesty published this reference on ${when(result.updatedAt)}; the CLI's copy was from ${when(result.previousUpdatedAt)}.`;
    lines.push(`${published} It now has ${changes.current} operations (${changes.previous} before).`, "");
    const details = [
      ...list("Added", changes.added, operationLine),
      ...list("Removed", changes.removed, operationLine),
      ...list("Newly deprecated", changes.deprecated, operationLine),
      ...list("No longer deprecated", changes.undeprecated, operationLine),
      ...list("Parameters or request body changed", changes.request, operationLine),
      ...list("Response changed", changes.response, operationLine),
      ...list("Only descriptions or examples changed", changes.wording, operationLine),
    ];
    lines.push(...(details.length ? details : ["No operation changed."]));
  }
  if (result.changelog.length) {
    lines.push("", "Guesty's changelog since the last check:");
    for (const entry of result.changelog) lines.push(`- [${entry.title}](${entry.url}) (${when(entry.createdAt)}): ${entry.text}`);
  }
  const coverage = docs === BOOKING_ENGINE_DOCS ? cliSpec?.bookingEngineReferenceCoverage : cliSpec?.referenceCoverage;
  const followUps = [
    ...list("Operations without a CLI command", coverage?.missingImplementedEndpoints ?? [], operationLine),
    ...list("Commands that call a removed operation", commandsCalling(cliSpec, docs, result.changes?.removed ?? []), (item) => `\`${item.command}\` calls \`${item.operation.method} ${item.operation.path}\``),
    ...list("Commands that call a newly deprecated operation", commandsCalling(cliSpec, docs, result.changes?.deprecated ?? []), (item) => `\`${item.command}\` calls \`${item.operation.method} ${item.operation.path}\``),
  ];
  if (followUps.length) lines.push("", "CLI follow-up:", ...followUps);
  return [...lines, ""];
}

export function formatSummary(results, { changed, cliSpec, date = new Date() }) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", dateStyle: "medium" }).format(date);
  const failed = results.filter((result) => result.error).map((result) => result.docs.api.label);
  const lead = changed
    ? "The spec files were updated from Guesty's documentation."
    : "Guesty's documentation has not changed since the spec files were last updated.";
  return [
    `# Guesty documentation check, ${day}`, "",
    failed.length ? `${lead} The ${failed.join(" and ")} check failed (below).` : lead, "",
    ...results.flatMap((result) => siteSection(result, cliSpec)),
  ].join("\n");
}

async function snapshot(root, files) {
  return Promise.all(files.map((file) => readFile(join(root, file), "utf8").catch(() => null)));
}

async function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const args = process.argv.slice(2);
  const summaryIndex = args.indexOf("--summary");
  const files = SITES.flatMap((docs) => [docs.schemaFile, docs.catalogFile]);
  const before = await snapshot(root, files);
  const results = await watchDocs({ root, force: args.includes("--force"), log: (line) => process.stderr.write(`${line}\n`) });
  const changed = !isDeepStrictEqual(before, await snapshot(root, files));
  if (changed) execFileSync(process.execPath, [join(root, "scripts/generate-cli-spec.mjs")], { stdio: ["ignore", "ignore", "inherit"] });
  const cliSpec = await readJson(join(root, "guesty-cli-spec.json"));
  const summary = formatSummary(results, { changed, cliSpec });
  if (summaryIndex !== -1) await writeFile(args[summaryIndex + 1], summary);
  process.stdout.write(`${changed ? "CHANGED" : "UNCHANGED"}\n\n${summary}`);
  if (results.some((result) => result.error)) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
