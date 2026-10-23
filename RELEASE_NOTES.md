# Guesty CLI 1.6.0

Version 1.6.0 lets AI agents use Guesty through your team's shared token. `guesty mcp` runs a Model Context Protocol server for Claude Code, Codex, Cursor, Claude Desktop and other agents.

## Install or update

```bash
npm install -g --allow-remote=all https://github.com/164investments/guesty-cli/releases/latest/download/guesty-cli.tgz
guesty mcp install
```

`npm install -g guesty-cli` works too. On 1.2.0 to 1.5.0, `guesty update` works with npm 10 and 11; with npm 12, use the install command above.

## New

- **`guesty mcp`** gives agents five tools. `search_operations` finds any of the 362 Open API and 19 Booking Engine API operations from plain words. `describe_operation` shows its parameters, body and docs. `call_operation` runs it with the team's shared token. `team_status` and `invite_teammate` manage the team. Guesty's own MCP server, in beta, covers only reads.
- **Changes need approval.** An operation that changes data returns a preview and sends nothing until the agent calls it again with `confirm: true`. Invites work the same way, and admin invites can only be made in a terminal, so text an agent reads can't hand out the team's access. `--read-only` refuses every change.
- **`guesty mcp install`** adds the server to Claude Code, Codex, Cursor and Claude Desktop. It changes only its own `guesty-cli` entry, keeps each settings file's permissions, and won't rewrite a file it can't read.
- **One-link setup.** Pasting `Set up Guesty for me: https://guesty-tokens.staykit.ai/connect` into an agent walks it through installing, joining the team and adding the tools.
- **No new packages.** The server is built in, so the install stays at 8 packages.

## Token service

The `/connect` page is in the token service. Self-hosted services get it when redeployed with `npm run deploy` in `server/`. There is no new migration.

## Unchanged

The CLI still never requests OAuth tokens. The server reads only the team's cached token, and tool results never include it. Other commands are unchanged, except that `guesty mcp` ignores the `.env` of the folder it starts in.

# Guesty CLI 1.5.1

Version 1.5.1 fixes problems a new user hit when installing the CLI and setting up a team.

## Install or update

```bash
npm install -g --allow-remote=all https://github.com/164investments/guesty-cli/releases/latest/download/guesty-cli.tgz
guesty setup
```

Users on 1.2.0 or later can run `guesty update` instead. The CLI needs Node.js 20.12 or later. The install address always serves the newest release, and each release includes its versioned package and `SHA256SUMS`.

## Fixed

- **Installing with npm 12.** npm 12 refuses to install from a web address unless `--allow-remote=all` is given. The install command in the README, invite emails and invite pages now includes it, and so does `guesty update`. npm 10 and 11 accept the flag.
- **A new install points to setup.** Before setup, commands such as `guesty listings list` used to say to check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. They now say to run `guesty setup`. A CLI configured for a Supabase cache keeps its previous guidance.
- **Old Node.js versions.** On Node.js older than 20.12, every command, including `guesty --version`, failed with a `SyntaxError` about `styleText`. The CLI now says which Node.js it needs and which version it found. The installed command is now `dist/bin.js`, which checks the version and then loads `dist/cli.js`.
- **Choosing Guesty credentials.** Setup now says to create a new OAuth application in Guesty just for the team, and links Guesty's guide. Every tool that uses a client ID shares that client's five tokens a day.
- **Invite page on phones.** The page no longer scrolls sideways on narrow screens.

## Token service

The invite email and invite page changes are in the token service. Self-hosted services pick them up when redeployed with `npm run deploy` in `server/`. There is no new migration.

## Unchanged

The CLI still never requests OAuth tokens. Token renewal, request limits, and the `token`, `raw` and API commands are unchanged.
