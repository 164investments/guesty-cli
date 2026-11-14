#!/usr/bin/env node
// Installs a packed guesty-cli tarball the way users and agents do
// (`npm install -g`), into a temporary prefix, and checks that:
// - 1.x's `guesty update` verification passes (package.json version, dist/cli.js);
// - the first run (through the Node launcher) puts the native binary in the
//   launcher's place, so the `guesty` npm linked is then the binary itself
//   and runs with no `node` on PATH;
// - in a read-only install the launcher keeps working.
//   node scripts/smoke-install.mjs release/guesty-cli-2.0.0.tgz
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, openSync, readFileSync, readSync, closeSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tarball = resolve(process.argv[2] ?? "");
if (!existsSync(tarball)) throw new Error("usage: node scripts/smoke-install.mjs <tarball>");
const expected = JSON.parse(readFileSync(resolve(import.meta.dirname, "../package.json"), "utf8")).version;
const windows = process.platform === "win32";
const npm = windows ? "npm.cmd" : "npm";

function install(extra) {
  const prefix = mkdtempSync(join(tmpdir(), "guesty-smoke-"));
  execFileSync(npm, ["install", "--global", "--prefix", prefix, "--no-audit", "--no-fund", ...extra, tarball], { stdio: "inherit", shell: windows });
  const bin = windows ? join(prefix, "guesty.cmd") : join(prefix, "bin", "guesty");
  const pkg = windows ? join(prefix, "node_modules", "guesty-cli") : join(prefix, "lib", "node_modules", "guesty-cli");
  return { prefix, bin, pkg };
}

function magic(file) {
  const fd = openSync(file, "r");
  const bytes = Buffer.alloc(4);
  readSync(fd, bytes, 0, 4, 0);
  closeSync(fd);
  return bytes.toString("hex");
}

function check(label, ok) {
  if (!ok) throw new Error(`smoke: ${label}`);
  console.log(`ok - ${label}`);
}

const { prefix, bin, pkg } = install([]);
try {
  const installed = JSON.parse(readFileSync(join(pkg, "package.json"), "utf8")).version;
  check(`installed version is ${expected}`, installed === expected);
  check("dist/cli.js exists (1.x updater verification)", existsSync(join(pkg, "dist", "cli.js")));
  check("dist/bin.js exists (2.x updater verification)", existsSync(join(pkg, "dist", "bin.js")));
  if (!windows) {
    const target = realpathSync(bin);
    check("before the first run, guesty is the Node launcher", magic(target) === Buffer.from("#!/u").toString("hex"));
    const first = execFileSync(bin, ["--version"], { encoding: "utf8" });
    check("the first run works through the launcher", first.trim() === expected);
    // ELF, or Mach-O 64-bit (either byte order).
    check(`after it, guesty on PATH is the native binary (${target})`, ["7f454c46", "cffaedfe", "feedfacf"].includes(magic(target)));
    check("dist/cli.js is still the launcher", magic(join(pkg, "dist", "cli.js")) === Buffer.from("#!/u").toString("hex"));
    const env = { PATH: join(prefix, "bin"), HOME: prefix };
    const out = execFileSync(bin, ["--version"], { env, encoding: "utf8" });
    check("runs with no node on PATH", out.trim() === expected);
    const help = execFileSync(bin, ["reservations", "--help"], { env, encoding: "utf8" });
    check("reservations --help works", help.startsWith("Usage: guesty reservations|res"));
  } else {
    const out = execFileSync(bin, ["--version"], { encoding: "utf8", shell: true });
    check("runs through the launcher on Windows", out.trim() === expected);
  }
} finally {
  rmSync(prefix, { recursive: true, force: true });
}

if (!windows && process.getuid?.() !== 0) {
  const readOnly = install([]);
  try {
    chmodSync(join(readOnly.pkg, "dist"), 0o555);
    const out = execFileSync(readOnly.bin, ["--version"], { encoding: "utf8" });
    check("in a read-only install the launcher keeps working", out.trim() === expected && magic(realpathSync(readOnly.bin)) === Buffer.from("#!/u").toString("hex"));
  } finally {
    chmodSync(join(readOnly.pkg, "dist"), 0o755);
    rmSync(readOnly.prefix, { recursive: true, force: true });
  }
}
