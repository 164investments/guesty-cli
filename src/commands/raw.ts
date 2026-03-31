import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";

export const raw = new Command("raw")
  .description("Make a raw API call to any Guesty endpoint")
  .argument("<method>", "HTTP method (GET, POST, PUT, DELETE, PATCH)")
  .argument("<path>", "API path (e.g. /v1/listings)")
  .option("--data <json>", "JSON body")
  .option("--params <json>", "Query params as JSON")
  .action(async (method: string, path: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : undefined;
    const params = opts.params ? JSON.parse(opts.params) : undefined;
    const data = await guestyFetch(path, {
      method: method.toUpperCase(),
      body,
      params,
    });
    print(data);
  });
