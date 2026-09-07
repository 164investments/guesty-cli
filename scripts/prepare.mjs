#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function isFile(path) {
  try { return statSync(path).isFile(); } catch { return false; }
}

function isDirectory(path) {
  try { return statSync(path).isDirectory(); } catch { return false; }
}

function runStep(run, command, args, options, message) {
  try {
    run(command, args, options);
  } catch (cause) {
    const error = new Error(message, { cause });
    error.exitCode = Number.isInteger(cause?.status) && cause.status > 0 ? cause.status : 1;
    throw error;
  }
}

export function preparePackage({ root = packageRoot, env = process.env, run = execFileSync } = {}) {
  const sourceRoot = realpathSync(root);
  const manifest = JSON.parse(readFileSync(join(sourceRoot, "package.json"), "utf8"));
  if (manifest.name !== "guesty-cli") throw new Error("Refusing to prepare a directory that is not the guesty-cli package.");

  const entry = join(sourceRoot, "dist", "cli.js");
  if (!isDirectory(join(sourceRoot, "src"))) {
    if (!isFile(entry)) throw new Error("This guesty-cli package has neither source files nor a compiled dist/cli.js. Reinstall the published release package.");
    return;
  }
  const project = join(sourceRoot, "tsconfig.json");
  if (!isFile(join(sourceRoot, "src", "cli.ts")) || !isFile(project)) {
    throw new Error("The guesty-cli source package is incomplete: src/cli.ts and tsconfig.json are required.");
  }

  // npm can pass the outer global installation's configuration into its Git
  // dependency preparation. Keep the repair inside this exact source root.
  // Other npm settings (registry, credentials, proxies, cache) remain available.
  const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) =>
    !/^npm_config_(?:global|prefix|global_prefix|local_prefix|location)$/i.test(key)
  ));
  const options = { cwd: sourceRoot, env: childEnv, stdio: "inherit" };
  const compiler = join(sourceRoot, "node_modules", "typescript", "bin", "tsc");
  const nodeTypes = join(sourceRoot, "node_modules", "@types", "node", "package.json");

  if (!isFile(compiler) || !isFile(nodeTypes)) {
    const args = ["ci", "--ignore-scripts", "--include=dev", "--global=false", "--prefix", sourceRoot];
    const npmEntry = env.npm_execpath;
    // npm supplies its CLI entry during lifecycle scripts. Invoking JavaScript
    // through Node also works when npm's installation path contains spaces.
    const javascriptEntry = npmEntry && /\.(?:c|m)?js$/i.test(npmEntry);
    runStep(run, javascriptEntry ? process.execPath : npmEntry || "npm",
      javascriptEntry ? [npmEntry, ...args] : args, options,
      "Installing guesty-cli build dependencies failed. The published GitHub release package can be installed without building source.");
    if (!isFile(compiler) || !isFile(nodeTypes)) {
      throw new Error("npm did not install the local TypeScript compiler and Node types required to build guesty-cli.");
    }
  }

  runStep(run, process.execPath, [compiler, "--project", project], options, "Compiling guesty-cli failed.");
  if (!isFile(entry)) throw new Error("The guesty-cli build did not produce dist/cli.js.");
}

let isMain = false;
try { isMain = !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch {}
if (isMain) {
  try {
    preparePackage();
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = error.exitCode ?? 1;
  }
}
