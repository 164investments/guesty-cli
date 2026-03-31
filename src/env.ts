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

  for (const envPath of paths) {
    try {
      const content = readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
      return;
    } catch {
      continue;
    }
  }
}
