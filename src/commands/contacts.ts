import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const contacts = new Command("contacts")
  .description("Manage contacts");

contacts
  .command("list")
  .description("List contacts")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const params: Record<string, string | number> = {
      limit: parseInt(opts.limit),
      skip: parseInt(opts.skip),
    };
    const data = await guestyFetch("/v1/contacts", { params });
    print(data);
  });

contacts
  .command("get <contactId>")
  .description("Get a contact by ID")
  .action(async (contactId: string) => {
    const data = await guestyFetch(`/v1/contacts/${contactId}`);
    print(data);
  });

contacts
  .command("create")
  .description("Create a contact (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/contacts", { method: "POST", body });
    print(data);
  });

contacts
  .command("update <contactId>")
  .description("Update a contact (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (contactId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/contacts/${contactId}`, { method: "PUT", body });
    print(data);
  });

contacts
  .command("delete <contactId>")
  .description("Delete a contact")
  .action(async (contactId: string) => {
    const data = await guestyFetch(`/v1/contacts/${contactId}`, { method: "DELETE" });
    print(data);
  });
