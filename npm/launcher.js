#!/usr/bin/env node
// The npm package's `guesty` command (dist/bin.js, also dist/cli.js): it runs
// this platform's native binary from dist/.
//
// On macOS and Linux, the first run through dist/bin.js also copies the
// binary over dist/bin.js, so from then on the `guesty` npm linked is the
// binary itself and starts without Node. This happens at first run rather
// than in a postinstall script because npm 12 blocks install scripts by
// default and 1.x's `guesty update` doesn't allow them. If the copy fails (a
// read-only install), this launcher keeps working. dist/cli.js stays a
// launcher: 1.x's updater checks that it exists.
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, realpathSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TARGETS = {
  "darwin arm64": "aarch64-apple-darwin",
  "darwin x64": "x86_64-apple-darwin",
  "linux x64": "x86_64-unknown-linux-musl",
  "linux arm64": "aarch64-unknown-linux-musl",
  "win32 x64": "x86_64-pc-windows-msvc",
};

const self = realpathSync(fileURLToPath(import.meta.url));
const target = TARGETS[`${process.platform} ${process.arch}`];
const binary = target && join(dirname(self), `guesty-${target}${process.platform === "win32" ? ".exe" : ""}`);
if (!binary || !existsSync(binary)) {
  process.stderr.write(`Guesty CLI has no build for ${process.platform} ${process.arch}. ` +
    "Builds exist for macOS and Linux (arm64, x64) and Windows (x64). See https://github.com/164investments/guesty-cli\n");
  process.exit(1);
}
const result = spawnSync(binary, process.argv.slice(2), { stdio: "inherit", windowsHide: true });
if (result.error) {
  process.stderr.write(`Error: could not start ${binary}: ${result.error.message}\n`);
  process.exit(1);
}
// The binary ran, so it works here: put it in this launcher's place.
if (process.platform !== "win32" && basename(self) === "bin.js") {
  const temporary = `${self}.${process.pid}.tmp`;
  try {
    copyFileSync(binary, temporary);
    chmodSync(temporary, 0o755);
    renameSync(temporary, self);
  } catch {
    try { rmSync(temporary, { force: true }); } catch {}
  }
}
if (result.signal) process.kill(process.pid, result.signal);
process.exit(result.status ?? 1);
