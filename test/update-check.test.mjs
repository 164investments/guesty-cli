import assert from "node:assert/strict";
import test from "node:test";
import { run, now } from "./fixtures/isolated-runner.mjs";

const repo = "164investments/guesty-cli";
const installUrl = `https://github.com/${repo}/releases/download/v1.2.0/guesty-cli-1.2.0.tgz`;
const release = (overrides = {}) => ({
  tag_name: "v1.2.0", draft: false, prerelease: false,
  assets: [{ name: "guesty-cli-1.2.0.tgz", state: "uploaded", browser_download_url: installUrl }],
  ...overrides,
});
const updater = 'import {checkForUpdate,runSelfUpdate} from "./dist/update-check.js";';
const checkScript = `${updater} await checkForUpdate();`;
const success = (t, options) => {
  const result = run(t, options);
  assert.equal(result.status, 0, result.stderr);
  return result;
};

test("update check reads latest published GitHub release, validates package asset, and writes notices only to stderr", (t) => {
  const result = success(t, { script: checkScript, scenario: { github: { json: release() } } });
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /1\.0\.0 → 1\.2\.0/);
  assert.match(result.stderr, /guesty update/);
  assert.equal(result.trace.requests[0].url, `https://api.github.com/repos/${repo}/releases/latest`);
  assert.equal(result.trace.requests[0].timeout, true);
  assert.equal(result.trace.requests[0].redirect, "error");
  assert.equal(result.trace.tokenReads, 0);
  assert.equal(result.trace.commands.length, 0);
  const saved = JSON.parse(result.trace.writes[0].text);
  assert.equal(saved.source, "github-release");
  assert.equal(saved.latestVersion, "1.2.0");
});

test("cached update notices avoid another network request for four hours", (t) => {
  const result = success(t, { script: checkScript, scenario: { checkData: { source: "github-release", lastCheck: now - 1000, latestVersion: "1.2.0" } } });
  assert.match(result.stderr, /Update available/);
  assert.equal(result.trace.requests.length, 0);
  assert.equal(result.trace.writes.length, 0);
});

test("failed checks are cached even before any latest version is known", (t) => {
  const result = success(t, { script: `${updater} await checkForUpdate(); await checkForUpdate();`, scenario: { github: { throw: true } } });
  assert.equal(result.stdout + result.stderr, "");
  assert.equal(result.trace.requests.length, 1);
  assert.equal(JSON.parse(result.trace.writes[0].text).latestVersion, null);
});

for (const data of [null, [], "invalid-json", { lastCheck: now, latestVersion: "99.0.0" }, { source: "github-release", lastCheck: "invalid", latestVersion: "1.2.0" }, { source: "github-release", lastCheck: now + 999999, latestVersion: "1.2.0" }, { source: "github-release", lastCheck: now, latestVersion: { broken: true } }]) {
  test(`malformed, legacy-main, or future cache is refreshed safely (${JSON.stringify(data)})`, (t) => {
    const result = success(t, { script: checkScript, scenario: { checkData: data, github: { json: release() } } });
    assert.equal(result.trace.requests.length, 1);
    assert.doesNotMatch(result.stderr, /99\.0\.0/);
  });
}

for (const [version, updateExpected] of [["1.2.0", false], ["1.2.1", false], ["1.10.0", false], ["1.2.0-beta.2", true], ["1.2.0+build.4", false], ["1.1.9", true]]) {
  test(`semantic version comparison for installed ${version}`, (t) => {
    const result = success(t, { script: checkScript, scenario: { localVersion: version, github: { json: release() } } });
    assert.equal(result.stderr.includes("Update available"), updateExpected);
  });
}

