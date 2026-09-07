import { readFileSync, realpathSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";

function getScriptEnvPath(): string | null {
  try {
    const real = realpathSync(process.argv[1]);
    return resolve(dirname(real), "..", ".env");
  } catch {
    return null;
  }
}

export function loadEnv(): void {
  const paths = [
    resolve(homedir(), ".guesty-cli", ".env"),
    getScriptEnvPath(),
    resolve(process.cwd(), ".env"),
  ].filter((p): p is string => p !== null);

  for (const envPath of new Set(paths)) {
    try {
      const content = readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
        if (!match) continue;
        const [, key, raw] = match;
        let val = raw;
        if (val.startsWith('"') || val.startsWith("'")) {
          const quoted = val.startsWith('"') ? /^"((?:\\.|[^"\\])*)"\s*(?:#.*)?$/.exec(val) : /^'([^']*)'\s*(?:#.*)?$/.exec(val);
          if (!quoted) continue;
          val = quoted[1];
        } else {
          val = val.replace(/\s+#.*$/, "").trimEnd();
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    } catch {
      continue;
    }
  }
}
