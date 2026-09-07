import { readFileSync, writeFileSync, existsSync, mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const CONFIG_DIR = join(homedir(), ".guesty-cli");
const UPDATE_CHECK_FILE = join(CONFIG_DIR, "update-check.json");
const REPO = "164investments/guesty-cli";
const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const PACKAGE_ROOT = fileURLToPath(new URL("../", import.meta.url));

interface Version {
  core: bigint[];
  prerelease: string[];
}
interface UpdateCheckData {
  source: "github-release";
  lastCheck: number;
  latestVersion: string | null;
}
interface Release {
  version: string;
  installUrl: string;
}

function parseVersion(value: unknown): Version | null {
  if (typeof value !== "string") return null;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/.exec(value);
  if (!match) return null;
  const prerelease = match[4]?.split(".") ?? [];
  if (prerelease.some((part) => /^0\d+$/.test(part))) return null;
  return { core: match.slice(1, 4).map(BigInt), prerelease };
}

function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return 0;
  for (let index = 0; index < 3; index++) {
    if (pa.core[index] < pb.core[index]) return -1;
    if (pa.core[index] > pb.core[index]) return 1;
  }
  if (pa.prerelease.length === 0 || pb.prerelease.length === 0) {
    return pa.prerelease.length === pb.prerelease.length ? 0 : pa.prerelease.length ? -1 : 1;
  }
  for (let index = 0; index < Math.max(pa.prerelease.length, pb.prerelease.length); index++) {
    const left = pa.prerelease[index];
    const right = pb.prerelease[index];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    if (left === right) continue;
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric) return BigInt(left) < BigInt(right) ? -1 : 1;
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return left < right ? -1 : 1;
  }
  return 0;
}

function getLocalVersion(): string {
  try {
    const pkg: unknown = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"));
    const version = pkg && typeof pkg === "object" && "version" in pkg ? pkg.version : undefined;
    return parseVersion(version) ? version as string : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function loadCheckData(): UpdateCheckData {
  try {
    const data: unknown = JSON.parse(readFileSync(UPDATE_CHECK_FILE, "utf8"));
    if (data && typeof data === "object" && "source" in data && data.source === "github-release" &&
      "lastCheck" in data && typeof data.lastCheck === "number" && Number.isFinite(data.lastCheck) &&
      "latestVersion" in data && (data.latestVersion === null || parseVersion(data.latestVersion)?.prerelease.length === 0)) {
      return data as UpdateCheckData;
    }
  } catch {}
  return { source: "github-release", lastCheck: 0, latestVersion: null };
}

function saveCheckData(lastCheck: number, latestVersion: string | null): void {
  try {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeFileSync(UPDATE_CHECK_FILE, JSON.stringify({ source: "github-release", lastCheck, latestVersion }), { mode: 0o600 });
  } catch {}
}

async function fetchLatestRelease(): Promise<Release | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "guesty-cli" },
      signal: AbortSignal.timeout(3000),
      redirect: "error",
    });
    if (!res.ok) return null;
    const release: unknown = await res.json();
    if (!release || typeof release !== "object") return null;
    const data = release as Record<string, unknown>;
    if (data.draft !== false || data.prerelease !== false || typeof data.tag_name !== "string" || !Array.isArray(data.assets)) return null;
    const version = data.tag_name.replace(/^v/, "");
    const parsed = parseVersion(version);
    if (!parsed || parsed.prerelease.length) return null;
    const filename = `guesty-cli-${version}.tgz`;
    for (const item of data.assets) {
      if (!item || typeof item !== "object") continue;
      const asset = item as Record<string, unknown>;
      if (asset.name !== filename || asset.state !== "uploaded" || typeof asset.browser_download_url !== "string") continue;
      const url = new URL(asset.browser_download_url);
      if (url.origin !== "https://github.com" || url.username || url.password || url.search || url.hash ||
        decodeURIComponent(url.pathname) !== `/${REPO}/releases/download/${data.tag_name}/${filename}`) continue;
      return { version, installUrl: url.href };
    }
    return null;
  } catch {
    return null;
  }
}

function printUpdateNotice(current: string, latest: string): void {
  process.stderr.write(`\nUpdate available: ${current} → ${latest}\nRun: guesty update\n\n`);
}

export async function checkForUpdate(): Promise<void> {
  const data = loadCheckData();
  const now = Date.now();
  if (now >= data.lastCheck && now - data.lastCheck < CHECK_INTERVAL_MS) {
    if (data.latestVersion && compareVersions(getLocalVersion(), data.latestVersion) < 0) {
      printUpdateNotice(getLocalVersion(), data.latestVersion);
    }
    return;
  }
  const release = await fetchLatestRelease();
  saveCheckData(now, release?.version ?? data.latestVersion);
  const latest = release?.version ?? data.latestVersion;
  if (latest && compareVersions(getLocalVersion(), latest) < 0) printUpdateNotice(getLocalVersion(), latest);
}

export async function runSelfUpdate(): Promise<void> {
  const release = await fetchLatestRelease();
  if (!release) throw new Error(`Cannot find an installable published GitHub release. See ${RELEASES_URL}`);
  const local = getLocalVersion();
  if (compareVersions(local, release.version) >= 0) {
    process.stdout.write(`guesty-cli ${local} is up to date.\n`);
    return;
  }
  const installCommand = `npm install -g ${release.installUrl}`;
  // npm-linked source checkouts and project-local packages belong to the user.
  // Only replace this CLI's verified global npm installation.
  if (existsSync(join(PACKAGE_ROOT, ".git"))) {
    throw new Error(`This CLI runs from a source checkout. Update it through Git, or install the published package separately:\n  ${installCommand}`);
  }
  let globalRoot: string;
  try {
    globalRoot = execFileSync("npm", ["root", "--global"], { encoding: "utf8", timeout: 10_000, cwd: tmpdir(), stdio: ["ignore", "pipe", "pipe"] }).trim();
    if (realpathSync(join(globalRoot, "guesty-cli")) !== realpathSync(PACKAGE_ROOT)) {
      throw new Error("installation mismatch");
    }
  } catch {
    throw new Error(`Cannot verify this CLI as the active global npm installation. Use its original package manager to update, or install the release separately:\n  ${installCommand}`);
  }
  process.stdout.write(`Updating guesty-cli ${local} → ${release.version} from GitHub...\n`);
  try {
    execFileSync("npm", ["install", "--global", release.installUrl], { stdio: "inherit", cwd: tmpdir() });
  } catch {
    throw new Error(`Update failed. Try running manually:\n  ${installCommand}`);
  }
  const installed: unknown = JSON.parse(readFileSync(join(globalRoot, "guesty-cli", "package.json"), "utf8"));
  if (!installed || typeof installed !== "object" || !("version" in installed) || installed.version !== release.version ||
    !existsSync(join(globalRoot, "guesty-cli", "dist", "cli.js"))) {
    throw new Error(`npm completed, but the installed CLI could not be verified as ${release.version}. Try:\n  ${installCommand}`);
  }
  saveCheckData(Date.now(), release.version);
  process.stdout.write(`Updated successfully to ${release.version}.\n`);
}
