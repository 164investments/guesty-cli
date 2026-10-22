import { homedir } from "node:os";
import { Command } from "commander";
import { saveSettings } from "../config.js";
import { print, printable } from "../output.js";
import { command, confirm, done, frame, info, interactive, required, secret, success, summary, task, text, warn } from "../prompt.js";
import {
  HOSTED_TOKEN_SERVICE_URL,
  TOKEN_SERVICE_KEY_ENV,
  TOKEN_SERVICE_URL_ENV,
  callTokenService,
  configuredService,
  decodeInvite,
  encodeInvite,
  isAccessKey,
  serviceUrl,
  type ServiceSettings,
} from "../token-service.js";

interface CreatedTeam {
  team: { id: string; name: string };
  admin_key: string;
  recovered?: boolean;
  beapi_error?: { message: string };
}

interface TeamStatus {
  team: { name: string; max_requests_per_day: number };
  token_types: {
    token_type: "openapi" | "beapi";
    configured: boolean;
    token_expires_at: number | null;
    requests_last_24h: number;
    last_request: { requested_at: number; outcome: string; http_status: number | null } | null;
  }[];
  keys: { label: string; role: string; last_used_at: number | null; revoked_at: number | null }[];
}

function tryIt(): string {
  return `This CLI now uses your team's shared Guesty token. Try it: ${command("guesty listings list")}`;
}

function currentService(): ServiceSettings {
  const service = configuredService();
  if (!service) throw new Error("This CLI is not connected to a token service. Run guesty setup first.");
  return service;
}

function useService(settings: ServiceSettings): string {
  // The key comes from the service, which may be someone else's server.
  if (!isAccessKey(settings.key)) throw new Error("The token service returned an invalid access key. Nothing was saved.");
  return saveSettings({ [TOKEN_SERVICE_URL_ENV]: settings.url, [TOKEN_SERVICE_KEY_ENV]: settings.key });
}

function serviceName(url: string): string {
  return url === HOSTED_TOKEN_SERVICE_URL ? "Simply VRM hosted service" : url;
}

function shortPath(file: string): string {
  const home = homedir();
  return file.startsWith(`${home}/`) ? `~${file.slice(home.length)}` : file;
}

function pacific(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}

async function askCredentials(kind: string): Promise<{ client_id: string; client_secret: string }> {
  return {
    client_id: await text(`Guesty ${kind} client ID`, { check: required("Paste the client ID.") }),
    client_secret: await secret(`Guesty ${kind} client secret`, required("Paste the client secret.")),
  };
}

// Guesty confirms the credentials before the service saves anything, so this
// uses one of the account's daily tokens; that token then serves the team.
export async function createTeamOn(url: string): Promise<void> {
  const base = serviceUrl(url);
  if (base === HOSTED_TOKEN_SERVICE_URL) {
    info(`Simply VRM's service stores your Guesty client ID and secret encrypted, and gives the token only to access keys your team creates. ${command("guesty team delete")} removes everything.`);
  }
  const name = await text("Team name", { placeholder: "Your company's name", check: required("Enter a team name.") });
  const adminLabel = await text("Your name", { placeholder: "Shown to your team's admins", fallback: "Admin" });
  info('Next, your Guesty Open API key. Guesty\'s help article "Using Guesty\'s Open API" shows how to create one.');
  const openapi = await askCredentials("Open API");
  const beapi = await confirm("Add booking engine API credentials too?") ? await askCredentials("booking engine") : undefined;
  const created = await task(
    "Checking your credentials with Guesty",
    () => "Guesty accepted your credentials",
    "Setup stopped",
    () => callTokenService<CreatedTeam>(base, "POST", "/v1/teams", {
      body: { name, admin_label: adminLabel, credentials: { openapi, ...(beapi ? { beapi } : {}) } },
    }),
  );
  const file = useService({ url: base, key: created.admin_key });
  const teamName = printable(created.team.name);
  if (created.recovered) {
    info(`These credentials already belong to the team "${teamName}". This CLI now has a new admin key for it.`);
  }
  if (created.beapi_error) warn(`Booking engine credentials were not added: ${printable(created.beapi_error.message)}`);
  summary(created.recovered ? `Reconnected to "${teamName}"` : `Team "${teamName}" is ready`, [
    ["Service", serviceName(base)],
    ["Your role", "Admin"],
    ["Settings", shortPath(file)],
    ["Invite", command('guesty team invite "Their name"')],
  ]);
  done(tryIt());
}

export async function joinTeam(code: string): Promise<void> {
  const settings = decodeInvite(code);
  await task("Joining your team", () => "Joined your team", "Couldn't join the team", () =>
    callTokenService(settings.url, "POST", "/v1/token", { key: settings.key, body: { token_type: "openapi" } }));
  const file = useService(settings);
  summary("You're on the team", [
    ["Service", serviceName(settings.url)],
    ["Settings", shortPath(file)],
  ]);
  done(tryIt());
}

export const team = new Command("team")
  .description("Share one Guesty token with your team through a token service");

team
  .command("join")
  .description("Join a team with the invite code its admin sent you")
  .argument("<invite>", "Invite code from guesty team invite")
  .action(async (invite: string) => { await frame("Join a team", () => joinTeam(invite)); });

