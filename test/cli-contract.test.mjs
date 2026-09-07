import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { Command } from "commander";
import { rejectsWithoutRequest, run } from "./fixtures/reservation-runner.mjs";

test("CLI JSON errors do not echo private input snippets", (t) => {
  const result = run(t, ["res", "create", "--data", '{"email":"private-fixture@example.invalid", invalid}']);
  rejectsWithoutRequest(result, /Invalid JSON input/);
  assert.doesNotMatch(result.stderr, /private-fixture/);
});

test("published CLI contract includes every registered command and option", async () => {
  const spec = JSON.parse(readFileSync(new URL("../guesty-cli-spec.json", import.meta.url), "utf8"));
  for (const file of readdirSync(new URL("../dist/commands", import.meta.url)).filter((name) => name.endsWith(".js"))) {
    const module = await import(new URL(`../dist/commands/${file}`, import.meta.url));
    for (const root of Object.values(module).filter((value) => value instanceof Command)) {
      const operations = spec.commands.find((group) => group.name === root.name())?.operations;
      assert.ok(operations, `Missing command group ${root.name()}`);
      const commands = root.commands.length ? root.commands : [root];
      for (const command of commands) {
        const operation = operations.find((item) => item.name === command.name());
        assert.ok(operation, `Missing ${root.name()} ${command.name()}`);
        assert.deepEqual(operation.options.map((option) => option.flags).sort(), command.options.map((option) => option.flags).sort(), `${root.name()} ${command.name()} option coverage`);
        for (const option of command.options) {
          const contract = operation.options.find((item) => item.flags === option.flags);
          assert.equal(contract.required, option.mandatory, `${root.name()} ${command.name()} ${option.flags} required`);
          if (option.argChoices) assert.deepEqual(contract.choices, option.argChoices, `${root.name()} ${command.name()} ${option.flags} choices`);
        }
      }
    }
  }
  assert.ok(spec.operations.some((item) => item.fullCommand === "guesty update"), "Missing top-level update command");
});
