import { Command, Option } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { guestyFetch, type QueryParams, type ResponseType } from "../client.js";
import { print, printJson } from "../output.js";
import { readStdin } from "../stdin.js";

function collectHeaders(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function parseHeaders(values: string[]): Record<string, string> {
  const headers: Record<string, string> = Object.create(null);
  for (const header of values) {
    const separator = header.indexOf(":");
    if (separator === -1) {
      throw new Error("Invalid header. Use 'Name: value'.");
    }
    const key = header.slice(0, separator).trim();
    const value = header.slice(separator + 1).trim();
    if (!key) {
      throw new Error("Invalid header. Header name is required.");
    }
    headers[key.toLowerCase()] = value;
  }
  return headers;
}

function parseJson(value: string, option: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${option} must be valid JSON.`);
  }
}

export const raw = new Command("raw")
  .description("Make a raw Guesty Open API resource request, including text, CSV, and binary payloads. OAuth endpoints are disabled.")
  .argument("<method>", "HTTP method (GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS)")
  .argument("<path>", "API path (e.g. /v1/listings)")
  .option("--data <json>", "JSON request body")
  .option("--text <text>", "Plain-text request body")
  .option("--data-file <path>", "Read the request body from a file")
  .option("--stdin", "Read the request body from stdin as text")
  .option("--params <json>", "Query params as JSON")
  .option("--content-type <type>", "Request Content-Type header")
  .option("--accept <type>", "Request Accept header")
  .option("-H, --header <header>", "Additional header in 'Name: value' format", collectHeaders, [])
  .addOption(new Option("--response <mode>", "Response mode").choices(["auto", "json", "text", "buffer"]).default("auto"))
  .option("--timeout <seconds>", "Per-request timeout in seconds", "60")
  .option("--output <path>", "Write the response body to a file")
  .action(async (method: string, path: string, opts) => {
    const bodyOptions = [opts.data, opts.text, opts.dataFile, opts.stdin].filter((value) => value !== undefined);
    if (bodyOptions.length > 1) throw new Error("Use only one body input: --data, --text, --data-file, or --stdin.");
    const timeoutMs = Number(opts.timeout) * 1000;
    if (!/^\d+(?:\.\d+)?$/.test(opts.timeout) || !Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
      throw new Error("--timeout must be a positive number of seconds, at most 2147483.647.");
    }
    let body: unknown;
    if (opts.data !== undefined) {
      // JSON primitives, including strings and null, must retain JSON encoding.
      body = JSON.stringify(parseJson(opts.data, "--data"));
    } else if (opts.text !== undefined) {
      body = opts.text;
    } else if (opts.dataFile !== undefined) {
      body = readFileSync(opts.dataFile);
    } else if (opts.stdin) {
      body = await readStdin();
    }

    const params = opts.params !== undefined ? parseJson(opts.params, "--params") : undefined;
    const headers = parseHeaders(opts.header);
    if (opts.data !== undefined && headers["content-type"] === undefined) headers["content-type"] = "application/json";
    if (opts.contentType) headers["content-type"] = opts.contentType;
    if (opts.accept) headers.accept = opts.accept;

    const data = await guestyFetch(path, {
      method: method.toUpperCase(),
      body,
      params: params as QueryParams | undefined,
      headers,
      responseType: opts.response as ResponseType,
      timeoutMs,
    });

    if (opts.output) {
      if (data === undefined) {
        writeFileSync(opts.output, "");
      } else if (opts.response === "json") {
        writeFileSync(opts.output, JSON.stringify(data, null, 2) + "\n");
      } else if (typeof data === "string" || data instanceof Uint8Array) {
        writeFileSync(opts.output, data);
      } else {
        writeFileSync(opts.output, JSON.stringify(data, null, 2) + "\n");
      }
      process.stderr.write(`Saved response to ${opts.output}\n`);
      return;
    }

    if (opts.response === "json") printJson(data);
    else print(data);
  });
