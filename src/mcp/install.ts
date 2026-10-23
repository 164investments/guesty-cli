import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Adds the Guesty MCP server to AI apps on this computer. Each app keeps its own
// settings; only the "guesty-cli" entry is added or replaced, never anything else.
export const SERVER_NAME = "guesty-cli";
export type Client = "claude-code" | "codex" | "cursor" | "claude-desktop";
export const CLIENTS: { value: Client; label: string; hint: string }[] = [
  { value: "claude-code", label: "Claude Code", hint: "uses the claude command" },
  { value: "codex", label: "Codex", hint: "~/.codex/config.toml" },
  { value: "cursor", label: "Cursor", hint: "~/.cursor/mcp.json" },
  { value: "claude-desktop", label: "Claude Desktop", hint: "claude_desktop_config.json" },
];
type Json = Record<string, unknown>;
export interface Launch { command: string; args: string[] }
export interface InstallResult { client: Client; ok: boolean; message: string }

function onPath(command: string): string | undefined {
  const extensions = process.platform === "win32" ? ["", ".cmd", ".exe"] : [""];
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    for (const extension of extensions) {
      const candidate = join(directory, `${command}${extension}`);
      try {
        if (statSync(candidate).isFile()) return candidate;
      } catch {
        continue;
      }
    }
  }
  return undefined;
}

// Desktop apps don't start with the terminal's PATH, so the server launches
// with absolute paths. The node found on PATH (a stable link such as
// /opt/homebrew/bin/node) survives Node upgrades; the versioned binary doesn't.
export function launchCommand(readOnly: boolean): Launch {
  const script = realpathSync(fileURLToPath(new URL("../bin.js", import.meta.url)));
  let node = process.execPath;
  const found = onPath("node");
  try {
    if (found && realpathSync(found) === realpathSync(process.execPath)) node = found;
  } catch {
    // Keep the running Node's own path.
  }
  return { command: node, args: [script, "mcp", ...(readOnly ? ["--read-only"] : [])] };
}

export function claudeDesktopConfig(): string {
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  if (process.platform === "win32") return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Claude", "claude_desktop_config.json");
  return join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "Claude", "claude_desktop_config.json");
}

function codexHome(): string {
  return process.env.CODEX_HOME ?? join(homedir(), ".codex");
}

function cursorConfig(): string {
  return join(homedir(), ".cursor", "mcp.json");
}

export function detectClients(): Client[] {
  const found: Client[] = [];
  if (onPath("claude")) found.push("claude-code");
  if (onPath("codex") || existsSync(codexHome())) found.push("codex");
  if (existsSync(join(homedir(), ".cursor"))) found.push("cursor");
  if (existsSync(dirname(claudeDesktopConfig()))) found.push("claude-desktop");
  return found;
}

// Writes through a temporary file and keeps the original's permissions, since
// these files can hold other servers' secrets.
function writeAtomically(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  const mode = existsSync(file) ? statSync(file).mode & 0o777 : 0o644;
  const temporary = `${file}.guesty-cli-tmp`;
  writeFileSync(temporary, content, { mode });
  chmodSync(temporary, mode);
  renameSync(temporary, file);
}

function addToJsonConfig(file: string, launch: Launch): string {
  let config: Json = {};
  if (existsSync(file)) {
    const raw = readFileSync(file, "utf8");
    if (raw.trim()) {
      try {
        config = JSON.parse(raw) as Json;
      } catch {
        throw new Error(`${file} isn't valid JSON, so it wasn't changed. Fix it, or run guesty mcp install --print and add the server by hand.`);
      }
    }
    if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error(`${file} isn't a JSON object, so it wasn't changed.`);
  }
  const servers = config.mcpServers && typeof config.mcpServers === "object" && !Array.isArray(config.mcpServers) ? config.mcpServers as Json : {};
  const replaced = SERVER_NAME in servers;
  config.mcpServers = { ...servers, [SERVER_NAME]: { command: launch.command, args: launch.args } };
  writeAtomically(file, `${JSON.stringify(config, null, 2)}\n`);
  return `${replaced ? "Updated" : "Added"} ${SERVER_NAME} in ${file}`;
}

