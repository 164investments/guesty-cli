import { keyedHash, newAccessKey, type ServiceKeys } from "./crypto.js";
import { HttpError, json, readBody, requiredText } from "./http.js";
import { canEmail, clean, closedInvitePage, htmlResponse, joinPage, pacific, sendInviteEmail, type InviteView, type MailEnv } from "./invite-messages.js";

export interface InviteEnv extends MailEnv {
  DB: D1Database;
  // The address invite links use, for a service that answers on more than one.
  PUBLIC_URL?: string;
}

export interface Inviter {
  teamId: string;
  teamName: string;
  label: string;
  keyHash: string;
}

// The CLI's default service, so its invite codes work without a URL.
const HOSTED_ORIGIN = "https://guesty-tokens.staykit.ai";
const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
const INVITE_LIFETIME_MS = 7 * DAY_MS;
const INVITES_PER_TEAM_PER_DAY = 50;
const EMAILS_PER_TEAM_PER_DAY = 20;
const EMAILS_PER_ADDRESS_PER_DAY = 3;
// Every team together, so the service can't be used to send mail in bulk.
const EMAILS_PER_SERVICE_PER_DAY = 200;
const JOIN_FAILURES_PER_HOUR = 10;
// Crockford's base 32 has no I, L, O or U, so a code read aloud is unambiguous.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
// Names setup gives an admin who didn't type one; an invite doesn't show them.
const DEFAULT_NAMES = /^(admin|recovered admin [0-9a-f]{8})$/i;

interface InviteRow {
  code_hash: string;
  team_id: string;
  team_name: string;
  label: string;
  role: "admin" | "member";
  invited_by: string;
  expires_at: number;
  closed_at: number | null;
  redeemed_key_hash: string | null;
}

// Twelve characters of five random bits each: 60 bits.
function newCode(): string {
  return [...crypto.getRandomValues(new Uint8Array(12))].map((byte) => ALPHABET[byte & 31]).join("");
}

function displayCode(code: string): string {
  return code.match(/.{4}/g)!.join("-");
}

// Any case, with or without dashes, and with the letters people mistake for digits.
function normalizeCode(value: string): string | undefined {
  const code = value.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return /^[0-9A-HJKMNP-TV-Z]{12}$/.test(code) ? code : undefined;
}

function emailInput(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const email = typeof value === "string" ? value.trim() : "";
  if (email.length > 254 || !/^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/.test(email)) {
    throw new HttpError(400, "invalid_email", "email must be an email address, such as sam@example.com.");
  }
  return email;
}

// Mail servers deliver plus-tagged addresses to the same inbox, and Gmail
// ignores dots, so the per-address cap counts those as one address.
function addressKey(email: string): string {
  const at = email.lastIndexOf("@");
  let local = email.slice(0, at).toLowerCase().split("+")[0];
  let domain = email.slice(at + 1).toLowerCase();
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

// One IPv6 user usually controls a whole /64, so it counts as one address.
function clientAddress(request: Request): string {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (!ip.includes(":")) return ip;
  const [head, tail] = ip.toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right];
  return `${groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

function inviterName(label: string): string | undefined {
  return DEFAULT_NAMES.test(label) ? undefined : label;
}

function inviteView(request: Request, env: InviteEnv, code: string, team: string, invitedBy: string, expiresAt: number): InviteView {
  const { origin, host } = new URL(env.PUBLIC_URL ?? request.url);
  const link = `${origin}/join/${displayCode(code)}`;
  return {
    team,
    inviter: inviterName(invitedBy),
    joinCommand: `guesty join ${origin === HOSTED_ORIGIN ? displayCode(code) : link}`,
    link,
    expiresAt,
    host,
  };
}

async function count(env: InviteEnv, query: string, ...params: unknown[]): Promise<number> {
  return (await env.DB.prepare(query).bind(...params).first<{ n: number }>())?.n ?? 0;
}

async function findInvite(env: InviteEnv, keys: ServiceKeys, code: string): Promise<InviteRow | null> {
  return env.DB.prepare(
    `SELECT i.code_hash, i.team_id, t.name AS team_name, i.label, i.role, i.invited_by, i.expires_at, i.closed_at, i.redeemed_key_hash
     FROM invites i JOIN teams t ON t.id = i.team_id WHERE i.code_hash = ?`
  ).bind(await keyedHash(keys, `invite:${code}`)).first<InviteRow>();
}

function closedReason(invite: InviteRow, now: number): string | undefined {
  const who = clean(inviterName(invite.invited_by) ?? "your team's admin");
  if (invite.redeemed_key_hash) return `This invite was already used. If that wasn't you, ask ${who} for a new one.`;
  if (invite.closed_at) return `This invite was cancelled. Ask ${who} for a new one.`;
  if (invite.expires_at <= now) return `This invite expired ${pacific(invite.expires_at)}. Ask ${who} for a new one.`;
  return undefined;
}

