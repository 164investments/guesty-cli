import { homedir } from "node:os";
import { Command } from "commander";
import { saveSettings } from "../config.js";
import { print, printable } from "../output.js";
import { command, confirm, done, frame, info, interactive, required, secret, success, summary, task, text, warn, type Check } from "../prompt.js";
import {
  HOSTED_TOKEN_SERVICE_URL,
  TOKEN_SERVICE_KEY_ENV,
  TOKEN_SERVICE_URL_ENV,
  TokenServiceError,
  callTokenService,
  configuredService,
  invitedLink,
  isAccessKey,
  parseInvite,
  serviceUrl,
  type ServiceSettings,
} from "../token-service.js";

interface CreatedTeam {
  team: { id: string; name: string };
  admin_key: string;
  recovered?: boolean;
  beapi_error?: { message: string };
}

interface CreatedInvite {
  link: string;
  expires_at: number;
  email?: { address: string; sent: boolean; message?: string };
}

interface RedeemedInvite {
  key: string;
  label: string;
  role: string;
  team: { name: string };
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
  // Missing from services older than CLI 1.5.
  invites?: { label: string; role: string; email: string | null; expires_at: number }[];
}

const EMAIL = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;
const optionalEmail: Check = (value) =>
  !value || EMAIL.test(value) ? undefined : "Enter an email address, such as sam@example.com, or leave it blank.";

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
  return url === HOSTED_TOKEN_SERVICE_URL ? "StayKit hosted service" : url;
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

// Asks for the teammate's name and email unless the name was given, then
// creates a one-time invite, which the service emails when given an address.
async function inviteTeammate(service: ServiceSettings, given: { name?: string; email?: string; admin?: boolean }): Promise<{ name: string; link: string }> {
  const name = given.name ?? await text("Teammate's name", { placeholder: "Shown in guesty team status", check: required("Enter their name.") });
  const email = given.email ?? (given.name ? "" : await text("Their email address", { placeholder: "Leave blank to send them the link yourself", check: optionalEmail }));
  const problem = optionalEmail(email);
  if (problem) throw new Error(problem);
  const shown = printable(name);
  let invite: CreatedInvite;
  try {
    invite = await task(
      email ? `Emailing ${shown} an invite` : `Creating ${shown}'s invite`,
      (created) => created.email?.sent ? `Emailed the invite to ${printable(created.email.address)}` : `Created ${shown}'s invite`,
      "No invite was created",
      () => callTokenService<CreatedInvite>(service.url, "POST", "/v1/team/invites", {
        key: service.key,
        body: { label: name, role: given.admin ? "admin" : "member", ...(email ? { email } : {}) },
      }),
    );
  } catch (err) {
    if (err instanceof TokenServiceError && err.code === "not_found") {
      throw new Error("This token service is too old to create invites. Its admin can update it; see \"Run your own token service\" in the README.");
    }
    throw err;
  }
  const { link, command: joinCommand } = invitedLink(service.url, invite.link);
  if (email && !invite.email?.sent) {
    warn(`The invite wasn't emailed. ${printable(invite.email?.message ?? "The token service didn't say why.")} Send ${shown} the link instead.`);
  }
  summary(`Invite for ${shown}`, [
    ["Link", link],
    ["Or they run", command(joinCommand)],
    ["Expires", pacific(invite.expires_at)],
    ...(given.admin ? [["Role", "Admin"] as [string, string]] : []),
  ]);
  return { name, link };
}

// Guesty confirms the credentials before the service saves anything, so this
// uses one of the account's daily tokens; that token then serves the team.
export async function createTeamOn(url: string): Promise<void> {
  const base = serviceUrl(url);
  if (base === HOSTED_TOKEN_SERVICE_URL) {
    info(`StayKit's service stores your Guesty client ID and secret encrypted, and gives the token only to access keys your team creates. ${command("guesty team delete")} removes everything.`);
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
    ["Invite", command("guesty team invite")],
  ]);
  for (let first = true; await confirm(first ? "Invite a teammate now?" : "Invite someone else?"); first = false) {
    try {
      await inviteTeammate({ url: base, key: created.admin_key }, {});
    } catch (err) {
      // The team exists either way; a failed invite shouldn't read as a failed setup.
      warn(printable(err instanceof Error ? err.message : String(err)));
    }
  }
  done(tryIt());
}

