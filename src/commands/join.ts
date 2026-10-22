import { Command } from "commander";
import { frame } from "../prompt.js";
import { joinTeam } from "./team.js";

export const join = new Command("join")
  .description("Join your team with the invite code or link its admin sent you")
  .argument("<invite>", "Invite code, such as ABCD-EFGH-JKLM, or invite link")
  .action(async (invite: string) => { await frame("Join a team", () => joinTeam(invite)); });