team
  .command("invite")
  .description("Create an access key for a teammate and print their invite code")
  .argument("<name>", "Teammate's name, used to revoke the key later")
  .option("--admin", "Let this teammate manage the team too")
  .action(async (name: string, opts: { admin?: boolean }) => {
    const service = currentService();
    let code = "";
    await frame("Invite a teammate", async () => {
      const created = await task(`Creating an access key for ${name}`, () => `Created ${name}'s access key`, "Couldn't create the key", () =>
        callTokenService<{ key: string }>(service.url, "POST", "/v1/team/keys", {
          key: service.key,
          body: { label: name, role: opts.admin ? "admin" : "member" },
        }));
      if (!isAccessKey(created.key)) throw new Error("The token service returned an invalid access key.");
      code = encodeInvite({ url: service.url, key: created.key });
      info(`Send ${name} this code privately. They run ${command("guesty setup")} and choose "Join a team with an invite code", or run ${command("guesty team join <code>")}.`);
      done(`Invite code for ${name}:`);
    });
    // Printed on its own, outside the frame, so it copies cleanly.
    print(code);
  });

team
  .command("revoke")
  .description("Revoke a teammate's access key")
  .argument("<name>", "The name the key was created with")
  .action(async (name: string) => {
    const service = currentService();
    await callTokenService(service.url, "DELETE", `/v1/team/keys/${encodeURIComponent(name)}`, { key: service.key });
    success(`Revoked ${name}'s key. A token they already have works until it expires, at most 24 hours.`);
  });

team
  .command("status")
  .description("Show the team's tokens, recent token requests and access keys (admin)")
  .action(async () => {
    const service = currentService();
    const status = await callTokenService<TeamStatus>(service.url, "GET", "/v1/team", { key: service.key });
    if (!interactive() || !process.stdout.isTTY) {
      print(status);
      return;
    }
    await frame(`Team "${printable(status.team.name)}"`, async () => {
      for (const type of status.token_types) {
        const title = type.token_type === "openapi" ? "Open API" : "Booking engine";
        if (!type.configured) {
          summary(title, [["Status", `Not set up. Add it with ${command(`guesty team credentials${type.token_type === "beapi" ? " --beapi" : ""}`)}`]]);
          continue;
        }
        const last = type.last_request;
        summary(title, [
          ["Token", type.token_expires_at && type.token_expires_at > Date.now()
            ? `Valid until ${pacific(type.token_expires_at)}`
            : "None yet. The next request gets one"],
          ["Requests", `${type.requests_last_24h} of Guesty's 5 in the last 24 hours`],
          ["Last request", last ? `${printable(last.outcome)}${last.http_status ? ` (HTTP ${last.http_status})` : ""}, ${pacific(last.requested_at)}` : "None in the last 24 hours"],
        ]);
      }
      summary("Access keys", status.keys.map((key) => [
        printable(key.label),
        `${printable(key.role)}, ${key.revoked_at ? "revoked" : key.last_used_at ? `last used ${pacific(key.last_used_at)}` : "never used"}`,
      ]));
      done(`The team may make ${status.team.max_requests_per_day} token requests a day. Change it with ${command("guesty team limit <1-5>")}.`);
    });
  });

team
  .command("refresh")
  .description("Replace a token Guesty rejected before it expired. Uses one of the day's token requests (admin)")
  .option("--beapi", "Replace the booking-engine token instead of the Open API token")
  .action(async (opts: { beapi?: boolean }) => {
    const service = currentService();
    await task("Asking the token service for a new token", (result) => `New token issued. It expires ${pacific(result.expires_at)}.`, "No new token was issued", () =>
      callTokenService<{ expires_at: number }>(service.url, "POST", "/v1/team/refresh", {
        key: service.key,
        body: { token_type: opts.beapi ? "beapi" : "openapi" },
      }));
  });

team
  .command("credentials")
  .description("Add or replace the team's Guesty credentials. Guesty confirms them first (admin)")
  .option("--beapi", "Set booking-engine API credentials instead of Open API")
  .action(async (opts: { beapi?: boolean }) => {
    const service = currentService();
    await frame("Update Guesty credentials", async () => {
      const input = await askCredentials(opts.beapi ? "booking engine" : "Open API");
      await task("Checking the credentials with Guesty", () => "Guesty accepted the credentials", "Nothing was changed", () =>
        callTokenService(service.url, "PUT", "/v1/team/credentials", {
          key: service.key,
          body: { token_type: opts.beapi ? "beapi" : "openapi", ...input },
        }));
      done("Saved. The team now uses the new credentials.");
    });
  });

team
  .command("limit")
  .description("Set how many token requests the team may make in any 24 hours, from 1 to 5 (admin)")
  .argument("<count>", "Requests per 24 hours")
  .action(async (count: string) => {
    const service = currentService();
    const value = Number(count);
    await callTokenService(service.url, "PATCH", "/v1/team", { key: service.key, body: { max_requests_per_day: value } });
    success(`The team may now make ${value} token requests in any 24 hours.`);
  });

team
  .command("delete")
  .description("Delete the team, its stored Guesty credentials and every access key (admin)")
  .option("--yes", "Confirm without asking")
  .action(async (opts: { yes?: boolean }) => {
    const service = currentService();
    await frame("Delete the team", async () => {
      if (!opts.yes && !await confirm("Delete this team and its stored Guesty credentials for everyone?")) {
        done("Nothing was deleted.");
        return;
      }
      await task("Deleting the team", () => "Deleted the team", "Nothing was deleted", () =>
        callTokenService(service.url, "DELETE", "/v1/team", { key: service.key }));
      saveSettings({ [TOKEN_SERVICE_URL_ENV]: null, [TOKEN_SERVICE_KEY_ENV]: null });
      done("Deleted the team and removed this CLI's token-service settings.");
    });
  });
