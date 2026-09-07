#!/usr/bin/env node

import { readFile, writeFile, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildReference, readDocumentationPage } from "./api-reference.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceUrl = "https://open-api-docs.guesty.com/reference/get_accounts-me";

async function main() {
  const response = await fetch(sourceUrl, {
    headers: { "User-Agent": "guesty-cli documentation-refresh" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Guesty documentation returned HTTP ${response.status}; no reference files were updated.`);
  const page = readDocumentationPage(await response.text());
  const previous = JSON.parse(await readFile(join(root, "api-spec.json"), "utf8"));
  const catalog = buildReference(page, previous);
  const schema = page.document.api.schema;
  schema["x-cli-source"] = { url: sourceUrl, updatedAt: page.apiDefinitions?.[0]?.updated_at ?? page.document.updated_at };
  // Finish parsing/validation before replacing either artifact. A failed fetch
  // must never silently publish a partial or empty endpoint inventory.
  const staged = [];
  try {
    for (const [name, data] of [["openapi-spec.json", schema], ["api-spec.json", catalog]]) {
      const target = join(root, name);
      const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
      staged.push({ target, temporary });
      await writeFile(temporary, JSON.stringify(data, null, 2) + "\n", { flag: "wx" });
    }
    for (const { target, temporary } of staged) await rename(temporary, target);
  } finally {
    for (const { temporary } of staged) await rm(temporary, { force: true });
  }
  process.stdout.write(`Refreshed ${Object.values(catalog).reduce((sum, entries) => sum + entries.length, 0)} endpoints from the current Guesty OpenAPI document.\n`);
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
