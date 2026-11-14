#!/usr/bin/env node
// Builds the npm package from prebuilt binaries:
//   node scripts/pack.mjs <dir with guesty-<target>[.exe] files> <output dir>
// The package is assembled in a temporary directory (never in this checkout's
// dist/): the files package.json lists, plus dist/ with the binaries and
// npm/launcher.js as dist/bin.js (the command npm links; it puts the native
// binary in its own place on first run) and as dist/cli.js (1.x's
// `guesty update` checks that it exists).
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const [binaries, output] = process.argv.slice(2).map((p) => resolve(p));
if (!binaries || !output) throw new Error("usage: node scripts/pack.mjs <binaries dir> <output dir>");
const root = resolve(import.meta.dirname, "..");
const stage = mkdtempSync(join(tmpdir(), "guesty-pack-"));
try {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  copyFileSync(join(root, "package.json"), join(stage, "package.json"));
  for (const entry of pkg.files.filter((f) => !f.startsWith("dist/"))) {
    if (existsSync(join(root, entry))) cpSync(join(root, entry), join(stage, entry), { recursive: true });
  }
  const dist = join(stage, "dist");
  mkdirSync(dist);
  const found = readdirSync(binaries).filter((name) => /^guesty-[a-z0-9_]+-[a-z0-9_-]+(\.exe)?$/.test(name));
  if (!found.length) throw new Error(`No guesty-<target> binaries in ${binaries}`);
  for (const name of found) {
    copyFileSync(join(binaries, name), join(dist, name));
    chmodSync(join(dist, name), 0o755);
  }
  for (const name of ["bin.js", "cli.js"]) {
    copyFileSync(join(root, "npm", "launcher.js"), join(dist, name));
    chmodSync(join(dist, name), 0o755);
  }
  mkdirSync(output, { recursive: true });
  execFileSync("npm", ["pack", "--pack-destination", output], { cwd: stage, stdio: "inherit", shell: process.platform === "win32" });
  console.log(`Packed ${found.join(", ")}`);
} finally {
  rmSync(stage, { recursive: true, force: true });
}
