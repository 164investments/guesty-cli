import { Command } from "commander";
import { saveSettings } from "../config.js";
import { print } from "../output.js";
import { ask, askRequired, confirm } from "../prompt.js";
import {
  TOKEN_SERVICE_KEY_ENV,
  TOKEN_SERVICE_URL_ENV,
  callTokenService,
  configuredService,
  decodeInvite,
  encodeInvite,
  serviceUrl,
  type ServiceSettings,
} from "../token-service.js";

interface CreatedTeam {
  team: { id: string; name: string };
  admin_key: string;
  recovered?: boolean;
  beapi_error?: { message: string };
}

function note(message: string): void {
  process.stderr.write(`${message}\n`);
}

function currentService(): ServiceSettings {
  const service = configuredService();
  if (!service) throw new Error("This CLI is not connected to a token service. Run guesty setup first.");
  return service;
}

function useService(settings: ServiceSettings): void {
  const file = saveSettings({ [TOKEN_SERVICE_URL_ENV]: settings.url, [TOKEN_SERVICE_KEY_ENV]: settings.key });
  note(`Saved to ${file}.`);
}

async function askCredentials(kind: string): Promise<{ client_id: string; client_secret: string }> {
  return {
    client_id: await askRequired(`Guesty ${kind} client ID: `),
    client_secret: await askRequired(`Guesty ${kind} client secret: `, { hidden: true }),
  };
}

// Guesty confirms the credentials before the service saves anything, so this
// uses one of the account's daily tokens; that token then serves the team.
export async function createTeamOn(url: string): Promise<void> {
  const base = serviceUrl(url);
  const name = await askRequired("Team name: ");
  const adminLabel = await ask("Your name, shown to your team's admins [Admin]: ", { fallback: "Admin" });
  note('Use an Open API key from your Guesty account. Guesty\'s help article "Using Guesty\'s Open API" shows how to create one.');
  const openapi = await askCredentials("Open API");
  const beapi = await confirm("Also add booking-engine API credentials?") ? await askCredentials("booking-engine") : undefined;
  note("Checking the credentials with Guesty...");
  const created = await callTokenService<CreatedTeam>(base, "POST", "/v1/teams", {
    body: { name, admin_label: adminLabel, credentials: { openapi, ...(beapi ? { beapi } : {}) } },
  });
  useService({ url: base, key: created.admin_key });
  if (created.recovered) {
    note(`These credentials already belong to the team "${created.team.name}". This CLI now has a new admin key for it.`);
  } else {
    note(`Team "${created.team.name}" is ready, and this CLI uses its shared token.`);
  }
  if (created.beapi_error) note(`Booking-engine credentials were not added: ${created.beapi_error.message}`);
  note('Invite a teammate with: guesty team invite "Their name"');
}

export async function joinTeam(code: string): Promise<void> {
  const settings = decodeInvite(code);
  await callTokenService(settings.url, "POST", "/v1/token", { key: settings.key, body: { token_type: "openapi" } });
  useService(settings);
  note("Joined. This CLI now uses your team's shared Guesty token.");
}

export const team = new Command("team")
  .description("Share one Guesty token with your team through a token service");

team
  .command("join")
  .description("Join a team with the invite code its admin sent you")
  .argument("<invite>", "Invite code from guesty team invite")
  .action(async (invite: string) => { await joinTeam(invite); });

team
  .command("invite")
  .description("Create an access key for a teammate and print their invite code")
  .argument("<name>", "Teammate's name, used to revoke the key later")
  .option("--admin", "Let this teammate manage the team too")
  .action(async (name: string, opts: { admin?: boolean }) => {
    const service = currentService();
    const created = await callTokenService<{ key: string }>(service.url, "POST", "/v1/team/keys", {
      key: service.key,
      body: { label: name, role: opts.admin ? "admin" : "member" },
    });
    note(`Send this invite code to ${name} privately. They run: guesty team join <code>`);
    print(encodeInvite({ url: service.url, key: created.key }));
  });

team
  .command("revoke")
  .description("Revoke a teammate's access key")
  .argument("<name>", "The name the key was created with")
  .action(async (name: string) => {
    const service = currentService();
    await callTokenService(service.url, "DELETE", `/v1/team/keys/${encodeURIComponent(name)}`, { key: service.key });
    note(`Revoked ${name}'s key. A token they already have works until it expires, at most 24 hours.`);
  });

team
  .command("status")
  .description("Show the team's tokens, recent token requests and access keys (admin)")
  .action(async () => {
    const service = currentService();
    print(await callTokenService(service.url, "GET", "/v1/team", { key: service.key }));
  });

team
  .command("refresh")
  .description("Replace a token Guesty rejected before it expired. Uses one of the day's token requests (admin)")
  .option("--beapi", "Replace the booking-engine token instead of the Open API token")
  .action(async (opts: { beapi?: boolean }) => {
    const service = currentService();
    const result = await callTokenService<{ expires_at: number }>(service.url, "POST", "/v1/team/refresh", {
      key: service.key,
      body: { token_type: opts.beapi ? "beapi" : "openapi" },
    });
    note(`New token issued; it expires ${new Date(result.expires_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} Pacific.`);
  });

team
  .command("credentials")
  .description("Add or replace the team's Guesty credentials. Guesty confirms them first (admin)")
  .option("--beapi", "Set booking-engine API credentials instead of Open API")
  .action(async (opts: { beapi?: boolean }) => {
    const service = currentService();
    const input = await askCredentials(opts.beapi ? "booking-engine" : "Open API");
    note("Checking the credentials with Guesty...");
    await callTokenService(service.url, "PUT", "/v1/team/credentials", {
      key: service.key,
      body: { token_type: opts.beapi ? "beapi" : "openapi", ...input },
    });
    note("Saved. The team now uses the new credentials.");
  });

team
  .command("limit")
  .description("Set how many token requests the team may make in any 24 hours, from 1 to 5 (admin)")
  .argument("<count>", "Requests per 24 hours")
  .action(async (count: string) => {
    const service = currentService();
    const value = Number(count);
    await callTokenService(service.url, "PATCH", "/v1/team", { key: service.key, body: { max_requests_per_day: value } });
    note(`The team may now make ${value} token requests in any 24 hours.`);
  });

team
  .command("delete")
  .description("Delete the team, its stored Guesty credentials and every access key (admin)")
  .option("--yes", "Confirm without asking")
  .action(async (opts: { yes?: boolean }) => {
    const service = currentService();
    if (!opts.yes && !await confirm("Delete this team and its stored Guesty credentials for everyone?")) {
      note("Nothing was deleted.");
      return;
    }
    await callTokenService(service.url, "DELETE", "/v1/team", { key: service.key });
    saveSettings({ [TOKEN_SERVICE_URL_ENV]: null, [TOKEN_SERVICE_KEY_ENV]: null });
    note("Deleted the team and removed this CLI's token-service settings.");
  });