// Opening the link or redeeming the code doesn't need a key, so wrong codes
// count against the caller's address. Each lookup is recorded before the
// count, so a burst of requests can't all pass it; a real code's is removed.
async function lookUp(request: Request, env: InviteEnv, keys: ServiceKeys, value: string): Promise<{ invite?: InviteRow; limited?: true }> {
  const now = Date.now();
  const client = await keyedHash(keys, `ip:${clientAddress(request)}`);
  const [recorded] = await env.DB.batch<{ rowid: number }>([
    env.DB.prepare("INSERT INTO join_failures (client_hash, failed_at) VALUES (?, ?) RETURNING rowid").bind(client, now),
    env.DB.prepare("DELETE FROM join_failures WHERE failed_at < ?").bind(now - HOUR_MS),
  ]);
  if (await count(env, "SELECT COUNT(*) AS n FROM join_failures WHERE client_hash = ? AND failed_at > ?", client, now - HOUR_MS) > JOIN_FAILURES_PER_HOUR) {
    return { limited: true };
  }
  const code = normalizeCode(value);
  const invite = code ? await findInvite(env, keys, code) : null;
  if (invite) await env.DB.prepare("DELETE FROM join_failures WHERE rowid = ?").bind(recorded.results[0].rowid).run();
  return { invite: invite ?? undefined };
}

// Takes one of the day's email slots in a single statement, so requests at
// the same moment can't all pass the caps. Returns why, when none is left.
async function reserveEmail(env: InviteEnv, sender: string, address: string, now: number): Promise<string | undefined> {
  const since = now - DAY_MS;
  const reserved = await env.DB.prepare(
    `INSERT INTO invite_emails (sender, address, sent_at) SELECT ?, ?, ?
     WHERE (SELECT COUNT(*) FROM invite_emails WHERE sender = ? AND sent_at > ?) < ?
       AND (SELECT COUNT(*) FROM invite_emails WHERE address = ? AND sent_at > ?) < ?
       AND (SELECT COUNT(*) FROM invite_emails WHERE sent_at > ?) < ?`
  ).bind(sender, address, now, sender, since, EMAILS_PER_TEAM_PER_DAY, address, since, EMAILS_PER_ADDRESS_PER_DAY, since, EMAILS_PER_SERVICE_PER_DAY).run();
  if (reserved.meta.changes === 1) return undefined;
  if (await count(env, "SELECT COUNT(*) AS n FROM invite_emails WHERE sender = ? AND sent_at > ?", sender, since) >= EMAILS_PER_TEAM_PER_DAY) {
    return `This team emailed ${EMAILS_PER_TEAM_PER_DAY} invites in the last 24 hours, the most allowed.`;
  }
  if (await count(env, "SELECT COUNT(*) AS n FROM invite_emails WHERE address = ? AND sent_at > ?", address, since) >= EMAILS_PER_ADDRESS_PER_DAY) {
    return `That address got ${EMAILS_PER_ADDRESS_PER_DAY} invite emails in the last 24 hours, the most allowed.`;
  }
  return "This token service sent as many invite emails today as it allows.";
}

