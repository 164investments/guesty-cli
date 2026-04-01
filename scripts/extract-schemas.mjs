#!/usr/bin/env node

/**
 * Extracts request/response schemas from the scraped markdown docs
 * and writes a consolidated schemas.json keyed by slug.
 *
 * Each entry contains: { parameters, requestBody, responses }
 * extracted from the OpenAPI JSON embedded in the markdown.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

const DOCS_DIR = join(process.cwd(), "docs", "api");
const OUTPUT = join(process.cwd(), "schemas.json");

function extractOpenApiJson(markdown) {
  const match = markdown.match(/```json\s*\n(\{[\s\S]*?\})\s*\n```/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractSchemas(openapi) {
  if (!openapi?.paths) return null;

  const pathEntries = Object.entries(openapi.paths);
  if (pathEntries.length === 0) return null;

  const [path, methods] = pathEntries[0];
  const methodEntries = Object.entries(methods);
  if (methodEntries.length === 0) return null;

  const [method, operation] = methodEntries[0];

  const result = {
    method: method.toUpperCase(),
    path: `/v1${path}`,
    summary: operation.summary || null,
    description: operation.description || null,
  };

  // Extract parameters
  if (operation.parameters?.length > 0) {
    result.parameters = operation.parameters.map((p) => ({
      name: p.name,
      in: p.in,
      required: p.required || false,
      description: p.description || null,
      type: p.schema?.type || null,
      enum: p.schema?.enum || null,
      example: p.schema?.example ?? null,
      default: p.schema?.default ?? null,
    }));
  }

  // Extract request body schema
  if (operation.requestBody?.content) {
    const contentType = Object.keys(operation.requestBody.content)[0];
    const schema = operation.requestBody.content[contentType]?.schema;
    if (schema) {
      result.requestBody = {
        required: operation.requestBody.required || false,
        contentType,
        schema: flattenSchema(schema),
      };
    }
  }

  // Extract response schemas
  if (operation.responses) {
    const responses = {};
    for (const [code, resp] of Object.entries(operation.responses)) {
      const entry = { description: resp.description || null };
      if (resp.content) {
        const ct = Object.keys(resp.content)[0];
        const schema = resp.content[ct]?.schema;
        if (schema) {
          entry.contentType = ct;
          entry.schema = flattenSchema(schema);
        }
      }
      responses[code] = entry;
    }
    result.responses = responses;
  }

  return result;
}

function flattenSchema(schema, depth = 0) {
  if (depth > 5) return { type: "object", note: "truncated" };

  if (schema.allOf) {
    const merged = { type: "object", properties: {} };
    for (const sub of schema.allOf) {
      const flat = flattenSchema(sub, depth + 1);
      if (flat.properties) {
        Object.assign(merged.properties, flat.properties);
      }
    }
    if (schema.description) merged.description = schema.description;
    return merged;
  }

  if (schema.oneOf || schema.anyOf) {
    const variants = (schema.oneOf || schema.anyOf).map((s) => flattenSchema(s, depth + 1));
    return { oneOf: variants, description: schema.description || null };
  }

  if (schema.type === "array" && schema.items) {
    return {
      type: "array",
      items: flattenSchema(schema.items, depth + 1),
      description: schema.description || null,
    };
  }

  if (schema.type === "object" && schema.properties) {
    const props = {};
    for (const [key, val] of Object.entries(schema.properties)) {
      props[key] = flattenSchema(val, depth + 1);
    }
    const result = { type: "object", properties: props };
    if (schema.required) result.required = schema.required;
    if (schema.description) result.description = schema.description;
    return result;
  }

  // Leaf property
  const leaf = {};
  if (schema.type) leaf.type = schema.type;
  if (schema.enum) leaf.enum = schema.enum;
  if (schema.description) leaf.description = schema.description;
  if (schema.example !== undefined) leaf.example = schema.example;
  if (schema.format) leaf.format = schema.format;
  if (schema.default !== undefined) leaf.default = schema.default;
  if (schema.minimum !== undefined) leaf.minimum = schema.minimum;
  if (schema.maximum !== undefined) leaf.maximum = schema.maximum;
  return leaf;
}

function walkDir(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry.endsWith(".md")) {
      files.push(full);
    }
  }
  return files;
}

const files = walkDir(DOCS_DIR);
const schemas = {};
let extracted = 0;
let failed = 0;

for (const file of files) {
  const slug = basename(file, ".md");
  const md = readFileSync(file, "utf8");
  const openapi = extractOpenApiJson(md);
  if (!openapi) {
    failed++;
    continue;
  }
  const result = extractSchemas(openapi);
  if (result) {
    schemas[slug] = result;
    extracted++;
  } else {
    failed++;
  }
}

writeFileSync(OUTPUT, JSON.stringify(schemas, null, 2) + "\n");
process.stdout.write(`Extracted ${extracted} schemas, ${failed} failed, written to schemas.json\n`);
