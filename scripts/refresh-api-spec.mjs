#!/usr/bin/env node

// Usage: node scripts/refresh-api-spec.mjs [--booking-engine] [--interval-ms 2000] [--max-minutes 25] [--allow-shrink]
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BOOKING_ENGINE_DOCS, OPEN_API_DOCS, refreshApiSpec } from "./reference-refresh.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function numberOption(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} needs a positive number.`);
  return value;
}

async function main() {
  const docs = args.includes("--booking-engine") ? BOOKING_ENGINE_DOCS : OPEN_API_DOCS;
  const result = await refreshApiSpec({
    root,
    docs,
    intervalMs: numberOption("--interval-ms", 2_000),
    maxRuntimeMs: numberOption("--max-minutes", 25) * 60_000,
    allowShrink: args.includes("--allow-shrink"),
    log: (line) => process.stdout.write(`${line}\n`),
    warn: (line) => process.stderr.write(`${line}\n`),
  });
  const seconds = Math.round(result.elapsedMs / 1000);
  const lines = [
    `Refreshed ${result.current} ${docs.api.label} operations from ${result.pages} Guesty reference pages (previously ${result.previous}; documentation updated ${result.source.updatedAt}).`,
    `Added ${result.added.length}, removed ${result.removed.length}.`,
    ...result.added.map((key) => `  + ${key}`),
    ...result.removed.map((key) => `  - ${key}`),
    `Took ${Math.floor(seconds / 60)}m ${seconds % 60}s: ${result.requests} requests, ${result.retries} retries, ${result.throttled} rate-limited.`,
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
