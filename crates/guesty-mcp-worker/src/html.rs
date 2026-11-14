//! The landing page, the sign-in (consent) page and error pages. Every value from an app, a
//! request or the token service is escaped; the pages have no scripts.

/// Escapes text for an HTML element or a quoted attribute.
pub fn escape(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    for ch in value.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(ch),
        }
    }
    out
}

/// The Content-Security-Policy for a page: nothing loads but its own nonce'd style, it can't be
/// framed, and its form may post only to this Worker and, for the sign-in page, where the app's
/// redirect lands (browsers apply form-action to the redirect after the post): its origin, or
/// its private-use scheme (`cursor:`), from [`crate::oauth::form_action_source`].
pub fn csp(nonce: &str, redirect_source: Option<&str>) -> String {
    let form_action = match redirect_source {
        Some(source) => format!("'self' {source}"),
        None => "'self'".to_string(),
    };
    format!(
        "default-src 'none'; style-src 'nonce-{nonce}'; img-src 'none'; form-action {form_action}; frame-ancestors 'none'; base-uri 'none'"
    )
}

const STYLE: &str = "\
:root{color-scheme:light dark;--bg:#f7f7f5;--fg:#1b1b1a;--muted:#5f5f5a;--card:#fff;--line:#d9d9d4;--accent:#1f5eff;--warn:#8a4b00;--warnbg:#fff4e0}\
@media (prefers-color-scheme:dark){:root{--bg:#141413;--fg:#eeeeea;--muted:#a8a8a0;--card:#1e1e1c;--line:#3a3a36;--accent:#7aa2ff;--warn:#ffcf8a;--warnbg:#3a2a10}}\
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}\
main{max-width:620px;margin:0 auto;padding:32px 16px 48px}h1{font-size:1.5rem;line-height:1.25;margin:0 0 12px}h2{font-size:1.05rem;margin:24px 0 8px}\
p,li{color:var(--fg)}.muted{color:var(--muted)}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:20px;margin:16px 0}\
code,.url{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.95em;word-break:break-all}\
.url{display:block;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin:8px 0}\
.host{font-weight:700;font-size:1.1rem;word-break:break-all}.tag{display:inline-block;font-size:.8rem;border:1px solid var(--line);border-radius:999px;padding:1px 8px;margin-left:6px;color:var(--muted)}\
.error{background:var(--warnbg);color:var(--warn);border-radius:8px;padding:10px 12px;margin:12px 0}\
label{display:block;font-weight:600;margin:16px 0 6px}input[type=text]{width:100%;font:inherit;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg)}\
.check{display:flex;gap:10px;align-items:flex-start;font-weight:400}.check input{margin-top:5px}\
.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}button{font:inherit;font-weight:600;padding:10px 18px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer}\
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}ul{padding-left:20px}";

fn page(title: &str, nonce: &str, body: &str) -> String {
    format!(
        "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\
<meta name=\"referrer\" content=\"no-referrer\"><title>{}</title><style nonce=\"{nonce}\">{STYLE}</style></head><body><main>{body}</main></body></html>",
        escape(title)
    )
}

const PRIVACY: &str = "Guesty data passes straight through this server to your app. It isn't stored or logged. \
The server keeps only what sign-in needs: the app's registration and your team access key, encrypted.";

pub fn landing(mcp_url: &str, nonce: &str) -> String {
    let url = escape(mcp_url);
    page(
        "Guesty MCP server",
        nonce,
        &format!(
            "<h1>Guesty MCP server</h1>\
<p>Connect Claude, ChatGPT, Claude Code, Cursor or another MCP app to your team's Guesty account.</p>\
<div class=\"card\"><strong>Paste this URL into your app as a remote MCP server:</strong><span class=\"url\">{url}</span>\
<p class=\"muted\">In Claude Code: <code>claude mcp add --transport http guesty {url}</code></p></div>\
<h2>How sign-in works</h2><ol>\
<li>Your app opens a sign-in page here.</li>\
<li>Paste the invite your team's admin sent you (from <code>guesty team invite</code>), or, if you already use the Guesty CLI, your team access key.</li>\
<li>Choose read-only if the app should never change anything, then approve.</li></ol>\
<p>Your team needs to be on the hosted Guesty token service (<code>guesty setup</code>). If you're signed out later, sign in again with a new invite.</p>\
<h2>Privacy</h2><p>{PRIVACY}</p>"
        ),
    )
}

pub struct Consent<'a> {
    pub app_name: Option<&'a str>,
    /// The origin a metadata-document client's document came from.
    pub verified_origin: Option<&'a str>,
    pub redirect_host: &'a str,
    pub request_field: &'a str,
    pub error: Option<&'a str>,
}

pub fn consent(view: &Consent<'_>, nonce: &str) -> String {
    let app = match (view.app_name, view.verified_origin) {
        (Some(name), Some(origin)) => format!(
            "<strong>{}</strong><span class=\"tag\">name reported by the app</span><br><span class=\"muted\">Client information published by <strong>{}</strong></span>",
            escape(name),
            escape(origin)
        ),
        (Some(name), None) => format!(
            "<strong>{}</strong><span class=\"tag\">name reported by the app, not verified</span>",
            escape(name)
        ),
        (None, Some(origin)) => {
            format!("An app whose client information is published by <strong>{}</strong>", escape(origin))
        }
        (None, None) => "An app that didn't give its name".to_string(),
    };
    let error =
        view.error.map(|e| format!("<div class=\"error\" role=\"alert\">{}</div>", escape(e))).unwrap_or_default();
    page(
        "Sign in to Guesty",
        nonce,
        &format!(
            "<h1>Connect an app to your team's Guesty account</h1>\
<div class=\"card\"><p>{app}</p><p>After you approve, you'll go back to:<br><span class=\"host\">{host}</span></p>\
<p class=\"muted\">Only continue if you started this from that app.</p></div>\
<h2>Approving lets the app</h2><ul>\
<li>read everything in your team's Guesty account: listings, reservations, guests, calendars, financials and more;</li>\
<li>make changes in Guesty, but only after the agent asks you and then calls again to confirm (or no changes at all if you choose read-only);</li>\
<li>with an admin invite or key, also see the team's token status and invite teammates.</li></ul>\
{error}<form method=\"post\" action=\"/authorize\">\
<input type=\"hidden\" name=\"request\" value=\"{field}\">\
<label for=\"credential\">Invite code, invite link or access key</label>\
<input type=\"text\" id=\"credential\" name=\"credential\" autocomplete=\"off\" autocapitalize=\"off\" spellcheck=\"false\" placeholder=\"ABCD-EFGH-JKMN\">\
<p class=\"muted\">Ask your team's admin for an invite (<code>guesty team invite</code>). Guesty CLI users can paste their <code>gts_</code> access key instead.</p>\
<label class=\"check\"><input type=\"checkbox\" name=\"read_only\" value=\"1\"> <span>Read-only: the app can read data but can't change anything</span></label>\
<div class=\"actions\"><button class=\"primary\" type=\"submit\" name=\"action\" value=\"approve\">Approve</button>\
<button type=\"submit\" name=\"action\" value=\"deny\">Cancel</button></div></form>\
<p class=\"muted\">{PRIVACY}</p>",
            host = escape(view.redirect_host),
            field = escape(view.request_field),
        ),
    )
}

pub fn error_page(title: &str, message: &str, nonce: &str) -> String {
    page(title, nonce, &format!("<h1>{}</h1><p>{}</p>", escape(title), escape(message)))
}
