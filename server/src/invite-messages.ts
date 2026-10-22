// The invite email and the join page. Team and inviter names are whatever an
// admin typed, so they lose control characters and are escaped in HTML.

// The newest release, by a file name that stays the same between versions.
export const INSTALL_COMMAND = "npm install -g https://github.com/164investments/guesty-cli/releases/latest/download/guesty-cli.tgz";

export interface MailEnv {
  RESEND_API_KEY?: string;
  // For example "Simply VRM <invites@example.com>", on a domain Resend has verified.
  INVITE_EMAIL_FROM?: string;
}

export interface InviteView {
  team: string;
  // Missing when the admin kept a default name such as "Admin".
  inviter?: string;
  joinCommand: string;
  link: string;
  expiresAt: number;
  host: string;
}

export function canEmail(env: MailEnv): boolean {
  return !!(env.RESEND_API_KEY && env.INVITE_EMAIL_FROM);
}

// Also drops zero-width and text-direction characters, which can disguise
// what a name says.
export function clean(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Names in an email are cut short, so a stranger can't fill it with a message.
function short(value: string, max: number): string {
  const text = clean(value);
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

export function pacific(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(ms);
}

function inviter(view: InviteView): string | undefined {
  return view.inviter && short(view.inviter, 40);
}

function headline(view: InviteView): string {
  const team = short(view.team, 60);
  return inviter(view) ? `${inviter(view)} invited you to the ${team} team` : `You're invited to the ${team} team`;
}

const INTRO = "The Guesty CLI lets you work with Guesty from your terminal: listings, reservations, calendars and more. Your team shares one Guesty API token, so you don't need your own.";

// The team name stays out of the subject, which mail apps show before anything else.
export function inviteSubject(view: InviteView): string {
  return inviter(view) ? `${inviter(view)} invited you to Guesty CLI` : "You're invited to a team on Guesty CLI";
}

export function inviteEmailText(view: InviteView): string {
  const sender = inviter(view) ?? `An admin of the ${short(view.team, 60)} team`;
  return [
    `${headline(view)} on Guesty CLI.`,
    "",
    INTRO,
    "",
    "To join:",
    "",
    "1. Install Node.js 20.12 or later from https://nodejs.org if you don't have it. To check, run: node -v",
    "2. Open Terminal (Command Prompt on Windows) and run:",
    "",
    `   ${INSTALL_COMMAND} && ${view.joinCommand}`,
    "",
    "3. Try it: guesty listings list",
    "",
    `Step-by-step page: ${view.link}`,
    "",
    `This invite works once and expires ${pacific(view.expiresAt)}.`,
    "",
    "--",
    `${sender} entered your address in the Guesty CLI. If you don't know them, you can ignore this email.`,
    `Sent by the team token service at ${view.host}.`,
  ].join("\n");
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

function emailStep(number: number, body: string): string {
  return `<tr><td style="padding:0 0 18px;vertical-align:top;width:34px"><div style="width:24px;height:24px;border-radius:12px;background:#cffafe;color:#155e75;font:600 13px/24px ${FONT};text-align:center">${number}</div></td><td style="padding:2px 0 18px;font:15px/1.55 ${FONT};color:#334155">${body}</td></tr>`;
}

export function inviteEmailHtml(view: InviteView): string {
  const sender = escape(inviter(view) ?? `An admin of the ${short(view.team, 60)} team`);
  const command = `${INSTALL_COMMAND} && ${view.joinCommand}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(inviteSubject(view))}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px">
<tr><td style="padding:32px 32px 8px">
<span style="display:inline-block;padding:4px 10px;border-radius:6px;background:#0e7490;color:#ffffff;font:600 12px/1.4 ${FONT};letter-spacing:.02em">Guesty CLI</span>
<h1 style="margin:20px 0 12px;font:700 22px/1.3 ${FONT};color:#0f172a">${escape(headline(view))}</h1>
<p style="margin:0 0 24px;font:15px/1.55 ${FONT};color:#334155">${escape(INTRO)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${emailStep(1, `Install <a href="https://nodejs.org" style="color:#0e7490">Node.js</a> 20.12 or later, if you don't have it. To check, run <code style="font:13px ${MONO};white-space:nowrap">node -v</code>.`)}
${emailStep(2, `Open Terminal (Command Prompt on Windows) and run:<div style="margin:10px 0 0;padding:12px 14px;border-radius:8px;background:#0f172a;color:#e2e8f0;font:13px/1.6 ${MONO};overflow-wrap:anywhere;word-break:break-word">${escape(command)}</div>`)}
${emailStep(3, `Try it: <code style="font:13px ${MONO};white-space:nowrap">guesty listings list</code>`)}
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 24px"><tr><td style="border-radius:8px;background:#0e7490"><a href="${escape(view.link)}" style="display:inline-block;padding:12px 20px;font:600 15px ${FONT};color:#ffffff;text-decoration:none">Open the step-by-step page</a></td></tr></table>
<p style="margin:0 0 28px;font:14px/1.5 ${FONT};color:#64748b">This invite works once and expires ${escape(pacific(view.expiresAt))}.</p>
</td></tr>
<tr><td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;font:12px/1.5 ${FONT};color:#94a3b8">${sender} entered your address in the Guesty CLI. If you don't know them, you can ignore this email.<br>Sent by the team token service at ${escape(view.host)}.</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function sendInviteEmail(env: MailEnv, to: string, view: InviteView): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.INVITE_EMAIL_FROM,
        to: [to],
        subject: inviteSubject(view),
        html: inviteEmailHtml(view),
        text: inviteEmailText(view),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    // The response can echo the address, so only the status is logged.
    if (!res.ok) console.error("guesty-token-service: invite email failed with HTTP", res.status);
    return res.ok;
  } catch {
    console.error("guesty-token-service: invite email could not be sent");
    return false;
  }
}

const PAGE_STYLE = `
*{box-sizing:border-box}
body{margin:0;background:#f1f5f9;color:#334155;font:16px/1.6 ${FONT};-webkit-font-smoothing:antialiased}
main{max-width:620px;margin:48px auto;padding:0 16px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:36px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.badge{display:inline-block;padding:4px 10px;border-radius:6px;background:#0e7490;color:#fff;font-size:12px;font-weight:600;letter-spacing:.02em}
h1{margin:20px 0 10px;color:#0f172a;font-size:26px;line-height:1.25}
p{margin:0 0 16px}
ol{list-style:none;margin:28px 0 8px;padding:0;counter-reset:step}
li{position:relative;padding:0 0 24px 44px;counter-increment:step}
li::before{content:counter(step);position:absolute;left:0;top:0;width:28px;height:28px;border-radius:14px;background:#cffafe;color:#155e75;font-size:14px;font-weight:600;line-height:28px;text-align:center}
li h2{margin:1px 0 4px;color:#0f172a;font-size:16px}
li p{margin:0 0 10px;font-size:15px}
.command{display:flex;align-items:stretch;border-radius:10px;background:#0f172a;overflow:hidden}
.command code{flex:1;min-width:0;padding:14px 16px;color:#e2e8f0;font:13.5px/1.6 ${MONO};overflow-wrap:anywhere}
.command button{flex:none;border:0;border-left:1px solid #1e293b;background:#1e293b;color:#e2e8f0;padding:0 18px;font:600 13px ${FONT};cursor:pointer}
.command button:hover{background:#334155}
code.inline{padding:2px 6px;border-radius:5px;background:#f1f5f9;color:#0f172a;font:14px ${MONO};white-space:nowrap}
a{color:#0e7490}
.note{margin:8px 0 0;padding-top:20px;border-top:1px solid #e2e8f0;color:#64748b;font-size:14px}
footer{margin:20px 4px;color:#94a3b8;font-size:13px}
@media (max-width:520px){main{margin:20px auto}.card{padding:24px 20px}h1{font-size:23px}li{padding-left:40px}.command{flex-direction:column}.command button{border-left:0;border-top:1px solid #334155;padding:11px}}
`;

function page(title: string, body: string, nonce: string, script = ""): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escape(title)}</title><style>${PAGE_STYLE}</style></head>
<body><main><div class="card"><span class="badge">Guesty CLI</span>${body}</div>
<footer>Guesty CLI is an open-source command-line tool for Guesty. <a href="https://github.com/164investments/guesty-cli#readme">About it</a></footer></main>${script ? `<script nonce="${nonce}">${script}</script>` : ""}</body></html>`;
}

const COPY_SCRIPT = `for (const button of document.querySelectorAll("button[data-copy]")) {
  button.addEventListener("click", async () => {
    const text = document.getElementById(button.dataset.copy).textContent;
    try { await navigator.clipboard.writeText(text); button.textContent = "Copied"; }
    catch { button.textContent = "Select it"; }
    setTimeout(() => { button.textContent = "Copy"; }, 2000);
  });
}`;

export function joinPage(view: InviteView, nonce: string): string {
  const command = `${INSTALL_COMMAND} && ${view.joinCommand}`;
  return page(`Join ${short(view.team, 60)} · Guesty CLI`, `
<h1>${escape(headline(view))}</h1>
<p>${escape(INTRO)}</p>
<ol>
<li><h2>Install Node.js</h2><p>You need Node.js 20.12 or later. To check, run <code class="inline">node -v</code>. If you don't have it, download it from <a href="https://nodejs.org">nodejs.org</a>.</p></li>
<li><h2>Install the Guesty CLI and join</h2><p>Open Terminal (Command Prompt on Windows) on the computer where you'll use the CLI, and run:</p><div class="command"><code id="join">${escape(command)}</code><button type="button" data-copy="join">Copy</button></div></li>
<li><h2>Try it</h2><p>Your CLI now uses the team's token.</p><div class="command"><code id="try">guesty listings list</code><button type="button" data-copy="try">Copy</button></div></li>
</ol>
<p class="note">This invite works once and expires ${escape(pacific(view.expiresAt))}. Already have Guesty CLI 1.5 or later? Run <code class="inline">${escape(view.joinCommand)}</code>.</p>`, nonce, COPY_SCRIPT);
}

export function closedInvitePage(heading: string, detail: string, nonce: string): string {
  return page(`${heading} · Guesty CLI`, `<h1>${escape(heading)}</h1><p>${escape(detail)}</p>`, nonce);
}

export function htmlResponse(html: string, status: number, nonce: string): Response {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
