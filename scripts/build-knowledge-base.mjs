#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { listOperations, normalizePath, operationSchemas } from "./api-reference.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputIndex = process.argv.indexOf("--output");
const output = outputIndex === -1 ? join(homedir(), "knowledge", "guesty-api") : process.argv[outputIndex + 1];
if (!output) throw new Error("--output requires a directory.");
const clean = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

async function main() {
  const schema = JSON.parse(await readFile(join(root, "openapi-spec.json"), "utf8"));
  const catalog = JSON.parse(await readFile(join(root, "api-spec.json"), "utf8"));
  const operations = new Map(listOperations(schema).map((entry) => [`${entry.method} ${normalizePath(entry.path)}`, entry]));
  const index = ["# Guesty Open API reference", "", `Source verified: ${schema["x-cli-source"]?.updatedAt ?? "see repository snapshot"}`, "", "This generated reference is a documentation snapshot. Verify changing API behavior against the linked official source before use.", "", "Use cached Open API tokens through `guesty token`. The CLI never creates or renews OAuth tokens.", "", "## Endpoints", ""];
  await mkdir(join(output, "endpoints"), { recursive: true });
  for (const [group, entries] of Object.entries(catalog)) {
    const lines = [`# ${group}`, ""];
    index.push(`- [${group}](endpoints/${group}.md): ${entries.length} operations`);
    for (const entry of entries) {
      const op = operations.get(`${entry.method} ${normalizePath(entry.path)}`);
      if (!op) throw new Error(`Missing schema: ${entry.method} ${entry.path}`);
      const detail = operationSchemas(schema, op.pathItem, op.operation);
      lines.push(`## ${entry.method} ${entry.path}`, "", `[${entry.title}](https://open-api-docs.guesty.com/reference/${entry.slug})`, "");
      if (entry.deprecated) lines.push("Deprecated by Guesty; see the linked migration guidance.", "");
      if (detail.parameters?.length) {
        lines.push("| Parameter | Location | Required | Description |", "| --- | --- | --- | --- |");
        for (const param of detail.parameters) lines.push(`| ${clean(param.name)} | ${clean(param.in)} | ${param.required ? "Yes" : "No"} | ${clean(param.description)} |`);
        lines.push("");
      }
      if (detail.requestBody) lines.push(`Body: ${detail.requestBody.contentType}; ${detail.requestBody.required ? "required" : "optional"}. Full request and response schemas are in the repository's openapi-spec.json.`, "");
    }
    await writeFile(join(output, "endpoints", `${group}.md`), lines.join("\n") + "\n");
  }
  await writeFile(join(output, "index.md"), index.join("\n") + "\n");
  process.stdout.write(`Built ${operations.size} endpoint references in ${output}.\n`);
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
