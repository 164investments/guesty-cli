# Guesty CLI 2.0.0

Version 2.0.0 is the same CLI rewritten in Rust. Every command now starts in about a millisecond instead of about 40 to 60, because it no longer starts Node.js first. Agents and scripts that call `guesty` many times get their answers that much sooner. It also adds `guesty mcp`, a server that gives AI agents every Guesty operation through your team's shared token.

## Install or update

```bash
npm install -g --allow-remote=all https://github.com/164investments/guesty-cli/releases/latest/download/guesty-cli.tgz
guesty setup
```

Users on 1.2.0 or later can run `guesty update` instead. npm (Node.js 18 or later) is only needed to install it. The first `guesty` command after installing runs through a small Node launcher, which then puts the native program in its place; every later command runs the native program directly. Builds exist for macOS and Linux (Apple silicon or arm64, and x64) and Windows (x64). The release also has each platform's binary on its own and `SHA256SUMS`.

## What's the same

Commands, options, help text, error messages, output and exit codes are the same as 1.5.1. More than 2,000 recorded cases of 1.5.1's output, errors and Guesty requests are replayed against every change to check that.

- Authentication is still read-only: the CLI never requests an OAuth token, reads only the team token service or the server-managed cache, and never writes either.
- Writes keep their safeguards: they're never retried after an uncertain failure, OAuth paths are refused, redirects aren't followed, and error bodies never show the token.
- Setup, invites, team commands and `guesty update` work as before. Settings stay in `~/.guesty-cli/.env`.

## New

- **`guesty mcp`** runs a Model Context Protocol server for Claude Code, Codex, Cursor and Claude Desktop, and `guesty mcp install` adds it to them. Its five tools search, describe and call every Open API and Booking Engine API operation. Changes are sent only after the agent calls again with `confirm: true`, `--read-only` refuses them all, and inviting a teammate needs your approval of that person. See "Use Guesty from AI agents (MCP)" in the README.

## Changed

- **`team status` at a terminal** now replaces control characters in every value the token service returns, not only some. A self-hosted service can no longer send terminal escape sequences through them.

## Speed

Measured on the agent host (Linux, x64) with a local mock of the token service and API, median of 30 runs:

| | 1.5.1 | 2.0.0 |
|---|---|---|
| `guesty --version` | 40.5 ms | 0.7 ms |
| `guesty listings list` (token and one API request) | 64.9 ms | 1.4 ms |
| Memory | 68 to 79 MB | 3 to 4 MB |
| `guesty mcp`: start to first reply | 42 ms | 1 ms |
