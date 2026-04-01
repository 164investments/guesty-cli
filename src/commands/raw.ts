import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

type RawResponseMode = "auto" | "json" | "text" | "buffer";

function collectHeaders(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

function parseHeaders(values: string[]): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const header of values) {
    const separator = header.indexOf(":");
    if (separator === -1) {
      throw new Error(`Invalid header '${header}'. Use 'Name: value'.`);
    }
    const key = header.slice(0, separator).trim();
    const value = header.slice(separator + 1).trim();
    if (!key) {
      throw new Error(`Invalid header '${header}'. Header name is required.`);
    }
    headers[key] = value;
  }
  return headers;
}

export const raw = new Command("raw")
  .description("Make a raw API call to any Guesty endpoint, including text, CSV, and binary payloads")
  .argument("<method>", "HTTP method (GET, POST, PUT, DELETE, PATCH)")
  .argument("<path>", "API path (e.g. /v1/listings)")
  .option("--data <json>", "JSON request body")
  .option("--text <text>", "Plain-text request body")
  .option("--data-file <path>", "Read the request body from a file")
  .option("--stdin", "Read the request body from stdin as text")
  .option("--params <json>", "Query params as JSON")
  .option("--content-type <type>", "Request Content-Type header")
  .option("--accept <type>", "Request Accept header")
  .option("-H, --header <header>", "Additional header in 'Name: value' format", collectHeaders, [])
  .option("--response <mode>", "Response mode: auto, json, text, buffer", "auto")
  .option("--output <path>", "Write the response body to a file")
  .action(async (method: string, path: string, opts) => {
    let body: unknown;
    if (opts.data !== undefined) {
      body = JSON.parse(opts.data);
    } else if (opts.text !== undefined) {
      body = opts.text;
    } else if (opts.dataFile !== undefined) {
      body = readFileSync(opts.dataFile);
    } else if (opts.stdin) {
      body = await readStdin();
    }

    const params = opts.params ? JSON.parse(opts.params) : undefined;
    const headers = parseHeaders(opts.header);
    if (opts.contentType) headers["Content-Type"] = opts.contentType;
    if (opts.accept) headers.Accept = opts.accept;

    const data = await guestyFetch(path, {
      method: method.toUpperCase(),
      body,
      params,
      headers,
      responseType: opts.response as RawResponseMode,
    });

    if (opts.output) {
      if (typeof data === "string" || data instanceof Uint8Array) {
        writeFileSync(opts.output, data);
      } else {
        writeFileSync(opts.output, JSON.stringify(data, null, 2) + "\n");
      }
      process.stderr.write(`Saved response to ${opts.output}\n`);
      return;
    }

    print(data);
  });
