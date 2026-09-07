import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preparePackage } from "../scripts/prepare.mjs";

const compilerSource = `
const fs = require("node:fs");
const path = require("node:path");
if (process.argv[2] !== "--project" || process.argv[3] !== path.join(process.cwd(), "tsconfig.json")) process.exit(81);
if (Object.keys(process.env).some(key => /^npm_config_(global|prefix|global_prefix|local_prefix|location)$/i.test(key))) process.exit(82);
fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync("dist/cli.js", "// compiled fixture\\n");
fs.writeFileSync("compiler-ran.json", JSON.stringify({ cwd: process.cwd(), argv: process.argv.slice(2) }));
`;

function fixture(t, { source = true, dependencies = false, compiled = false } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "guesty prepare fixture ")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "guesty-cli", type: "module", version: "1.2.1" }));
  if (source) {
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "cli.ts"), "export {};\n");
    writeFileSync(join(root, "tsconfig.json"), "{}");
  }
  if (dependencies) installDependencies(root);
  if (compiled) {
    mkdirSync(join(root, "dist"));
    writeFileSync(join(root, "dist", "cli.js"), "// precompiled fixture\n");
  }
  return root;
}

function installDependencies(root, compiler = compilerSource) {
  mkdirSync(join(root, "node_modules", "typescript", "bin"), { recursive: true });
  mkdirSync(join(root, "node_modules", "@types", "node"), { recursive: true });
  writeFileSync(join(root, "node_modules", "typescript", "package.json"), '{"type":"commonjs"}');
  writeFileSync(join(root, "node_modules", "typescript", "bin", "tsc"), compiler);
  writeFileSync(join(root, "node_modules", "@types", "node", "package.json"), "{}");
}

function protectedRun(root, calls = []) {
  return (command, args, options) => {
    assert.equal(command, process.execPath, "Tests must never invoke a real package manager");
    assert.ok(args[0].startsWith(root + "/"), "Only fixture executables may run");
    assert.equal(options.cwd, root);
    calls.push({ command, args, options });
    return execFileSync(command, args, { ...options, stdio: "pipe" });
  };
}

function npmFixture(root, source) {
  const npm = join(root, "fake npm.cjs");
  writeFileSync(npm, source);
  return npm;
}

test("prepare builds source with its absolute compiler and skips dependency installation when ready", (t) => {
  const root = fixture(t, { dependencies: true });
  const calls = [];
  preparePackage({ root, env: {}, run: protectedRun(root, calls) });
  assert.equal(calls.length, 1);
  assert.equal(readFileSync(join(root, "dist", "cli.js"), "utf8"), "// compiled fixture\n");
  assert.equal(JSON.parse(readFileSync(join(root, "compiler-ran.json"))).cwd, root);
});

test("prepare bootstraps only its source root, includes dev dependencies, prevents recursion and removes leaked global settings", (t) => {
  const root = fixture(t);
  const npm = npmFixture(root, `
    const fs = require("node:fs");
    const path = require("node:path");
    const assert = require("node:assert/strict");
    assert.deepEqual(process.argv.slice(2), ["ci", "--ignore-scripts", "--include=dev", "--global=false", "--prefix", process.cwd()]);
    assert.ok(!Object.keys(process.env).some(key => /^npm_config_(global|prefix|global_prefix|local_prefix|location)$/i.test(key)));
    assert.equal(process.env.npm_config_registry, "https://registry.example.invalid");
    fs.mkdirSync("node_modules/typescript/bin", { recursive: true });
    fs.mkdirSync("node_modules/@types/node", { recursive: true });
    fs.writeFileSync("node_modules/typescript/package.json", '{"type":"commonjs"}');
    fs.writeFileSync("node_modules/typescript/bin/tsc", ${JSON.stringify(compilerSource)});
    fs.writeFileSync("node_modules/@types/node/package.json", "{}");
  `);
  const env = {
    npm_execpath: npm, npm_config_global: "true", NPM_CONFIG_PREFIX: "/never-touch-this-prefix",
    npm_config_local_prefix: "/never-touch-this-project", npm_config_global_prefix: "/never-touch-this-global",
    npm_config_location: "global", npm_config_registry: "https://registry.example.invalid",
  };
  const original = { ...env };
  const calls = [];
  preparePackage({ root, env, run: protectedRun(root, calls) });
  assert.deepEqual(env, original, "Parent process configuration must be preserved");
  assert.equal(calls.length, 2);
  assert.ok(existsSync(join(root, "dist", "cli.js")));
});

