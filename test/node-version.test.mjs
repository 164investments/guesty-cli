import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { unsupportedNode } from "../dist/node-version.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

test("Node.js older than 20.12 gets a plain message naming the version it found", () => {
  for (const version of ["v14.21.3", "v18.20.8", "v20.11.1"]) {
    const message = unsupportedNode(version);
    assert.match(message ?? "", /needs Node\.js 20\.12 or later/);
    assert.ok(message?.includes(version));
  }
  for (const version of ["v20.12.0", "v20.19.5", "v22.0.0", "v26.12.0"]) {
    assert.equal(unsupportedNode(version), undefined, version);
  }
});

test("the installed command loads the CLI on a supported Node.js", () => {
  assert.equal(pkg.bin.guesty, "dist/bin.js");
  const result = spawnSync(process.execPath, [join(root, pkg.bin.guesty), "--version"], { encoding: "utf8", timeout: 10_000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), pkg.version);
});
