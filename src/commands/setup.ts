import { Command } from "commander";
import { ask } from "../prompt.js";
import { HOSTED_TOKEN_SERVICE_URL } from "../token-service.js";
import { createTeamOn, joinTeam } from "./team.js";

const HOSTED_NOTE =
  "Simply VRM's service stores your Guesty client ID and secret encrypted and gives the token only to " +
  "access keys your team creates. guesty team delete removes everything.\n";

export const setup = new Command("setup")
  .description("Connect this CLI to a token service so your whole team shares one Guesty token")
  .option("--hosted", "Create a team on Simply VRM's hosted token service")
  .option("--server <url>", "Create a team on your own token service")
  .option("--join <invite>", "Join a team with an invite code")
  .action(async (opts: { hosted?: boolean; server?: string; join?: string }) => {
    if (opts.join) return joinTeam(opts.join);
    if (opts.server) return createTeamOn(opts.server);
    if (opts.hosted) {
      process.stderr.write(HOSTED_NOTE);
      return createTeamOn(HOSTED_TOKEN_SERVICE_URL);
    }

    process.stderr.write(
      "Guesty allows five new tokens a day. Your team shares one through a token service, so nobody uses up the rest.\n\n" +
      "  1. Create a team on Simply VRM's hosted token service (free)\n" +
      "  2. Create a team on a token service you run yourself\n" +
      "  3. Join a team with an invite code\n\n"
    );
    const choice = await ask("Choose 1, 2 or 3: ");
    if (choice === "1") {
      process.stderr.write(HOSTED_NOTE);
      return createTeamOn(HOSTED_TOKEN_SERVICE_URL);
    }
    if (choice === "2") return createTeamOn(await ask("Your token service URL: "));
    if (choice === "3") return joinTeam(await ask("Invite code: "));
    throw new Error("Setup stopped: choose 1, 2 or 3.");
  });
