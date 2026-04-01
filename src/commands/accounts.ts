import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const accounts = new Command("accounts")
  .alias("acct-fields")
  .description("Account custom fields and info");

accounts
  .command("me")
  .description("Get current account info")
  .action(async () => {
    const data = await guestyFetch("/v1/accounts/me");
    print(data);
  });

accounts
  .command("list-custom-fields <id>")
  .description("List custom fields for an account")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/accounts/${id}/custom-fields`);
    print(data);
  });

accounts
  .command("create-custom-field <id>")
  .description("Create a custom field (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/accounts/${id}/custom-fields`, {
      method: "POST",
      body,
    });
    print(data);
  });

accounts
  .command("update-custom-field <id>")
  .description("Update a custom field (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/accounts/${id}/custom-fields`, {
      method: "PUT",
      body,
    });
    print(data);
  });

accounts
  .command("get-custom-field <id> <fieldId>")
  .description("Get a specific custom field")
  .action(async (id: string, fieldId: string) => {
    const data = await guestyFetch(`/v1/accounts/${id}/custom-fields/${fieldId}`);
    print(data);
  });

accounts
  .command("delete-custom-field <id> <fieldId>")
  .description("Delete a custom field")
  .action(async (id: string, fieldId: string) => {
    const data = await guestyFetch(`/v1/accounts/${id}/custom-fields/${fieldId}`, {
      method: "DELETE",
    });
    print(data);
  });
