import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const webhooks = new Command("webhooks")
  .description("Manage webhooks");

webhooks
  .command("list")
  .description("List all webhooks")
  .action(async () => {
    const data = await guestyFetch("/v1/webhooks");
    print(data);
  });

webhooks
  .command("get <id>")
  .description("Get a webhook by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/webhooks/${id}`);
    print(data);
  });

webhooks
  .command("create")
  .description("Create a webhook (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/webhooks", { method: "POST", body });
    print(data);
  });

webhooks
  .command("update <id>")
  .description("Update a webhook (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/webhooks/${id}`, { method: "PUT", body });
    print(data);
  });

webhooks
  .command("delete <id>")
  .description("Delete a webhook")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/webhooks/${id}`, { method: "DELETE" });
    print(data);
  });

webhooks
  .command("secret")
  .description("Get webhook secret")
  .action(async () => {
    const data = await guestyFetch("/v1/webhooks-v2/secret");
    print(data);
  });