// Drops any existing [mcp_servers.guesty-cli] table (and its subtables), then appends ours.
function addToCodexToml(file: string, launch: Launch): string {
  const raw = existsSync(file) ? readFileSync(file, "utf8") : "";
  const ours = /^\s*\[\s*mcp_servers\s*\.\s*(?:"guesty-cli"|guesty-cli)\s*(?:\.[^\]]*)?\]\s*(?:#.*)?$/;
  const kept: string[] = [];
  let skipping = false;
  let replaced = false;
  for (const line of raw.split("\n")) {
    if (/^\s*\[/.test(line)) {
      skipping = ours.test(line);
      if (skipping) replaced = true;
    }
    if (!skipping) kept.push(line);
  }
  const body = kept.join("\n").replace(/\n*$/, "");
  const table = [
    `[mcp_servers.${SERVER_NAME}]`,
    `command = ${JSON.stringify(launch.command)}`,
    `args = [${launch.args.map((arg) => JSON.stringify(arg)).join(", ")}]`,
  ].join("\n");
  writeAtomically(file, `${body ? `${body}\n\n` : ""}${table}\n`);
  return `${replaced ? "Updated" : "Added"} ${SERVER_NAME} in ${file}`;
}

function run(command: string, args: string[]): void {
  // Windows runs these CLIs through .cmd shims, which need a shell and quoting.
  const windows = process.platform === "win32";
  execFileSync(command, windows ? args.map((arg) => (/[\s"]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg)) : args, {
    stdio: ["ignore", "pipe", "pipe"], timeout: 30_000, shell: windows,
  });
}

function installClaudeCode(launch: Launch): string {
  const claude = onPath("claude");
  if (!claude) {
    throw new Error(`The claude command isn't on PATH. In a terminal where it is, run: claude mcp add --scope user ${SERVER_NAME} -- ${[launch.command, ...launch.args].map((arg) => JSON.stringify(arg)).join(" ")}`);
  }
  try {
    run(claude, ["mcp", "remove", "--scope", "user", SERVER_NAME]);
  } catch {
    // Not added before.
  }
  run(claude, ["mcp", "add", "--scope", "user", SERVER_NAME, "--", launch.command, ...launch.args]);
  return `Added ${SERVER_NAME} to Claude Code for your user. Start a new Claude Code session, or run /mcp, to use it.`;
}

function installCodex(launch: Launch): string {
  const codex = onPath("codex");
  if (codex) {
    try {
      try {
        run(codex, ["mcp", "remove", SERVER_NAME]);
      } catch {
        // Not added before.
      }
      run(codex, ["mcp", "add", SERVER_NAME, "--", launch.command, ...launch.args]);
      return `Added ${SERVER_NAME} to Codex. Start a new Codex session to use it.`;
    } catch {
      // Older Codex versions have no "mcp add"; edit its settings file instead.
    }
  }
  return `${addToCodexToml(join(codexHome(), "config.toml"), launch)}. Start a new Codex session to use it.`;
}

export function installClient(client: Client, launch: Launch): InstallResult {
  try {
    const message = client === "claude-code" ? installClaudeCode(launch)
      : client === "codex" ? installCodex(launch)
      : client === "cursor" ? `${addToJsonConfig(cursorConfig(), launch)}. Restart Cursor to use it.`
      : `${addToJsonConfig(claudeDesktopConfig(), launch)}. Quit and reopen Claude Desktop to use it.`;
    return { client, ok: true, message };
  } catch (err) {
    return { client, ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export function parseClients(value: string): Client[] {
  const names = value.split(/[\s,]+/).filter(Boolean);
  const unknown = names.filter((name) => !CLIENTS.some((client) => client.value === name));
  if (unknown.length || !names.length) {
    throw new Error(`Unknown app ${unknown.join(", ") || "(none)"}. Use ${CLIENTS.map((client) => client.value).join(", ")}.`);
  }
  return [...new Set(names as Client[])];
}