export async function createInvite(request: Request, env: InviteEnv, keys: ServiceKeys, caller: Inviter): Promise<Response> {
  const body = await readBody(request);
  const label = requiredText(body, "label", 100);
  const role = body.role ?? "member";
  if (role !== "admin" && role !== "member") throw new HttpError(400, "invalid_request", "role must be admin or member.");
  const email = emailInput(body.email);
  const now = Date.now();
  if (await count(env, "SELECT COUNT(*) AS n FROM access_keys WHERE team_id = ? AND label = ? AND revoked_at IS NULL", caller.teamId, label)) {
    throw new HttpError(409, "label_in_use", `${label} already has a key on this team. Revoke it first or pick another name.`);
  }
  const code = newCode();
  const codeHash = await keyedHash(keys, `invite:${code}`);
  const expiresAt = now + INVITE_LIFETIME_MS;
  const [created] = await env.DB.batch([
    // Counted in the same statement, so invites created at once can't pass the cap.
    env.DB.prepare(
      `INSERT INTO invites (code_hash, team_id, label, role, invited_by, invited_by_key, created_at, expires_at)
       SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM invites WHERE team_id = ? AND created_at > ?) < ?`
    ).bind(codeHash, caller.teamId, label, role, caller.label, caller.keyHash, now, expiresAt, caller.teamId, now - DAY_MS, INVITES_PER_TEAM_PER_DAY),
    // A new invite for the same name replaces one that's still pending.
    env.DB.prepare("UPDATE invites SET closed_at = ?, email = NULL WHERE team_id = ? AND label = ? AND closed_at IS NULL AND code_hash != ? AND EXISTS (SELECT 1 FROM invites WHERE code_hash = ?)")
      .bind(now, caller.teamId, label, codeHash, codeHash),
    // Housekeeping for the whole service: addresses of expired invites,
    // invites a month past expiry, and email records past the caps' window.
    env.DB.prepare("UPDATE invites SET email = NULL WHERE email IS NOT NULL AND expires_at < ?").bind(now),
    env.DB.prepare("DELETE FROM invites WHERE expires_at < ?").bind(now - 30 * DAY_MS),
    env.DB.prepare("DELETE FROM invite_emails WHERE sent_at < ?").bind(now - DAY_MS),
  ]);
  if (created.meta.changes !== 1) {
    throw new HttpError(429, "too_many_invites", `This team created ${INVITES_PER_TEAM_PER_DAY} invites in the last 24 hours, the most allowed. Try again tomorrow.`);
  }
  const view = inviteView(request, env, code, caller.teamName, caller.label, expiresAt);

  let emailed: { address: string; sent: boolean; message?: string } | undefined;
  if (email) {
    let unsent: string | undefined;
    if (!canEmail(env)) {
      unsent = "This token service isn't set up to send email.";
    } else {
      const credential = await env.DB.prepare("SELECT fingerprint FROM credentials WHERE team_id = ? AND token_type = 'openapi'")
        .bind(caller.teamId)
        .first<{ fingerprint: string }>();
      // A failed send keeps its slot, so retries count too.
      unsent = await reserveEmail(env, credential?.fingerprint ?? `team:${caller.teamId}`, await keyedHash(keys, `email:${addressKey(email)}`), now)
        ?? (await sendInviteEmail(env, email, view) ? undefined : "The email service didn't accept the message.");
    }
    if (!unsent) await env.DB.prepare("UPDATE invites SET email = ? WHERE code_hash = ?").bind(email, codeHash).run();
    emailed = { address: email, sent: !unsent, ...(unsent ? { message: unsent } : {}) };
  }
  return json({
    label,
    role,
    code: displayCode(code),
    link: view.link,
    join_command: view.joinCommand,
    expires_at: expiresAt,
    ...(emailed ? { email: emailed } : {}),
  }, 201);
}

