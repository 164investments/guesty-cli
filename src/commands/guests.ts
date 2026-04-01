import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const guests = new Command("guests")
  .description("Manage guests");

guests
  .command("list")
  .description("List/search guests")
  .option("--q <query>", "Search query (name, email, phone)")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const params: Record<string, string | number> = {
      limit: parseInt(opts.limit),
      skip: parseInt(opts.skip),
    };
    if (opts.q) params.q = opts.q;
    const data = await guestyFetch("/v1/guests-crud", { params });
    print(data);
  });

guests
  .command("get <id>")
  .description("Get a single guest by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/guests-crud/${id}`);
    print(data);
  });

guests
  .command("create")
  .description("Create a guest (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/guests-crud", {
      method: "POST",
      body,
    });
    print(data);
  });

guests
  .command("update <id>")
  .description("Update a guest (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/guests-crud/${id}`, {
      method: "PUT",
      body,
    });
    print(data);
  });

guests
  .command("add-payment-method <id>")
  .description("Add a payment method to a guest (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/guests/${id}/payment-methods`, { method: "POST", body });
    print(data);
  });

guests
  .command("payment-methods <id>")
  .description("List payment methods for a guest")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/guests/${id}/payment-methods`);
    print(data);
  });
