import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const integrations = new Command("integrations")
  .alias("int")
  .description("Manage integrations and channels");

integrations
  .command("list")
  .description("List all integrations")
  .action(async () => {
    const data = await guestyFetch("/v1/integrations");
    print(data);
  });

integrations
  .command("create")
  .description("Create an integration (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/integrations", { method: "POST", body });
    print(data);
  });

integrations
  .command("get <id>")
  .description("Get an integration by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/integrations/${id}`);
    print(data);
  });

integrations
  .command("update <id>")
  .description("Update an integration (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/integrations/${id}`, { method: "PUT", body });
    print(data);
  });

integrations
  .command("channels")
  .description("List supported marketing channels")
  .action(async () => {
    const data = await guestyFetch("/v1/marketing/channels");
    print(data);
  });

integrations
  .command("promotions")
  .description("List all promotions")
  .action(async () => {
    const data = await guestyFetch("/v1/rm-promotions/promotions");
    print(data);
  });

integrations
  .command("rate-plans")
  .description("List all rate plans")
  .action(async () => {
    const data = await guestyFetch("/v1/rm-rate-plans-ext/rate-plans");
    print(data);
  });

integrations
  .command("rate-plan <id>")
  .description("Get a rate plan by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/rm-rate-plans-ext/rate-plans/${id}`);
    print(data);
  });

integrations
  .command("views")
  .description("List all views")
  .requiredOption("--section <section>", "Section: listings or reservations")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/views", {
      params: { section: opts.section, limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });

integrations
  .command("create-view")
  .description("Create a view (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/views", { method: "POST", body });
    print(data);
  });

integrations
  .command("view <id>")
  .description("Get a view by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/views/${id}`);
    print(data);
  });

integrations
  .command("update-view <id>")
  .description("Update a view (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/views/${id}`, { method: "PUT", body });
    print(data);
  });

integrations
  .command("delete-view <id>")
  .description("Delete a view")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/views/${id}`, { method: "DELETE" });
    print(data);
  });
