import { INSTALL_COMMAND } from "./invite-messages.js";

// The one-link setup: a person pastes "Set up Guesty for me: <service>/connect"
// into Claude Code, Codex or Cursor, and the agent follows these steps.
export const CONNECT_INSTRUCTIONS = `# Set up Guesty for this person

You are an AI agent (Claude Code, Codex, Cursor or similar) connecting the person you work with to Guesty, the vacation rental software. When you're done, you'll have tools for every Guesty Open API and Booking Engine API operation, using their team's shared Guesty token, so nobody uses up Guesty's five tokens a day. Do these steps in order and tell the person what you're doing.

## 1. Check Node.js

Run \`node -v\`. It needs version 20.12 or later. If Node.js is missing or older, ask the person to install the LTS version from https://nodejs.org, then carry on.

## 2. Install the Guesty CLI

Run:

\`\`\`
${INSTALL_COMMAND}
\`\`\`

Then \`guesty --version\` should print 1.6.0 or later.

## 3. Connect to their team

- If they have an invite link or code from their team's admin, run \`guesty join <the link or code>\`.
- If they want to start a team, they need a Guesty Open API client ID and secret. Ask them to run \`guesty setup\` in their own terminal, so the secret never goes into this chat, and to tell you when it's done.
- If they're already set up, skip this step.

## 4. Add the Guesty tools to this app

Run \`guesty mcp install --client <app>\`, where \`<app>\` is the app you're running in: \`claude-code\`, \`codex\`, \`cursor\` or \`claude-desktop\`. Add \`--read-only\` if they only want to look things up.

## 5. Finish

Tell them to start a new session so the tools load: in Claude Code, run \`/mcp\` or start a new session; in Codex, start a new session; restart Cursor or Claude Desktop. The tools are \`search_operations\`, \`describe_operation\`, \`call_operation\`, \`team_status\` and \`invite_teammate\`.

## Rules

- Never ask for, print or save a Guesty client secret, token or access key in this chat.
- Before anything that changes data in Guesty, show the person what will change and get their OK.

More: https://github.com/164investments/guesty-cli#use-guesty-from-ai-agents-mcp
`;

export function connectResponse(method: string): Response {
  return new Response(method === "HEAD" ? null : CONNECT_INSTRUCTIONS, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=300",
      "x-content-type-options": "nosniff",
    },
  });
}