// Invite codes from CLI 1.4 hold the key itself.
async function joinWithKey(settings: ServiceSettings): Promise<void> {
  await task("Joining your team", () => "Joined your team", "Couldn't join the team", () =>
    callTokenService(settings.url, "POST", "/v1/token", { key: settings.key, body: { token_type: "openapi" } }));
  const file = useService(settings);
  summary("You're on the team", [
    ["Service", serviceName(settings.url)],
    ["Settings", shortPath(file)],
  ]);
  done(tryIt());
}

export async function joinTeam(value: string): Promise<void> {
  const invite = parseInvite(value);
  // Joining replaces this CLI's connection, which may be an admin key.
  if (configuredService() && !await confirm("This CLI is already connected to a team. Replace that connection?")) {
    throw new Error("Nothing was changed. This CLI is still connected to its team.");
  }
  if (invite.kind === "key") return joinWithKey(invite.settings);
  const joined = await task("Joining your team", (result) => `Joined "${printable(result.team?.name ?? "your team")}"`, "Couldn't join the team", () =>
    callTokenService<RedeemedInvite>(invite.url, "POST", "/v1/join", { body: { code: invite.code } }));
  // Saved before the token check: the invite is now used, and a token the
  // team can't renew right now shouldn't cost the teammate their key.
  const file = useService({ url: invite.url, key: joined.key });
  try {
    await callTokenService(invite.url, "POST", "/v1/token", { key: joined.key, body: { token_type: "openapi" } });
  } catch (err) {
    warn(`You're on the team, but its Guesty token isn't available right now: ${printable(err instanceof Error ? err.message : String(err))}`);
  }
  summary(`You're on the "${printable(joined.team?.name ?? "")}" team`, [
    ["Service", serviceName(invite.url)],
    ["Your name", printable(String(joined.label))],
    ["Role", joined.role === "admin" ? "Admin" : "Member"],
    ["Settings", shortPath(file)],
  ]);
  done(tryIt());
}

export const team = new Command("team")
  .description("Share one Guesty token with your team through a token service");

team
  .command("join")
  .description("Join your team with the invite code or link its admin sent you (same as guesty join)")
  .argument("<invite>", "Invite code, such as ABCD-EFGH-JKLM, or invite link")
  .action(async (invite: string) => { await frame("Join a team", () => joinTeam(invite)); });

team
  .command("invite")
  .description("Invite a teammate: the service emails them a one-time invite, or you send them the link")
  .argument("[name]", "Teammate's name, used to cancel or revoke their access later. Asked for when left out, along with their email")
  .option("--email <address>", "Email the invite to this address")
  .option("--admin", "Let this teammate manage the team too")
  .action(async (name: string | undefined, opts: { email?: string; admin?: boolean }) => {
    const service = currentService();
    let link = "";
    await frame("Invite a teammate", async () => {
      const invited = await inviteTeammate(service, { name, email: opts.email, admin: opts.admin });
      link = invited.link;
      done(`It works once. To cancel it, run ${command(`guesty team revoke "${printable(invited.name)}"`)}.`);
    });
    // Printed on its own, outside the frame, so it copies cleanly.
    print(link);
  });

team
  .command("revoke")
  .description("Revoke a teammate's access key and cancel their pending invite")
  .argument("<name>", "The name the key or invite was created with")
  .action(async (name: string) => {
    const service = currentService();
    const result = await callTokenService<{ key?: boolean; invite?: boolean }>(service.url, "DELETE", `/v1/team/keys/${encodeURIComponent(name)}`, { key: service.key });
    const shown = printable(name);
    if (result.key === false) {
      success(`Cancelled ${shown}'s invite.`);
      return;
    }
    success(`Revoked ${shown}'s key${result.invite ? " and cancelled their pending invite" : ""}. A token they already have works until it expires, at most 24 hours.`);
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
      if (status.invites?.length) {
        summary("Pending invites", status.invites.map((invite) => [
          printable(invite.label),
          `${printable(invite.role)}, ${invite.email ? `emailed to ${printable(invite.email)}` : "link only"}, expires ${pacific(invite.expires_at)}`,
        ]));
      }
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
