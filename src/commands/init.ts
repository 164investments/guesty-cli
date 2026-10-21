import { Command } from "commander";
import { readFileSync } from "node:fs";

const TEAM_SQL = new URL("../../sql/team-token-cache.sql", import.meta.url);

export const init = new Command("init")
  .description("Show setup instructions for read-only access to cached Guesty tokens")
  .option("--force", "Show setup instructions; existing files are preserved")
  .option("--team-sql", "Print the SQL that sets up a team token cache in your team's Supabase project")
  .action((opts: { teamSql?: boolean }) => {
    if (opts.teamSql) {
      process.stdout.write(readFileSync(TEAM_SQL, "utf8"));
      return;
    }
    process.stdout.write(
      "Guesty CLI uses existing cached tokens only.\n\n" +
      "Team token cache (one token shared by everyone on your team):\n" +
      "  Set GUESTY_TEAM_CACHE_URL, GUESTY_TEAM_CACHE_API_KEY and GUESTY_TEAM_CACHE_ACCESS_KEY " +
      "in your shell or ~/.guesty-cli/.env. Your team's admin gives you these values.\n" +
      "  Admins: run guesty init --team-sql to print the setup SQL for your team's Supabase project.\n\n" +
      "Server-managed cache:\n" +
      "  Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell or " +
      "~/.guesty-cli/.env using your approved secret source.\n" +
      "  The shared guesty_tokens cache must contain a valid token_type=openapi " +
      "row for Open API commands, or token_type=beapi for guesty token --beapi.\n\n" +
      "Token refresh belongs to the team cache's scheduled job or the designated server workflow. " +
      "This command does not request tokens, verify OAuth credentials, or write configuration.\n"
    );
  });
