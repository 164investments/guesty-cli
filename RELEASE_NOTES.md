# Guesty CLI 1.5.0

Version 1.5.0 makes inviting teammates simple. An admin types a name and an email address, and the token service emails the teammate one command that installs the CLI and joins the team.

## Install or update

```bash
npm install -g https://github.com/164investments/guesty-cli/releases/latest/download/guesty-cli.tgz
guesty setup
```

Users on 1.2.0 or later can run `guesty update` instead. The CLI needs Node.js 20.12 or later. npm 12 blocks installs from a web address by default; with npm 12, add `--allow-remote=all` to the install command. The install address above now always serves the newest release, and each release still includes its versioned package and `SHA256SUMS`.

## New

- **Email invites.** `guesty team invite` asks for the teammate's name and email address. The service emails them who invited them, the team, and one command to paste: it installs the CLI and runs `guesty join`. `guesty team invite "Alex" --email alex@example.com` does the same without questions.
- **Invite links.** Without an email address, the invite is a link to send however you like. It opens a page with the same steps and copy buttons. Opening it doesn't use the invite, so mail scanners can't spend it.
- **`guesty join`.** Teammates join with `guesty join ABCD-EFGH-JKLM` or the whole link. Codes ignore case and dashes, and read O as 0 and I or L as 1.
- **Invite from setup.** After `guesty setup` creates a team, it offers to invite teammates straight away.
- **Pending invites.** `guesty team status` lists them, and `guesty team revoke <name>` cancels one as well as revoking a key.

## Changed

- **The hosted service is now StayKit's.** Simply VRM's hosted token service is now StayKit's, at `https://guesty-tokens.staykit.ai`, and its invite emails come from `invites@staykit.ai`. It's the same service with the same teams and keys. The former address, `guesty-tokens.simplyvacationrentalmanagement.com`, keeps working for CLI 1.4, and CLI 1.5 reads settings and invites that use it as the new address, so nobody has to set up again.
- **Invites are one-time.** An invite code works once and expires after seven days. Until now, an invite code held the teammate's key itself and worked until the key was revoked. Codes printed by CLI 1.4 still work.
- **Joining asks before replacing a connection.** If this CLI is already connected to a team, `guesty join` asks before replacing that connection, which may be an admin key. Piped input that ends answers no.

## Token service

Self-hosted services need the update for invites; redeploy with `npm run deploy` in `server/`, which applies the new migration. Invite email is optional: set `INVITE_EMAIL_FROM` and the `RESEND_API_KEY` secret to turn it on. Without them, invites are links only. The service:

- stores invite codes only as keyed hashes, and keeps a teammate's address only while the invite is pending;
- turns a code into a key once, inside one database transaction, and cancels a key's invites when the key is revoked;
- allows ten wrong codes an hour from one address, counting an IPv6 /64 as one address;
- allows each team 50 invites and 20 invite emails a day, sends one recipient at most three a day (ignoring case, `+tags`, and dots at Gmail), and sends at most 200 a day in all. Each cap is checked in a single database statement, failed sends count, and the email history is kept by Guesty client, so deleting and recreating a team doesn't reset it;
- leaves the team name out of email subjects, shortens names in emails, escapes them in HTML, and strips control, zero-width and text-direction characters from them.

## Unchanged

The CLI still never requests OAuth tokens. Token renewal, the request limits, and the `token`, `raw` and API commands are unchanged.

## Verification

`npm run check` runs strict TypeScript 7 checks, the offline tests, and the contract check. `npm run check:server` type-checks the token service and runs it in Miniflare against mocks of Guesty's token endpoint and Resend. Its tests cover one-time use, expiry, cancellation, replacement, revoking an inviting key, wrong-code limits (including requests sent together and IPv6), email caps (including requests sent together, address aliases, and a deleted and recreated team), escaping, and a service without email. They also drive this CLI through inviting, joining by link, joining with a CLI 1.4 code, cancelling, and an interactive setup that invites a teammate by email in a pseudo-terminal. No test contacts Guesty or sends email.