test("prepare also repairs missing Node type dependencies when the compiler already exists", (t) => {
  const root = fixture(t, { dependencies: true });
  rmSync(join(root, "node_modules", "@types"), { recursive: true });
  const calls = [];
  preparePackage({ root, env: { npm_execpath: join(root, "npm.cjs") }, run(command, args, options) {
    if (calls.length === 0) {
      calls.push(args);
      assert.equal(command, process.execPath);
      assert.equal(args[1], "ci");
      installDependencies(root);
      return;
    }
    return protectedRun(root, calls)(command, args, options);
  } });
  assert.equal(calls.length, 2);
  assert.ok(existsSync(join(root, "dist", "cli.js")));
});

test("compiled release preparation makes no subprocess calls and preserves its files", (t) => {
  const root = fixture(t, { source: false, compiled: true });
  preparePackage({ root, run() { assert.fail("A compiled release must not build or install dependencies"); } });
  assert.equal(readFileSync(join(root, "dist", "cli.js"), "utf8"), "// precompiled fixture\n");
  assert.equal(existsSync(join(root, "node_modules")), false);
});

test("prepare rejects broken distributions, incomplete source and unrelated roots before running commands", (t) => {
  const run = () => assert.fail("Invalid packages must not invoke npm or the compiler");
  const broken = fixture(t, { source: false });
  assert.throws(() => preparePackage({ root: broken, run }), /neither source files nor a compiled/);
  const incomplete = fixture(t, { compiled: true });
  rmSync(join(incomplete, "tsconfig.json"));
  assert.throws(() => preparePackage({ root: incomplete, run }), /source package is incomplete/);
  const unrelated = fixture(t);
  writeFileSync(join(unrelated, "package.json"), '{"name":"some-other-project"}');
  assert.throws(() => preparePackage({ root: unrelated, run }), /not the guesty-cli package/);
});

test("dependency-install failures preserve their exit code and never reach the compiler", (t) => {
  const root = fixture(t);
  const npm = npmFixture(root, "process.exit(13);\n");
  const calls = [];
  assert.throws(() => preparePackage({ root, env: { npm_execpath: npm }, run: protectedRun(root, calls) }), error => {
    assert.match(error.message, /Installing guesty-cli build dependencies failed/);
    assert.equal(error.exitCode, 13);
    return true;
  });
  assert.equal(calls.length, 1);
  assert.equal(existsSync(join(root, "dist")), false);
});

test("prepare rejects a successful installer that fails to produce the required dependencies", (t) => {
  const root = fixture(t);
  const npm = npmFixture(root, "process.exit(0);\n");
  assert.throws(() => preparePackage({ root, env: { npm_execpath: npm }, run: protectedRun(root) }), /did not install the local TypeScript compiler/);
});

test("compiler failures propagate and the executable helper preserves the failure status", (t) => {
  const root = fixture(t, { dependencies: true });
  installDependencies(root, "process.exit(23);\n");
  assert.throws(() => preparePackage({ root, env: {}, run: protectedRun(root) }), error => {
    assert.equal(error.message, "Compiling guesty-cli failed.");
    assert.equal(error.exitCode, 23);
    return true;
  });
  mkdirSync(join(root, "scripts"));
  writeFileSync(join(root, "scripts", "prepare.mjs"), readFileSync(new URL("../scripts/prepare.mjs", import.meta.url)));
  const result = spawnSync(process.execPath, [join(root, "scripts", "prepare.mjs")], { cwd: tmpdir(), env: {}, encoding: "utf8" });
  assert.equal(result.status, 23);
  assert.match(result.stderr, /Compiling guesty-cli failed/);
});

test("prepare requires a compiled CLI even when the compiler reports success", (t) => {
  const root = fixture(t, { dependencies: true });
  installDependencies(root, "process.exit(0);\n");
  assert.throws(() => preparePackage({ root, env: {}, run: protectedRun(root) }), /did not produce dist\/cli.js/);
});
