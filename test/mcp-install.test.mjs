// `guesty mcp install` against a throwaway home folder, with fake `claude` and
// `codex` commands that only record how they were called.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { root } from "./fixtures/isolated-runner.mjs";

const bin = realpathSync(join(root, "dist", "bin.js"));

function setup(t, { codexAdd = "fail" } = {}) {
  const home = mkdtempSync(join(tmpdir(), "guesty-mcp-install-"));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const fakes = join(home, "bin");
  mkdirSync(fakes);
  // remove fails (nothing to remove yet); add succeeds, except codex add when asked to fail.
  for (const [name, failAdd] of [["claude", false], ["codex", codexAdd === "fail"]]) {
    const script = join(fakes, name);
    writeFileSync(script, `#!/bin/sh\necho "$*" >> "$HOME/${name}.log"\ncase "$2" in remove) exit 1;; add) exit ${failAdd ? 1 : 0};; esac\n`);
    chmodSync(script, 0o755);
  }
  const desktop = process.platform === "darwin"
    ? join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json")
    : join(home, ".config", "Claude", "claude_desktop_config.json");
  const env = { HOME: home, PATH: [fakes, dirname(process.execPath), "/usr/bin", "/bin"].join(":") };
  const install = (...args) => spawnSync(process.execPath, [join(root, "dist", "cli.js"), "mcp", "install", ...args], { cwd: home, env, encoding: "utf8", timeout: 20_000 });
  return { home, desktop, install, log: (name) => existsSync(join(home, `${name}.log`)) ? readFileSync(join(home, `${name}.log`), "utf8") : "" };
}

test("mcp install --print shows the settings and changes nothing", (t) => {
  const { home, install } = setup(t);
  const result = install("--print", "--read-only");
  assert.equal(result.status, 0, result.stderr);
  const server = JSON.parse(result.stdout).mcpServers["guesty-cli"];
  assert.equal(realpathSync(server.command), realpathSync(process.execPath));
  assert.deepEqual(server.args, [bin, "mcp", "--read-only"]);
  assert.equal(existsSync(join(home, ".cursor")), false);
  assert.equal(existsSync(join(home, ".codex")), false);
});

test("mcp install without a terminal asks for --client and lists the apps it found", (t) => {
  const { home, install } = setup(t);
  mkdirSync(join(home, ".cursor"));
  const result = install();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Choose where to add it with --client .* or --all\. Found on this computer: claude-code, codex, cursor\./);
});

test("mcp install adds its own entry to every app and keeps everything else", (t) => {
  const { home, desktop, install, log } = setup(t);
  const cursor = join(home, ".cursor", "mcp.json");
  mkdirSync(dirname(cursor), { recursive: true });
  writeFileSync(cursor, JSON.stringify({ mcpServers: { other: { command: "other-server", env: { TOKEN: "keep-me" } } } }), { mode: 0o600 });
  mkdirSync(dirname(desktop), { recursive: true });
  writeFileSync(desktop, JSON.stringify({ globalShortcut: "Cmd+Space" }));
  const codexConfig = join(home, ".codex", "config.toml");
  mkdirSync(dirname(codexConfig), { recursive: true });
  writeFileSync(codexConfig, [
    'model = "gpt-6"',
    "",
    "[mcp_servers.guesty-cli]",
    'command = "/old/node"',
    "",
    "[mcp_servers.guesty-cli.env]",
    'OLD = "1"',
    "",
    "[mcp_servers.other]",
    'command = "other"',
    "",
  ].join("\n"));

  const result = install("--client", "claude-code,codex,cursor,claude-desktop");
  assert.equal(result.status, 0, result.stderr);

  const cursorJson = JSON.parse(readFileSync(cursor, "utf8"));
  assert.deepEqual(cursorJson.mcpServers.other, { command: "other-server", env: { TOKEN: "keep-me" } });
  assert.deepEqual(cursorJson.mcpServers["guesty-cli"].args, [bin, "mcp"]);
  assert.equal(statSync(cursor).mode & 0o777, 0o600, "keeps the file's permissions");

  const desktopJson = JSON.parse(readFileSync(desktop, "utf8"));
  assert.equal(desktopJson.globalShortcut, "Cmd+Space");
  assert.deepEqual(desktopJson.mcpServers["guesty-cli"].args, [bin, "mcp"]);

  const toml = readFileSync(codexConfig, "utf8");
  assert.match(toml, /^model = "gpt-6"$/m);
  assert.match(toml, /\[mcp_servers\.other\]\ncommand = "other"/);
  assert.doesNotMatch(toml, /\/old\/node|OLD = "1"|guesty-cli\.env/);
  assert.equal(toml.match(/\[mcp_servers\.guesty-cli\]/g).length, 1);
  assert.match(toml, new RegExp(`args = \\[${JSON.stringify(bin).replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}, "mcp"\\]`));

  assert.match(log("claude"), /^mcp remove --scope user guesty-cli\nmcp add --scope user guesty-cli -- \S+ \S+bin\.js mcp\n$/);
  assert.match(log("codex"), /mcp add guesty-cli -- /);
  assert.equal(existsSync(`${cursor}.guesty-cli-tmp`), false);

  const again = install("--client", "cursor,codex");
  assert.equal(again.status, 0, again.stderr);
  assert.equal(Object.keys(JSON.parse(readFileSync(cursor, "utf8")).mcpServers).length, 2);
  assert.equal(readFileSync(codexConfig, "utf8").match(/\[mcp_servers\.guesty-cli\]/g).length, 1);
});

test("mcp install uses codex mcp add when it works, and leaves config.toml alone", (t) => {
  const { home, install, log } = setup(t, { codexAdd: "ok" });
  const result = install("--client", "codex", "--read-only");
  assert.equal(result.status, 0, result.stderr);
  assert.match(log("codex"), new RegExp(`mcp add guesty-cli -- \\S+ ${bin.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")} mcp --read-only`));
  assert.equal(existsSync(join(home, ".codex", "config.toml")), false);
});

test("mcp install refuses to rewrite a settings file it can't read, and still does the rest", (t) => {
  const { home, desktop, install } = setup(t);
  mkdirSync(dirname(desktop), { recursive: true });
  writeFileSync(desktop, "{ broken");
  const result = install("--client", "claude-desktop,cursor");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /isn't valid JSON, so it wasn't changed/);
  assert.equal(readFileSync(desktop, "utf8"), "{ broken");
  assert.ok(JSON.parse(readFileSync(join(home, ".cursor", "mcp.json"), "utf8")).mcpServers["guesty-cli"]);
});

test("mcp install rejects an unknown app name", (t) => {
  const { install } = setup(t);
  const result = install("--client", "chatgpt");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown app chatgpt\. Use claude-code, codex, cursor, claude-desktop\./);
});
