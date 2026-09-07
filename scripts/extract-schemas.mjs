#!/usr/bin/env node

// Derive schemas from the complete current OpenAPI snapshot; never infer a
// method from the first property (which can be parameters or x-summary).
import { readFileSync, writeFileSync } from "node:fs";
import { listOperations, normalizePath, operationSchemas } from "./api-reference.mjs";

const read = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const schema = read("openapi-spec.json");
const catalog = read("api-spec.json");
const operations = new Map(listOperations(schema).map((entry) => [`${entry.method} ${normalizePath(entry.path)}`, entry]));
const result = {};
for (const entries of Object.values(catalog)) {
  for (const entry of entries) {
    const operation = operations.get(`${entry.method} ${normalizePath(entry.path)}`);
    if (!operation) throw new Error(`Missing schema for ${entry.method} ${entry.path}`);
    result[entry.slug] = { method: entry.method, path: entry.path, ...operationSchemas(schema, operation.pathItem, operation.operation) };
  }
}
writeFileSync(new URL("../schemas.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
process.stdout.write(`Extracted ${Object.keys(result).length} current schemas; component references resolve against openapi-spec.json.\n`);
