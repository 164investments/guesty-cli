import { Command } from "commander";
import { getCachedToken } from "../auth.js";
import { print } from "../output.js";

export const token = new Command("token")
  .description("Print a valid cached Guesty Open API token. Use --beapi for booking-engine scope. Fails if the correct cached token is unavailable; never requests OAuth tokens.")
  .option("--beapi", "Print the cached BEAPI (booking-engine scope) token instead of Open API")
  .option("--json", "Print token metadata (token_type, access_token, expires_at) as JSON")
  .action(async (opts: { beapi?: boolean; json?: boolean }) => {
    const cachedToken = await getCachedToken(opts.beapi ? "beapi" : "openapi");
    print(opts.json ? cachedToken : cachedToken.access_token);
  });
