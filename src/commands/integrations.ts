import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";

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
  .command("get <id>")
  .description("Get an integration by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/integrations/${id}`);
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
  .action(async () => {
    const data = await guestyFetch("/v1/views");
    print(data);
  });

integrations
  .command("view <id>")
  .description("Get a view by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/views/${id}`);
    print(data);
  });
