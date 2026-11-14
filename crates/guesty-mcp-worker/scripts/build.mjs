// Builds the Worker with worker-build (build/index.js and build/index_bg.wasm) and prints the
// bundle's gzip size. worker-build comes from PATH or Cargo's bin directory:
//   cargo install worker-build --version 0.8.7 --locked
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const crate = dirname(dirname(fileURLToPath(import.meta.url)));
const cargoBin = join(process.env.CARGO_HOME ?? join(homedir(), ".cargo"), "bin", process.platform === "win32" ? "worker-build.exe" : "worker-build");
const candidates = ["worker-build", cargoBin];
let built = false;
for (const command of candidates) {
  if (command !== "worker-build" && !existsSync(command)) continue;
  try {
    execFileSync(command, ["--release"], { cwd: crate, stdio: ["ignore", "inherit", "inherit"] });
    built = true;
    break;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
if (!built) {
  console.error("worker-build isn't installed. Run: cargo install worker-build --version 0.8.7 --locked");
  process.exit(1);
}
const wasm = readFileSync(join(crate, "build/index_bg.wasm"));
const js = readFileSync(join(crate, "build/index.js"));
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`bundle: wasm ${kb(wasm.length)} (gzip ${kb(gzipSync(wasm, { level: 9 }).length)}), js ${kb(js.length)} (gzip ${kb(gzipSync(js, { level: 9 }).length)})`);
