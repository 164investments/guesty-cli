import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const taxes = new Command("taxes")
  .description("Manage taxes");

taxes
  .command("create")
  .description("Create a tax (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/taxes", { method: "POST", body });
    print(data);
  });

taxes
  .command("update <id>")
  .description("Update a tax (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/taxes/${id}`, { method: "PATCH", body });
    print(data);
  });

taxes
  .command("delete <id>")
  .description("Delete a tax")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/taxes/${id}`, { method: "DELETE" });
    print(data);
  });

taxes
  .command("account")
  .description("Get account taxes")
  .action(async () => {
    const data = await guestyFetch("/v1/taxes/account");
    print(data);
  });

taxes
  .command("unit-type <id>")
  .description("Get unit type taxes")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/taxes/unit-type/${id}`);
    print(data);
  });

taxes
  .command("unit-type-actual <id>")
  .description("Get actual taxes for a unit type")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/taxes/unit-type/${id}/actual`);
    print(data);
  });

taxes
  .command("level-config-update")
  .description("Create or update tax level configuration (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/taxes/level-configurations", { method: "PUT", body });
    print(data);
  });

taxes
  .command("level-config <id>")
  .description("Get tax level configuration for a unit type")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/taxes/level-configurations/unit-type/${id}`);
    print(data);
  });
