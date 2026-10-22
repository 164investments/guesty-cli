# Guesty CLI 1.4.1

Version 1.4.1 fixes `guesty setup` in a terminal and gives setup and the `guesty team` commands a clearer interactive layout.

## Install or update

```bash
npm install -g https://github.com/164investments/guesty-cli/releases/download/v1.4.1/guesty-cli-1.4.1.tgz
guesty setup
```

Users on 1.2.0 or later can run `guesty update` instead. The CLI needs Node.js 20.12 or later. npm 12 blocks installs from a web address by default; with npm 12, add `--allow-remote=all` to the install command. The release includes `SHA256SUMS` for the compiled tarball.

## Fixed

- **Setup questions disappeared in a terminal.** Each question was erased as soon as it appeared, so people typed their answers without seeing what was asked. Every question now stays on screen.
- **Text from a token service can't control your terminal.** Control characters in anything a service sends, such as error messages, team names and key labels, are shown as `?`. A self-hosted service, or a key label an admin typed, can no longer send terminal escape codes.
- **Installing printed an npm warning about a blocked install script.** The package is built before it's published, so installing runs no script, and npm no longer warns.

## Changed

- **Interactive setup.** At a terminal, `guesty setup` offers its choices in a menu you move through with the arrow keys, masks the client secret as you type it, shows a spinner while Guesty checks the credentials, and ends with a summary and the next command to run. Ctrl+C stops it without saving anything. If Guesty rejects the credentials, setup says so next to the step that failed.
- **Team commands.** `guesty team invite`, `join`, `credentials` and `delete` use the same layout. `guesty team invite` prints the invite code on its own line, so it copies cleanly.
- **`guesty team status`** shows tokens, recent token requests and access keys as a readable summary at a terminal. When its output is piped, it still prints JSON.
- **Scripts keep working.** With piped input, setup still reads one answer per line, and the menu still takes 1, 2 or 3. An empty answer to a required question now stops setup with a message instead of asking again.
- **Node.js 20.12 or later** is now required, up from 18, which reached end of life in April 2025.

## Unchanged

The CLI still never requests OAuth tokens. The token service, the `SUPABASE_URL` cache, and the `token`, `raw` and API commands are unchanged.

## Verification

`npm run check` runs strict TypeScript 7 checks, 658 offline tests and the contract check. `npm run check:server` type-checks and tests the token service, and drives this CLI through team setup against it. That includes two new tests that run setup in a pseudo-terminal: one completes setup, confirms the secret never appears on screen, and confirms `team status` shows a key label without its escape codes; the other confirms Ctrl+C saves nothing and sends nothing. A separate terminal-emulator check went through every setup and team screen and confirmed each question is visible. No test contacts Guesty.
