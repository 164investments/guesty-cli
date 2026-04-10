#!/usr/bin/env npx tsx
/**
 * Builds a condensed Guesty API knowledge base from the raw scraped docs.
 * Parses OpenAPI JSON from each markdown file and creates useful reference docs.
 *
 * Input:  docs/api/{category}/{endpoint}.md
 * Output: ~/knowledge/guesty-api/
 */

import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import { join, basename } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT_DIR = join(__dirname, "..", "docs", "api");
const OUTPUT_DIR = join(
  process.env.HOME ?? "~",
  "knowledge",
  "guesty-api"
);

interface EndpointInfo {
  slug: string;
  title: string;
  description: string;
  method: string;
  path: string;
  category: string;
  parameters: ParamInfo[];
  requestBody?: string;
  responses: ResponseInfo[];
  notes: string;
}

interface ParamInfo {
  name: string;
  in: string;
  required: boolean;
  type: string;
  description: string;
}

interface ResponseInfo {
  status: string;
  description: string;
}

function extractOpenAPIJson(content: string): Record<string, unknown> | null {
  // Find the JSON block after "# OpenAPI definition"
  const jsonMatch = content.match(/```json\s*\n(\{[\s\S]*?\})\s*\n```/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[1]);
  } catch {
    return null;
  }
}

