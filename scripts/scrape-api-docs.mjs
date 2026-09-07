#!/usr/bin/env node

// Download the current documentation index instead of maintaining a second,
// stale list of endpoint slugs. This script contacts only public documentation.
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const guidesOnly = process.argv.includes("--guides");
const family = process.argv.includes("--booking") ? "booking" : "open";
const base = `https://${family === "booking" ? "booking" : "open"}-api-docs.guesty.com`;
const out = join(root, "docs", "api", family);

async function read(url) {
  const response = await fetch(url, { headers: { "User-Agent": "guesty-cli documentation-refresh" }, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.text();
}

async function main() {
  const index = await read(`${base}/llms.txt`);
  const urls = [...new Set([...index.matchAll(/\]\((https:\/\/[^)]+\.md)\)/g)].map((match) => match[1]))]
    .filter((url) => url.startsWith(`${base}/${guidesOnly ? "docs/" : ""}`));
  if (!urls.length) throw new Error("Documentation index contains no matching pages.");
  await mkdir(out, { recursive: true });
  await writeFile(join(out, "llms.txt"), index);
  const failures = [];
  for (let offset = 0; offset < urls.length; offset += 4) {
    const batch = urls.slice(offset, offset + 4);
    const results = await Promise.allSettled(batch.map(async (url) => {
      const path = new URL(url).pathname.slice(1);
      const content = await read(url);
      const target = join(out, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content);
    }));
    results.forEach((result, index) => {
      if (result.status === "rejected") failures.push({ url: batch[index], error: result.reason.message });
    });
    process.stdout.write(`Downloaded ${Math.min(offset + 4, urls.length)}/${urls.length} documentation pages.\n`);
  }
  await writeFile(join(out, "download-results.json"), JSON.stringify({ total: urls.length, failures }, null, 2) + "\n");
  if (failures.length) throw new Error(`${failures.length} pages failed; see ${join(out, "download-results.json")}.`);
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
