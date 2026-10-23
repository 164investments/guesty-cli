import { Command } from "commander";
import { serveMcp } from "../mcp/server.js";
import { CLIENTS, SERVER_NAME, detectClients, installClient, launchCommand, parseClients, type Client } from "../mcp/install.js";
import { print } from "../output.js";
import { chooseMany, command, done, frame, info, interactive, success, warn } from "../prompt.js";
import { configuredService } from "../token-service.js";

export const mcp = new Command("mcp")
  .description("Run an MCP server so AI agents (Claude, Codex, Cursor) can search and call every Guesty operation with your team's shared token")
  .option("--read-only", "Refuse every operation that changes data (also GUESTY_MCP_READ_ONLY=1)")
  .action(async (opts: { readOnly?: boolean }) => {
    await serveMcp({ readOnly: opts.readOnly === true || process.env.GUESTY_MCP_READ_ONLY === "1" });
  });

mcp
  .command("install")
  .description("Add the Guesty MCP server to Claude Code, Codex, Cursor or Claude Desktop on this computer")
  .option("--client <apps>", `Apps to add it to, separated by commas: ${CLIENTS.map((client) => client.value).join(", ")}`)
  .option("--all", "Add it to every supported app found on this computer")
  .option("--read-only", "Install it so it refuses every operation that changes data")
  .option("--print", "Print the server settings to add by hand, and change nothing")
  .action(async (opts: { client?: string; all?: boolean; readOnly?: boolean; print?: boolean }, install: Command) => {
    // "guesty mcp install --read-only" can land on either command, since both have the option.
    const readOnly = opts.readOnly === true || install.parent?.opts().readOnly === true;
    const launch = launchCommand(readOnly);
    if (opts.print) {
      print({ mcpServers: { [SERVER_NAME]: { command: launch.command, args: launch.args } } });
      return;
    }
    const found = detectClients();
    let clients: Client[];
    if (opts.client) clients = parseClients(opts.client);
    else if (opts.all) {
      if (!found.length) throw new Error(`No supported app was found. Use --client with ${CLIENTS.map((client) => client.value).join(", ")}, or --print.`);
      clients = found;
    } else if (interactive()) {
      clients = [];
    } else {
      throw new Error(`Choose where to add it with --client (${CLIENTS.map((client) => client.value).join(", ")}) or --all.` +
        (found.length ? ` Found on this computer: ${found.join(", ")}.` : ""));
    }
    await frame("Add Guesty to your AI apps", async () => {
      if (!clients.length) {
        const options = CLIENTS.map((client) => ({ ...client, hint: found.includes(client.value) ? "found" : client.hint }));
        clients = await chooseMany("Which apps should get the Guesty tools?", options, found);
      }
      let failed = 0;
      for (const client of clients) {
        const result = installClient(client, launch);
        if (result.ok) success(result.message);
        else {
          failed++;
          warn(`${CLIENTS.find((entry) => entry.value === client)?.label}: ${result.message}`);
        }
      }
      if (!configuredService() && !process.env.SUPABASE_URL) {
        warn(`This CLI isn't connected to a team yet, so the tools can't reach Guesty. Run ${command("guesty setup")}, or ${command("guesty join <invite link>")}, first.`);
      }
      if (readOnly) info("Installed read-only: the tools refuse every operation that changes data.");
      if (failed) process.exitCode = 1;
      done(failed === clients.length ? "Nothing was added." : "Ask your agent something like: \"Using Guesty, which reservations check in this week?\"");
    });
  });
