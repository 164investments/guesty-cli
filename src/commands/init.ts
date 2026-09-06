import { Command } from "commander";

export const init = new Command("init")
  .description("Show setup instructions for read-only access to cached Guesty tokens")
  .option("--force", "Show setup instructions; existing files are preserved")
  .action(() => {
    process.stdout.write(
      "Guesty CLI uses existing cached tokens only.\n\n" +
      "Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell or " +
      "~/.guesty-cli/.env using your approved secret source.\n" +
      "The shared guesty_tokens cache must contain a valid token_type=openapi " +
      "row for Open API commands, or token_type=beapi for guesty token --beapi.\n\n" +
      "Token refresh belongs to the designated server workflow. This command " +
      "does not request tokens, verify OAuth credentials, or write configuration.\n"
    );
  });
