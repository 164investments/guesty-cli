import { Command } from "commander";
import { choose, frame, info, parses, text } from "../prompt.js";
import { HOSTED_TOKEN_SERVICE_URL, parseInvite, serviceUrl } from "../token-service.js";
import { createTeamOn, joinTeam } from "./team.js";

export const setup = new Command("setup")
  .description("Connect this CLI to a token service so your whole team shares one Guesty token")
  .option("--hosted", "Create a team on StayKit's hosted token service")
  .option("--server <url>", "Create a team on your own token service")
  .option("--join <invite>", "Join a team with an invite code or link")
  .action(async (opts: { hosted?: boolean; server?: string; join?: string }) => {
    await frame("Team setup", async () => {
      if (opts.join) return joinTeam(opts.join);
      if (opts.server) return createTeamOn(opts.server);
      if (opts.hosted) return createTeamOn(HOSTED_TOKEN_SERVICE_URL);

      info("Guesty allows five new tokens a day. Your team shares one through a token service, so nobody uses up the rest.");
      const choice = await choose("How do you want to connect?", [
        { value: "hosted", label: "Create a team on StayKit's hosted token service", hint: "free" },
        { value: "server", label: "Create a team on a token service you run yourself" },
        { value: "join", label: "Join a team with an invite code or link" },
      ]);
      if (choice === "hosted") return createTeamOn(HOSTED_TOKEN_SERVICE_URL);
      if (choice === "server") {
        return createTeamOn(await text("Token service URL", { placeholder: "https://", check: parses(serviceUrl) }));
      }
      return joinTeam(await text("Invite code or link", { placeholder: "ABCD-EFGH-JKLM", check: parses(parseInvite) }));
    });
  });
