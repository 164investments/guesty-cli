#!/usr/bin/env npx tsx
/**
 * Scrapes all Guesty Guide pages as markdown.
 * URL pattern: https://open-api-docs.guesty.com/docs/{slug}.md
 *
 * Usage: npx tsx scripts/scrape-guides.ts
 */

import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = "https://open-api-docs.guesty.com/docs";
const OUTPUT_DIR = join(
  process.env.HOME ?? "~",
  "knowledge",
  "guesty-api",
  "guides"
);
const CONCURRENCY = 5;
const DELAY_MS = 200;

const SLUGS = [
  "authentication",
  "available-listings",
  "bedrooms-beds",
  "booking-flow",
  "booking-settings",
  "calendar-block-types",
  "calendar-webhook-migration",
  "canceling-a-booking-or-inquiry",
  "canceling-or-editing-a-scheduled-payment",
  "create-a-property",
  "create-a-reservation",
  "create-guest-and-payment-method",
  "custom-reservation-fields-migration",
  "deactivating-listings",
  "extend-or-shorten-a-reservation",
  "fetch-reservation-payment-schedules",
  "fields-for-guest-reports",
  "how-to-search-for-reservations",
  "list-and-unlist-properties",
  "listing-descriptions",
  "listing-financials",
  "listing-location",
  "listing-photos",
  "moving-your-website-from-guestys-legacy-api-to-booking-engine-api",
  "payment-transactions-api-reference",
  "payouts-reconciliation-api-reference",
  "posting-a-guest-payment",
  "postman-guide",
  "predefined-additional-fee-types",
  "publish-a-custom-review",
  "quick-start-guide",
  "rate-limits",
  "recording-external-guest-payments",
  "refunding-a-guest-payment",
  "relocating-a-guest",
  "reservation-alterations",
  "reservation-statuses",
  "revenue-management",
  "search-for-available-listings",
  "search-for-listings-and-availability",
  "setting-up-webhooks",
  "setting-up-your-payment-provider",
  "task-types-and-statuses",
  "taxes-and-fees",
  "the-booking-engine-api",
  "the-guesty-booking-engine",
  "unit-type-management",
  "update-a-reservation",
  "update-calendar-pricing-and-availability",
  "updating-a-listing-listing-settings",
  "use-retrievecreate-quotes-for-pricing",
  "webhook-events",
  "webhooks-migration-guide",
  "webhooks-v2",
  "working-with-reservation-payments",
  "working-with-the-reservations-api",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchMarkdown(slug: string): Promise<{ content: string | null; error?: string }> {
  const url = `${BASE_URL}/${slug}.md`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { content: null, error: `HTTP ${res.status}` };
    const text = await res.text();
    return { content: text };
  } catch (e) {
    return { content: null, error: (e as Error).message };
  }
}

async function main() {
  console.log(`Scraping ${SLUGS.length} Guesty Guide pages...\n`);
  await mkdir(OUTPUT_DIR, { recursive: true });

  let succeeded = 0;
  let failed = 0;
  const results: Array<{ slug: string; size: number }> = [];
  const failures: Array<{ slug: string; error: string }> = [];

  for (let i = 0; i < SLUGS.length; i += CONCURRENCY) {
    const batch = SLUGS.slice(i, i + CONCURRENCY);
    const promises = batch.map(async (slug) => {
      const { content, error } = await fetchMarkdown(slug);
      if (content && content.length > 20) {
        await writeFile(join(OUTPUT_DIR, `${slug}.md`), content, "utf-8");
        succeeded++;
        results.push({ slug, size: content.length });
        if (succeeded % 10 === 0) console.log(`  [${succeeded + failed}/${SLUGS.length}] ...`);
      } else {
        failed++;
        console.log(`  FAILED: ${slug} — ${error ?? "empty"}`);
        failures.push({ slug, error: error ?? "empty" });
      }
    });
    await Promise.all(promises);
    await sleep(DELAY_MS);
  }

  // Write guides index
  const indexLines = [
    "# Guesty API Guides",
    "",
    `Scraped: ${new Date().toISOString().split("T")[0]}`,
    `Total: ${succeeded} guides`,
    "",
    "## Pages",
    "",
    ...results
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((r) => `- [${r.slug}](./${r.slug}.md) (${(r.size / 1024).toFixed(1)} KB)`),
  ];

  if (failures.length > 0) {
    indexLines.push("", "## Failed", "", ...failures.map((f) => `- ${f.slug}: ${f.error}`));
  }

  await writeFile(join(OUTPUT_DIR, "INDEX.md"), indexLines.join("\n"), "utf-8");

  console.log(`\nDone!`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Output: ${OUTPUT_DIR}`);
}

main().catch(console.error);
