import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const users = new Command("users")
  .description("Manage users and roles");

users
  .command("list")
  .description("List all users")
  .action(async () => {
    const data = await guestyFetch("/v1/users");
    print(data);
  });

users
  .command("get <id>")
  .description("Get a user by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/users/${id}`);
    print(data);
  });

users
  .command("create")
  .description("Create a user (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/users", { method: "POST", body });
    print(data);
  });

users
  .command("update <id>")
  .description("Update a user (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/users/${id}`, { method: "PUT", body });
    print(data);
  });

users
  .command("delete <id>")
  .description("Delete a user")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/users/${id}`, { method: "DELETE" });
    print(data);
  });

users
  .command("roles")
  .description("Get available roles")
  .action(async () => {
    const data = await guestyFetch("/v1/roles");
    print(data);
  });

users
  .command("account")
  .description("Get current account details")
  .action(async () => {
    const data = await guestyFetch("/v1/accounts/me");
    print(data);
  });
