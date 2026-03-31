import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const quotes = new Command("quotes")
  .description("Manage quotes");

quotes
  .command("get <quoteId>")
  .description("Get a quote by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/quotes/${id}`);
    print(data);
  });

quotes
  .command("create")
  .description("Create a quote (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/quotes", { method: "POST", body });
    print(data);
  });

quotes
  .command("create-multiple")
  .description("Create multiple quotes (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/quotes/multiple", { method: "POST", body });
    print(data);
  });
