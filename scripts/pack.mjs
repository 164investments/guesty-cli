#!/usr/bin/env node
// Builds the npm package from prebuilt binaries:
//   node scripts/pack.mjs <dir with guesty-<target>[.exe] files> <output dir>
// dist/ gets the binaries, plus npm/launcher.js as dist/bin.js (the command
// npm links; npm/install.js swaps in the native binary on macOS and Linux)
// and as dist/cli.js (1.x's `guesty update` checks that it exists).
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const [binaries, output] = process.argv.slice(2).map((p) => resolve(p));
if (!binaries || !output) throw new Error("usage: node scripts/pack.mjs <binaries dir> <output dir>");
const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
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
execFileSync("npm", ["pack", "--pack-destination", output], { cwd: root, stdio: "inherit" });
console.log(`Packed ${found.join(", ")}`);