const invalidReleases = [
  ["draft", release({ draft: true })],
  ["prerelease", release({ prerelease: true })],
  ["prerelease tag", release({ tag_name: "v1.2.0-beta.1" })],
  ["invalid tag", release({ tag_name: "v1.2.0;injected" })],
  ["malformed response", null],
  ["missing asset", release({ assets: [] })],
  ["unuploaded asset", release({ assets: [{ name: "guesty-cli-1.2.0.tgz", state: "new", browser_download_url: installUrl }] })],
  ["different repository asset", release({ assets: [{ name: "guesty-cli-1.2.0.tgz", state: "uploaded", browser_download_url: installUrl.replace(repo, "other/guesty-cli") }] })],
  ["different version asset", release({ assets: [{ name: "guesty-cli-1.2.0.tgz", state: "uploaded", browser_download_url: installUrl.replace("/v1.2.0/", "/v1.1.0/") }] })],
  ["external asset", release({ assets: [{ name: "guesty-cli-1.2.0.tgz", state: "uploaded", browser_download_url: "https://other.invalid/guesty-cli-1.2.0.tgz" }] })],
  ["credential URL", release({ assets: [{ name: "guesty-cli-1.2.0.tgz", state: "uploaded", browser_download_url: installUrl.replace("https://", "https://user:password@") }] })],
];
for (const [name, data] of invalidReleases) {
  test(`self-update rejects ${name} without running npm`, (t) => {
    const result = run(t, { args: ["update"], scenario: { sourceCheckout: false, github: { raw: JSON.stringify(data) } } });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Cannot find an installable published GitHub release/);
    assert.equal(result.trace.commands.length, 0);
  });
}

test("self-update protects source checkouts and offers the exact released tarball", (t) => {
  const result = run(t, { args: ["update"], scenario: { github: { json: release() } } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /source checkout/);
  assert.ok(result.stderr.includes(`npm install -g ${installUrl}`));
  assert.equal(result.trace.commands.length, 0);
  assert.equal(result.trace.writes.length, 0);
});

test("self-update protects project-local or mismatched global installations", (t) => {
  const result = run(t, { args: ["update"], scenario: { sourceCheckout: false, globalMismatch: true, github: { json: release() } } });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Cannot verify this CLI/);
  assert.equal(result.trace.commands.length, 1);
  assert.deepEqual(result.trace.commands[0].args, ["root", "--global"]);
});

test("self-update installs the exact release asset in the verified global npm prefix and verifies its version", (t) => {
  const result = success(t, { args: ["update"], scenario: { sourceCheckout: false, github: { json: release() } } });
  assert.equal(result.trace.commands.length, 2);
  assert.deepEqual(result.trace.commands[1].args, ["install", "--global", installUrl]);
  assert.ok(result.trace.commands.every(({ command }) => command === "npm"));
  assert.match(result.stdout, /Updated successfully to 1\.2\.0/);
  assert.equal(result.trace.tokenReads, 0);
  assert.equal(result.trace.requests.length, 1);
});

for (const [name, scenario] of [["npm failure", { installFails: true }], ["wrong installed version", { installedVersion: "1.1.0" }], ["missing CLI build", { installedMissingEntry: true }]]) {
  test(`self-update reports ${name} instead of claiming success`, (t) => {
    const result = run(t, { args: ["update"], scenario: { sourceCheckout: false, github: { json: release() }, ...scenario } });
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout, /Updated successfully/);
    assert.ok(result.stderr.includes(installUrl));
    assert.equal(result.trace.writes.length, 0);
  });
}

test("already-current and newer installations are not downgraded", (t) => {
  for (const localVersion of ["1.2.0", "2.0.0"]) {
    const result = success(t, { args: ["update"], scenario: { localVersion, github: { json: release() } } });
    assert.match(result.stdout, /up to date/);
    assert.equal(result.trace.commands.length, 0);
  }
});

for (const args of [["--help"], ["--version"], ["raw", "--help"], ["init"]]) {
  test(`${args.join(" ")} never waits for an update check`, (t) => {
    const result = success(t, { args, scenario: { github: { throw: true } } });
    assert.equal(result.trace.requests.length, 0);
  });
}
