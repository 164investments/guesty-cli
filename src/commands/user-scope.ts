import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const userScope = new Command("user-scope")
  .description("Manage user scope assignments");

userScope
  .command("assign")
  .description("Assign user scope (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/user-scope/assign", { method: "POST", body });
    print(data);
  });

userScope
  .command("get <id>")
  .description("Get user scope by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/user-scope/${id}`);
    print(data);
  });
