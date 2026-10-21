import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const CONFIG_ENV_FILE = join(homedir(), ".guesty-cli", ".env");

// Replaces the named settings in ~/.guesty-cli/.env and keeps every other line.
// A null value removes the setting. The file holds an access key, so only its
// owner can read it.
export function saveSettings(values: Record<string, string | null>): string {
  for (const [name, value] of Object.entries(values)) {
    // One setting per line: a value with a line break could add other settings.
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || (value !== null && /[\x00-\x1f\x7f\s#"']/.test(value))) {
      throw new Error(`Refusing to save an invalid value for ${name}.`);
    }
  }
  mkdirSync(join(homedir(), ".guesty-cli"), { recursive: true, mode: 0o700 });
  let lines: string[] = [];
  try {
    lines = readFileSync(CONFIG_ENV_FILE, "utf8").split("\n");
  } catch {
    lines = [];
  }
  const kept = lines.filter((line) => {
    const name = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line.trim())?.[1];
    return !(name && name in values);
  });
  while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
  for (const [name, value] of Object.entries(values)) {
    if (value !== null) kept.push(`${name}=${value}`);
  }
  const temporary = `${CONFIG_ENV_FILE}.${process.pid}.tmp`;
  writeFileSync(temporary, kept.length ? `${kept.join("\n")}\n` : "", { mode: 0o600 });
  renameSync(temporary, CONFIG_ENV_FILE);
  for (const [name, value] of Object.entries(values)) {
    if (value === null) delete process.env[name];
    else process.env[name] = value;
  }
  return CONFIG_ENV_FILE;
}