function extractNotes(content: string): string {
  // Get everything before "# OpenAPI definition"
  const parts = content.split(/^# OpenAPI definition/m);
  if (parts.length < 2) return content.trim();

  const beforeOpenAPI = parts[0];
  // Remove the title (first # line)
  const lines = beforeOpenAPI.split("\n");
  const titleIdx = lines.findIndex((l) => l.startsWith("# "));
  const afterTitle = titleIdx >= 0 ? lines.slice(titleIdx + 1).join("\n") : beforeOpenAPI;
  return afterTitle.trim();
}

function resolveSchemaRef(
  ref: string,
  spec: Record<string, unknown>
): Record<string, unknown> | null {
  // Resolve $ref like "#/components/schemas/ReservationResponse"
  const parts = ref.replace("#/", "").split("/");
  let current: unknown = spec;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return current as Record<string, unknown>;
}

function getSchemaShape(
  schema: Record<string, unknown>,
  spec: Record<string, unknown>,
  depth = 0
): string {
  if (depth > 2) return "...";

  if (schema.$ref) {
    const resolved = resolveSchemaRef(schema.$ref as string, spec);
    if (resolved) return getSchemaShape(resolved, spec, depth);
    return (schema.$ref as string).split("/").pop() ?? "unknown";
  }

  if (schema.type === "array" && schema.items) {
    const itemShape = getSchemaShape(
      schema.items as Record<string, unknown>,
      spec,
      depth + 1
    );
    return `${itemShape}[]`;
  }

  if (schema.type === "object" || schema.properties) {
    const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
    if (!props) return "object";
    const keys = Object.keys(props).slice(0, 15);
    const fields = keys.map((k) => {
      const prop = props[k];
      const type = prop.type ?? (prop.$ref ? (prop.$ref as string).split("/").pop() : "any");
      return `  ${k}: ${type}`;
    });
    if (Object.keys(props).length > 15) {
      fields.push(`  ... (${Object.keys(props).length - 15} more)`);
    }
    return `{\n${fields.join("\n")}\n}`;
  }

  return (schema.type as string) ?? "unknown";
}

function parseEndpoint(
  content: string,
  slug: string,
  category: string
): EndpointInfo | null {
  const spec = extractOpenAPIJson(content);
  if (!spec) return null;

  const paths = spec.paths as Record<string, Record<string, unknown>> | undefined;
  if (!paths) return null;

  const pathEntries = Object.entries(paths);
  if (pathEntries.length === 0) return null;

  const [apiPath, methods] = pathEntries[0];
  const methodEntries = Object.entries(methods).filter(
    ([k]) => !k.startsWith("x-") && k !== "parameters"
  );
  if (methodEntries.length === 0) return null;

  const [method, operation] = methodEntries[0] as [string, Record<string, unknown>];

  const title =
    (operation.summary as string) ??
    content.match(/^# (.+)/m)?.[1] ??
    slug;
  const description = (operation.description as string) ?? "";

  // Parameters
  const rawParams = (operation.parameters ?? []) as Array<Record<string, unknown>>;
  const parameters: ParamInfo[] = rawParams.map((p) => ({
    name: p.name as string,
    in: p.in as string,
    required: (p.required as boolean) ?? false,
    type: ((p.schema as Record<string, unknown>)?.type as string) ?? "string",
    description: ((p.description as string) ?? "").substring(0, 120),
  }));

  // Request body summary
  let requestBody: string | undefined;
  const reqBody = operation.requestBody as Record<string, unknown> | undefined;
  if (reqBody) {
    const jsonContent = (reqBody.content as Record<string, Record<string, unknown>>)?.[
      "application/json"
    ];
    if (jsonContent?.schema) {
      requestBody = getSchemaShape(
        jsonContent.schema as Record<string, unknown>,
        spec
      );
    }
  }

  // Responses
  const rawResponses = (operation.responses ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const responses: ResponseInfo[] = Object.entries(rawResponses).map(
    ([status, resp]) => ({
      status,
      description: ((resp.description as string) ?? "").substring(0, 100),
    })
  );

  const notes = extractNotes(content);

  return {
    slug,
    title,
    description: description.substring(0, 300),
    method: method.toUpperCase(),
    path: apiPath,
    category,
    parameters,
    requestBody,
    responses,
    notes,
  };
}

function formatEndpoint(ep: EndpointInfo): string {
  const lines: string[] = [];
  lines.push(`### ${ep.method} \`${ep.path}\``);
  lines.push(`**${ep.title}**`);
  lines.push("");

  if (ep.notes) {
    // Truncate long notes
    const truncatedNotes = ep.notes.length > 500
      ? ep.notes.substring(0, 500) + "..."
      : ep.notes;
    lines.push(truncatedNotes);
    lines.push("");
  }

  if (ep.parameters.length > 0) {
    lines.push("**Parameters:**");
    lines.push("");
    lines.push("| Name | In | Type | Required | Description |");
    lines.push("|------|-----|------|----------|-------------|");
    for (const p of ep.parameters) {
      lines.push(
        `| \`${p.name}\` | ${p.in} | ${p.type} | ${p.required ? "Yes" : "No"} | ${p.description} |`
      );
    }
    lines.push("");
  }

  if (ep.requestBody) {
    lines.push("**Request Body:**");
    lines.push("```");
    lines.push(ep.requestBody);
    lines.push("```");
    lines.push("");
  }

  if (ep.responses.length > 0) {
    lines.push(
      `**Responses:** ${ep.responses.map((r) => `\`${r.status}\``).join(", ")}`
    );
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  console.log("Building Guesty API knowledge base...\n");
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(join(OUTPUT_DIR, "endpoints"), { recursive: true });
  await mkdir(join(OUTPUT_DIR, "guides"), { recursive: true });

  const categories = await readdir(INPUT_DIR);
  const allEndpoints: EndpointInfo[] = [];
  const guideContent: Array<{ name: string; content: string }> = [];

  for (const category of categories) {
    const catPath = join(INPUT_DIR, category);
    // Skip non-directories
    try {
      const files = await readdir(catPath);
      const mdFiles = files.filter((f) => f.endsWith(".md"));

      for (const file of mdFiles) {
        const content = await readFile(join(catPath, file), "utf-8");
        const slug = basename(file, ".md");
        const endpoint = parseEndpoint(content, slug, category);

        if (endpoint) {
          allEndpoints.push(endpoint);
        }
      }
    } catch {
      // Not a directory, might be a file like listings.csv
      continue;
    }
  }

  console.log(`Parsed ${allEndpoints.length} endpoints\n`);

  // Also grab guide pages from the new scrape
  const guideFiles = [
    "authentication-2",
    "how-to-use-the-api-reference",
    "open-api-faq",
    "the-guesty-booking-engine",
    "terms-of-service",
    "webhooks",
  ];
  const scrapeDir = join(__dirname, "..", "docs", "api-reference");
  for (const guide of guideFiles) {
    try {
      const content = await readFile(join(scrapeDir, `${guide}.md`), "utf-8");
      if (content.length > 100) {
        guideContent.push({ name: guide, content });
      }
    } catch {
      // Not available
    }
  }

  // Group endpoints by category
  const byCategory = new Map<string, EndpointInfo[]>();
  for (const ep of allEndpoints) {
    const existing = byCategory.get(ep.category) ?? [];
    existing.push(ep);
    byCategory.set(ep.category, existing);
  }

  // Write per-category endpoint files
  for (const [category, endpoints] of byCategory) {
    endpoints.sort((a, b) => {
      const methodOrder: Record<string, number> = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4 };
      return (methodOrder[a.method] ?? 5) - (methodOrder[b.method] ?? 5);
    });

    const lines: string[] = [];
    lines.push(`# ${category}`);
    lines.push("");
    lines.push(`> ${endpoints.length} endpoints`);
    lines.push("");

    // Quick reference table
    lines.push("## Quick Reference");
    lines.push("");
    lines.push("| Method | Path | Description |");
    lines.push("|--------|------|-------------|");
    for (const ep of endpoints) {
      lines.push(
        `| \`${ep.method}\` | \`${ep.path}\` | ${ep.title} |`
      );
    }
    lines.push("");

    // Detailed docs
    lines.push("## Endpoints");
    lines.push("");
    for (const ep of endpoints) {
      lines.push(formatEndpoint(ep));
    }

    await writeFile(
      join(OUTPUT_DIR, "endpoints", `${category}.md`),
      lines.join("\n"),
      "utf-8"
    );
  }

  // Write guide files
  for (const guide of guideContent) {
    // Strip the massive OpenAPI JSON from guides
    const cleaned = guide.content.split(/^# OpenAPI definition/m)[0].trim();
    if (cleaned.length > 50) {
      await writeFile(
        join(OUTPUT_DIR, "guides", `${guide.name}.md`),
        cleaned,
        "utf-8"
      );
    }
  }

  // Build master index
  const indexLines: string[] = [];
  indexLines.push("# Guesty API Knowledge Base");
  indexLines.push("");
  indexLines.push(`Generated: ${new Date().toISOString().split("T")[0]}`);
  indexLines.push(`Base URL: \`https://open-api.guesty.com/v1\``);
  indexLines.push(`Auth: Bearer token (OAuth2 client_credentials)`);
  indexLines.push(`Total endpoints: ${allEndpoints.length}`);
  indexLines.push(`Categories: ${byCategory.size}`);
  indexLines.push("");
  indexLines.push("## How to Use");
  indexLines.push("");
  indexLines.push("- **Quick lookup**: Scan this index for the endpoint category, then read the category file");
  indexLines.push("- **Endpoint details**: `endpoints/{category}.md` has params, request body, response codes");
  indexLines.push("- **Guides**: `guides/` has authentication, FAQ, booking engine docs");
  indexLines.push("- **Raw docs**: `~/projects/guesty-cli/docs/api/` has full OpenAPI specs per endpoint");
  indexLines.push("");
  indexLines.push("## Endpoint Index");
  indexLines.push("");

  const sortedCategories = [...byCategory.entries()].sort(
    (a, b) => b[1].length - a[1].length
  );

  for (const [category, endpoints] of sortedCategories) {
    indexLines.push(`### [${category}](endpoints/${category}.md) (${endpoints.length})`);
    indexLines.push("");
    for (const ep of endpoints) {
      indexLines.push(`- \`${ep.method}\` \`${ep.path}\` — ${ep.title}`);
    }
    indexLines.push("");
  }

  if (guideContent.length > 0) {
    indexLines.push("## Guides");
    indexLines.push("");
    for (const guide of guideContent) {
      indexLines.push(`- [${guide.name}](guides/${guide.name}.md)`);
    }
    indexLines.push("");
  }

  await writeFile(join(OUTPUT_DIR, "index.md"), indexLines.join("\n"), "utf-8");

  // Summary
  console.log("Knowledge base built!");
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`  Endpoints: ${allEndpoints.length}`);
  console.log(`  Categories: ${byCategory.size}`);
  console.log(`  Guides: ${guideContent.length}`);
  console.log(
    `  Category files: ${[...byCategory.keys()].join(", ")}`
  );
}

main().catch(console.error);
