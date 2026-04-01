import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execFileSync } from "node:child_process";

const CONFIG_DIR = join(homedir(), ".guesty-cli");
const UPDATE_CHECK_FILE = join(CONFIG_DIR, "update-check.json");
const REPO = "164investments/guesty-cli";
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // check at most every 4 hours
const INSTALL_CMD = `npm install -g git+https://github.com/${REPO}.git`;

interface UpdateCheckData {
  lastCheck: number;
  latestVersion: string | null;
}

function getLocalVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    ) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function loadCheckData(): UpdateCheckData {
  try {
    if (existsSync(UPDATE_CHECK_FILE)) {
      return JSON.parse(readFileSync(UPDATE_CHECK_FILE, "utf8"));
    }
  } catch {}
  return { lastCheck: 0, latestVersion: null };
}

function saveCheckData(data: UpdateCheckData): void {
  try {
    if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(UPDATE_CHECK_FILE, JSON.stringify(data));
  } catch {}
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `https://raw.githubusercontent.com/${REPO}/main/package.json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const pkg = (await res.json()) as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
  }
  return 0;
}

export async function checkForUpdate(): Promise<void> {
  const data = loadCheckData();
  const now = Date.now();

  if (now - data.lastCheck < CHECK_INTERVAL_MS && data.latestVersion) {
    const local = getLocalVersion();
    if (compareVersions(local, data.latestVersion) < 0) {
      printUpdateNotice(local, data.latestVersion);
    }
    return;
  }

  const latest = await fetchLatestVersion();
  if (latest) {
    saveCheckData({ lastCheck: now, latestVersion: latest });
    const local = getLocalVersion();
    if (compareVersions(local, latest) < 0) {
      printUpdateNotice(local, latest);
    }
  } else {
    saveCheckData({ lastCheck: now, latestVersion: data.latestVersion });
  }
}

function printUpdateNotice(current: string, latest: string): void {
  process.stderr.write(
    `\n  Update available: ${current} → ${latest}\n` +
    `  Run: ${INSTALL_CMD}\n\n`
  );
}

export function runSelfUpdate(): void {
  process.stdout.write(`Updating guesty-cli from GitHub...\n`);
  try {
    execFileSync("npm", ["install", "-g", `git+https://github.com/${REPO}.git`], {
      stdio: "inherit",
    });
    process.stdout.write(`\nUpdated successfully!\n`);
  } catch {
    process.stderr.write(`\nUpdate failed. Try running manually:\n  ${INSTALL_CMD}\n`);
    process.exit(1);
  }
}