export async function redeemInvite(request: Request, env: InviteEnv, keys: ServiceKeys): Promise<Response> {
  const body = await readBody(request);
  const { invite, limited } = await lookUp(request, env, keys, typeof body.code === "string" ? body.code : "");
  if (limited) throw new HttpError(429, "too_many_attempts", "Too many wrong invite codes came from this address in the last hour. Try again later.", Date.now() + HOUR_MS);
  if (!invite) throw new HttpError(404, "invite_not_found", "That invite code isn't valid. Check it, or ask your team's admin for a new invite.");
  const now = Date.now();
  const closed = closedReason(invite, now);
  if (closed) throw new HttpError(410, "invite_closed", closed);

  // One batch, so the invite is used only if its key is created.
  const key = newAccessKey();
  const keyHash = await keyedHash(keys, `access:${key}`);
  let results: D1Result[];
  try {
    results = await env.DB.batch([
      env.DB.prepare("UPDATE invites SET closed_at = ?, redeemed_key_hash = ?, email = NULL WHERE code_hash = ? AND closed_at IS NULL AND expires_at > ?")
        .bind(now, keyHash, invite.code_hash, now),
      env.DB.prepare("INSERT INTO access_keys (key_hash, team_id, label, role, created_at) SELECT redeemed_key_hash, team_id, label, role, ? FROM invites WHERE code_hash = ? AND redeemed_key_hash = ?")
        .bind(now, invite.code_hash, keyHash),
    ]);
  } catch (error) {
    if (error instanceof Error && /UNIQUE/.test(error.message)) {
      throw new HttpError(409, "label_in_use", `Someone on this team already has a key named ${clean(invite.label)}. Ask your team's admin for a new invite.`);
    }
    throw error;
  }
  if (results[1].meta.changes !== 1) throw new HttpError(410, "invite_closed", "This invite was just used. Ask your team's admin for a new one.");
  return json({ key, label: invite.label, role: invite.role, team: { name: invite.team_name }, invited_by: invite.invited_by }, 201);
}

// Shows the steps without using the invite, so a mail scanner that opens the
// link can't spend it.
export async function invitePage(request: Request, env: InviteEnv, keys: ServiceKeys, rawCode: string): Promise<Response> {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  let value = "";
  try {
    value = decodeURIComponent(rawCode);
  } catch {
    // An undecodable code is just an unknown one.
  }
  const { invite, limited } = await lookUp(request, env, keys, value);
  if (limited) {
    return htmlResponse(closedInvitePage("Too many attempts", "Too many invalid invite links were opened from this address in the last hour. Try again later.", nonce), 429, nonce);
  }
  if (!invite) {
    return htmlResponse(closedInvitePage("This invite link isn't valid", "Check that the whole link was copied, or ask your team's admin for a new invite.", nonce), 404, nonce);
  }
  const closed = closedReason(invite, Date.now());
  if (closed) return htmlResponse(closedInvitePage("This invite can't be used", closed, nonce), 410, nonce);
  const code = normalizeCode(value)!;
  return htmlResponse(joinPage(inviteView(request, env, code, invite.team_name, invite.invited_by, invite.expires_at), nonce), 200, nonce);
}

export async function pendingInvites(env: InviteEnv, teamId: string): Promise<unknown[]> {
  return (await env.DB.prepare(
    "SELECT label, role, email, invited_by, created_at, expires_at FROM invites WHERE team_id = ? AND closed_at IS NULL AND expires_at > ? ORDER BY created_at"
  ).bind(teamId, Date.now()).all()).results;
}

// Revoking a key also cancels the invites it created, so a leaked admin key
// can't leave an invite behind to get back in.
export function closeInvitesFrom(env: InviteEnv, keyHash: string, now: number): D1PreparedStatement {
  return env.DB.prepare("UPDATE invites SET closed_at = ?, email = NULL WHERE invited_by_key = ? AND closed_at IS NULL").bind(now, keyHash);
}

export async function cancelInvite(env: InviteEnv, teamId: string, label: string): Promise<boolean> {
  const now = Date.now();
  const result = await env.DB.prepare("UPDATE invites SET closed_at = ?, email = NULL WHERE team_id = ? AND label = ? AND closed_at IS NULL AND expires_at > ?")
    .bind(now, teamId, label, now)
    .run();
  return result.meta.changes > 0;
}
