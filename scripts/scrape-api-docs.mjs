#!/usr/bin/env node

/**
 * Fetches markdown docs for every Guesty Open API endpoint.
 * Uses the .md URL pattern: https://open-api-docs.guesty.com/reference/{slug}.md
 *
 * Output: docs/api/{category}/{slug}.md
 *
 * Usage: node scripts/scrape-api-docs.mjs [--delay 200] [--category accounting-api]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const SPEC_FILE = join(PROJECT_ROOT, "api-spec.json");
const OUT_DIR = join(PROJECT_ROOT, "docs", "api");
const BASE_URL = "https://open-api-docs.guesty.com/reference";

const args = process.argv.slice(2);
const delayIdx = args.indexOf("--delay");
const catIdx = args.indexOf("--category");
const delayMs = delayIdx !== -1 ? parseInt(args[delayIdx + 1]) || 200 : 200;
const onlyCategory = catIdx !== -1 ? args[catIdx + 1] : null;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchMarkdown(slug) {
  const url = `${BASE_URL}/${slug}.md`;
  const res = await fetch(url);
  if (!res.ok) {
    return null;
  }
  return res.text();
}

async function main() {
  const spec = JSON.parse(readFileSync(SPEC_FILE, "utf8"));
  const categories = Object.entries(spec);

  let totalEndpoints = 0;
  let fetched = 0;
  let skipped = 0;
  let failed = 0;

  for (const [category, endpoints] of categories) {
    if (onlyCategory && category !== onlyCategory) continue;
    totalEndpoints += endpoints.length;
  }

  process.stdout.write(`Fetching ${totalEndpoints} endpoint docs (${delayMs}ms delay between requests)\n\n`);

  for (const [category, endpoints] of categories) {
    if (onlyCategory && category !== onlyCategory) continue;

    const categoryDir = join(OUT_DIR, category);

    for (const endpoint of endpoints) {
      const { slug, method, path, title } = endpoint;
      if (!slug) {
        skipped++;
        continue;
      }

      const outFile = join(categoryDir, `${slug}.md`);

      // Skip if already downloaded
      if (existsSync(outFile)) {
        skipped++;
        process.stdout.write(`  skip  ${category}/${slug}\n`);
        continue;
      }

      const md = await fetchMarkdown(slug);

      if (md === null) {
        failed++;
        process.stderr.write(`  FAIL  ${category}/${slug}\n`);
      } else {
        mkdirSync(categoryDir, { recursive: true });
        writeFileSync(outFile, md);
        fetched++;
        process.stdout.write(`  ok    ${category}/${slug} (${fetched}/${totalEndpoints})\n`);
      }

      await sleep(delayMs);
    }
  }

  process.stdout.write(`\nDone: ${fetched} fetched, ${skipped} skipped, ${failed} failed\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
