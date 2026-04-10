import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DOCS_DIR = join(ROOT, "docs", "api");
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

const parseEndpoint = (
  json: string,
  slug: string
): SpecEntry | null => {
  const spec = JSON.parse(json);
  const paths = spec.paths as Record<string, Record<string, { summary?: string }>>;
  const [apiPath, methods] = Object.entries(paths)[0];
  const [method, details] = Object.entries(methods)[0];

  return {
    method: method.toUpperCase(),
    path: `/v1${apiPath}`,
    title: details.summary ?? slug,
    slug,
  };
};

const main = async () => {
  const categories = (await readdir(DOCS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const result: Record<string, SpecEntry[]> = {};
  let total = 0;
  let errors = 0;

  for (const category of categories) {
    const catDir = join(DOCS_DIR, category);
    const files = (await readdir(catDir)).filter((f) => f.endsWith(".md")).sort();

    const entries: SpecEntry[] = [];
    for (const file of files) {
      const slug = basename(file, ".md");
      const content = await readFile(join(catDir, file), "utf-8");
      const jsonBlock = extractJsonBlock(content);

      if (!jsonBlock) {
        console.warn(`  SKIP ${category}/${file} — no JSON block`);
        errors++;
        continue;
      }

      try {
        const entry = parseEndpoint(jsonBlock, slug);
        if (entry) entries.push(entry);
      } catch (err) {
        console.warn(`  SKIP ${category}/${file} — parse error: ${err}`);
        errors++;
      }
    }

    if (entries.length > 0) {
      entries.sort((a, b) => a.path.localeCompare(b.path));
      result[category] = entries;
    }
  }

  total = Object.values(result).reduce((sum, arr) => sum + arr.length, 0);

  await writeFile(OUT_FILE, JSON.stringify(result, null, 2) + "\n");

  const catCount = Object.keys(result).length;
  console.log(
    `api-spec.json: ${total} endpoints across ${catCount} categories` +
      (errors > 0 ? ` (${errors} skipped)` : "")
  );
};

main();
