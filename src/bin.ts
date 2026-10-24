#!/usr/bin/env node

// The installed command. It checks Node.js before loading the CLI, so an old
// version gets a plain message instead of a module error.
import { unsupportedNode } from "./node-version.js";

const problem = unsupportedNode(process.version);
if (problem) {
  process.stderr.write(`${problem}\n`);
  process.exitCode = 1;
} else {
  await import("./cli.js");
}
