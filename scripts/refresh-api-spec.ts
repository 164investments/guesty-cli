/**
 * Compiles scraped Guesty API reference markdown into api-spec.json.
 *
 * Reads from docs/api-reference/*.md (flat layout produced by scrape-api-docs.ts).
 * Each .md file contains an embedded ```json``` block with an OpenAPI 3.0.3 spec
 * for a single endpoint. We extract method, path, summary, and tag (= category)
 * from the spec and group entries by category in the manifest.
 *
 * Output: api-spec.json with shape { [category]: SpecEntry[] }
 */
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DOCS_DIR = join(ROOT, "docs", "api-reference");
const LEGACY_DOCS_DIR = join(ROOT, "docs", "api"); // backward compat
const OUT_FILE = join(ROOT, "api-spec.json");

interface SpecEntry {
  method: string;
  path: string;
  title: string;
  slug: string;
}

const extractJsonBlock = (md: string): string | null => {
  const match = md.match(/```json\n([\s\S]*?)\n```/);
  return match ? match[1] : null;
};

interface ParsedEndpoint {
  entry: SpecEntry;
  category: string;
}

const parseEndpoint = (json: string, slug: string): ParsedEndpoint | null => {
  const spec = JSON.parse(json);
  const paths = spec.paths as Record<string, Record<string, { summary?: string; tags?: string[] }>>;
  const pathsEntries = Object.entries(paths);
  if (pathsEntries.length === 0) return null;
  const [apiPath, methods] = pathsEntries[0];
  const methodEntries = Object.entries(methods);
  if (methodEntries.length === 0) return null;
  const [method, details] = methodEntries[0];

  // Derive category from the first endpoint tag, then from spec.tags[0].name, then "uncategorized"
  let category = "uncategorized";
  if (details.tags && details.tags.length > 0) {
    category = String(details.tags[0]);
  } else if (Array.isArray(spec.tags) && spec.tags.length > 0 && spec.tags[0].name) {
    category = String(spec.tags[0].name);
  }
  // Normalize: lowercase, hyphenate
  category = category.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return {
    entry: {
      method: method.toUpperCase(),
      path: `/v1${apiPath}`,
      title: details.summary ?? slug,
      slug,
    },
    category,
  };
};

async function dirExists(p: string): Promise<boolean> {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

const main = async () => {
  // Prefer the new flat layout from scrape-api-docs.ts; fall back to legacy categorized dir.
  const usingNewLayout = await dirExists(DOCS_DIR);
  const usingLegacy = !usingNewLayout && (await dirExists(LEGACY_DOCS_DIR));

  if (!usingNewLayout && !usingLegacy) {
    console.error(`No docs found at ${DOCS_DIR} or ${LEGACY_DOCS_DIR}. Run scrape-api-docs.ts first.`);
    process.exit(1);
  }

  const result: Record<string, SpecEntry[]> = {};
  let total = 0;
  let errors = 0;

  if (usingNewLayout) {
    // Flat: one .md per endpoint, derive category from the embedded OpenAPI tags
    const files = (await readdir(DOCS_DIR))
      .filter((f) => f.endsWith(".md") && f !== "INDEX.md")
      .sort();

    for (const file of files) {
      const slug = basename(file, ".md");
      const content = await readFile(join(DOCS_DIR, file), "utf-8");
      const jsonBlock = extractJsonBlock(content);

      if (!jsonBlock) {
        // Non-endpoint pages (overviews, guides) won't have a JSON block — skip silently
        continue;
      }

      try {
        const parsed = parseEndpoint(jsonBlock, slug);
        if (!parsed) continue;
        if (!result[parsed.category]) result[parsed.category] = [];
        result[parsed.category].push(parsed.entry);
      } catch (err) {
        console.warn(`  SKIP ${file} — parse error: ${err}`);
        errors++;
      }
    }
  } else {
    // Legacy categorized layout
    const categories = (await readdir(LEGACY_DOCS_DIR, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    for (const category of categories) {
      const catDir = join(LEGACY_DOCS_DIR, category);
      const files = (await readdir(catDir)).filter((f) => f.endsWith(".md")).sort();
      const entries: SpecEntry[] = [];
      for (const file of files) {
        const slug = basename(file, ".md");
        const content = await readFile(join(catDir, file), "utf-8");
        const jsonBlock = extractJsonBlock(content);
        if (!jsonBlock) {
          errors++;
          continue;
        }
        try {
          const parsed = parseEndpoint(jsonBlock, slug);
          if (parsed) entries.push(parsed.entry);
        } catch {
          errors++;
        }
      }
      if (entries.length > 0) result[category] = entries;
    }
  }

  // Sort entries within each category for stability
  for (const cat of Object.keys(result)) {
    result[cat].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
  }
  // Sort categories
  const sortedResult: Record<string, SpecEntry[]> = {};
  for (const cat of Object.keys(result).sort()) {
    sortedResult[cat] = result[cat];
  }

  total = Object.values(sortedResult).reduce((sum, arr) => sum + arr.length, 0);

  await writeFile(OUT_FILE, JSON.stringify(sortedResult, null, 2) + "\n");

  const catCount = Object.keys(sortedResult).length;
  console.log(
    `api-spec.json: ${total} endpoints across ${catCount} categories` +
      (errors > 0 ? ` (${errors} skipped)` : "") +
      ` (source: ${usingNewLayout ? "docs/api-reference" : "docs/api"})`
  );

  // Print top categories by endpoint count
  const sortedCats = Object.entries(sortedResult).sort((a, b) => b[1].length - a[1].length);
  console.log("\nTop categories:");
  for (const [cat, entries] of sortedCats.slice(0, 15)) {
    console.log(`  ${entries.length.toString().padStart(4)}  ${cat}`);
  }
};

main();
