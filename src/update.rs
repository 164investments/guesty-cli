//! Update notices and `guesty update` (port of src/update-check.ts).
//!
//! Releases come from GitHub: the latest published, non-draft, non-prerelease
//! release whose `guesty-cli-<version>.tgz` asset is uploaded at the expected
//! address. `guesty update` installs that asset with npm, but only over this
//! CLI's own global npm installation.

use std::cmp::Ordering;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use crate::error::{CliError, Result};
use crate::hooks;
use crate::http;
use crate::json::{self, Json, json};
use crate::output::{flush_out, write_err, write_out};

const REPO: &str = "164investments/guesty-cli";
const CHECK_INTERVAL_MS: f64 = 4.0 * 60.0 * 60.0 * 1000.0;
/// npm 12 refuses packages from a web address unless allowed; npm 10 and 11 accept the flag silently.
const ALLOW_REMOTE: &str = "--allow-remote=all";

fn releases_url() -> String {
    format!("https://github.com/{REPO}/releases/latest")
}

fn update_check_file() -> PathBuf {
    crate::env::config_dir().join("update-check.json")
}

struct Version {
    core: [u128; 3],
    prerelease: Vec<String>,
}

fn identifier(part: &str) -> bool {
    !part.is_empty() && part.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
}

fn numeric(part: &str) -> bool {
    !part.is_empty() && part.chars().all(|c| c.is_ascii_digit())
}

/// Semantic versions: `1.2.3`, `1.2.3-beta.1`, `1.2.3+build`.
fn parse_version(value: &str) -> Option<Version> {
    let (rest, build) = match value.split_once('+') {
        Some((rest, build)) => (rest, Some(build)),
        None => (value, None),
    };
    if build.is_some_and(|b| !b.split('.').all(identifier)) {
        return None;
    }
    let (core, pre) = match rest.split_once('-') {
        Some((core, pre)) => (core, Some(pre)),
        None => (rest, None),
    };
    let numbers: Vec<&str> = core.split('.').collect();
    if numbers.len() != 3 || !numbers.iter().all(|n| numeric(n) && (n.len() == 1 || !n.starts_with('0'))) {
        return None;
    }
    let prerelease: Vec<String> = match pre {
        Some(pre) => {
            if !pre.split('.').all(identifier) {
                return None;
            }
            pre.split('.').map(str::to_string).collect()
        }
        None => Vec::new(),
    };
    if prerelease.iter().any(|p| p.len() > 1 && p.starts_with('0') && numeric(p)) {
        return None;
    }
    // BigInt in the Node CLI; u128 holds any version anyone publishes.
    let mut parsed = [0u128; 3];
    for (slot, n) in parsed.iter_mut().zip(&numbers) {
        *slot = n.parse().ok()?;
    }
    Some(Version { core: parsed, prerelease })
}

fn compare_versions(a: &str, b: &str) -> Ordering {
    let (Some(pa), Some(pb)) = (parse_version(a), parse_version(b)) else { return Ordering::Equal };
    match pa.core.cmp(&pb.core) {
        Ordering::Equal => {}
        other => return other,
    }
    if pa.prerelease.is_empty() || pb.prerelease.is_empty() {
        return match (pa.prerelease.is_empty(), pb.prerelease.is_empty()) {
            (true, true) => Ordering::Equal,
            (false, true) => Ordering::Less,
            _ => Ordering::Greater,
        };
    }
    for index in 0..pa.prerelease.len().max(pb.prerelease.len()) {
        let (Some(left), Some(right)) = (pa.prerelease.get(index), pb.prerelease.get(index)) else {
            return if pa.prerelease.len() <= index { Ordering::Less } else { Ordering::Greater };
        };
        if left == right {
            continue;
        }
        return match (numeric(left), numeric(right)) {
            (true, true) => {
                let (l, r) = (left.trim_start_matches('0'), right.trim_start_matches('0'));
                l.len().cmp(&r.len()).then_with(|| l.cmp(r))
            }
            (true, false) => Ordering::Less,
            (false, true) => Ordering::Greater,
            // JavaScript compares strings by UTF-16 code unit; these are ASCII.
            _ => left.cmp(right),
        };
    }
    Ordering::Equal
}

fn local_version() -> String {
    #[cfg(feature = "test-hooks")]
    if let Ok(version) = std::env::var("GUESTY_TEST_VERSION") {
        return if parse_version(&version).is_some() { version } else { "0.0.0".to_string() };
    }
    env!("CARGO_PKG_VERSION").to_string()
}

struct CheckData {
    last_check: f64,
    latest_version: Option<String>,
}

fn load_check_data() -> CheckData {
    let empty = CheckData { last_check: 0.0, latest_version: None };
    let Ok(text) = std::fs::read_to_string(update_check_file()) else { return empty };
    let Ok(data) = json::parse(&text) else { return empty };
    let Some(object) = data.as_object() else { return empty };
    let source_ok = object.get("source").and_then(Json::as_str) == Some("github-release");
    let last_check = object.get("lastCheck").and_then(Json::as_f64).filter(|n| n.is_finite());
    let latest = match object.get("latestVersion") {
        Some(Json::Null) => Some(None),
        Some(Json::String(v)) if parse_version(v).is_some_and(|p| p.prerelease.is_empty()) => Some(Some(v.clone())),
        _ => None,
    };
    match (source_ok, last_check, latest) {
        (true, Some(last_check), Some(latest_version)) => CheckData { last_check, latest_version },
        _ => empty,
    }
}

fn save_check_data(last_check: f64, latest_version: Option<&str>) {
    let dir = crate::env::config_dir();
    if std::fs::create_dir_all(&dir).is_err() {
        return;
    }
    let body = json::compact(&json!({
        "source": "github-release",
        "lastCheck": json::number(last_check),
        "latestVersion": latest_version,
    }));
    let _ = crate::config::write_private(&update_check_file(), body.as_bytes());
}

struct Release {
    version: String,
    install_url: String,
}

/// Percent-decodes a URL path the way `decodeURIComponent` does; `None` when
/// it would throw.
fn decode_uri_component(value: &str) -> Option<String> {
    let bytes = value.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = value.get(i + 1..i + 3)?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

fn fetch_latest_release() -> Option<Release> {
    let response = http::send(http::Request {
        method: "GET",
        url: &format!("https://api.github.com/repos/{REPO}/releases/latest"),
        headers: vec![
            ("Accept".into(), "application/vnd.github+json".into()),
            ("User-Agent".into(), "guesty-cli".into()),
        ],
        body: None,
        timeout_ms: 3000,
    })
    .ok()?;
    // fetch's redirect: "error" rejects any redirect.
    if (300..400).contains(&response.status) && response.header("location").is_some() {
        return None;
    }
    if !response.ok() {
        return None;
    }
    let release = json::parse(&response.text().ok()?).ok()?;
    let data = release.as_object()?;
    if data.get("draft") != Some(&Json::Bool(false)) || data.get("prerelease") != Some(&Json::Bool(false)) {
        return None;
    }
    let tag = data.get("tag_name")?.as_str()?;
    let assets = data.get("assets")?.as_array()?;
    let version = tag.strip_prefix('v').unwrap_or(tag);
    if !parse_version(version)?.prerelease.is_empty() {
        return None;
    }
    let filename = format!("guesty-cli-{version}.tgz");
    for item in assets {
        let Some(asset) = item.as_object() else { continue };
        let Some(download) = asset.get("browser_download_url").and_then(Json::as_str) else { continue };
        if asset.get("name").and_then(Json::as_str) != Some(filename.as_str())
            || asset.get("state").and_then(Json::as_str) != Some("uploaded")
        {
            continue;
        }
        // `new URL()` throws on an invalid address, which ends the check.
        let url = url::Url::parse(download).ok()?;
        let expected = format!("/{REPO}/releases/download/{tag}/{filename}");
        let origin_ok = url.origin().ascii_serialization() == "https://github.com";
        let clean = url.username().is_empty()
            && url.password().is_none()
            && url.query().is_none_or(str::is_empty)
            && url.fragment().is_none_or(str::is_empty);
        if !origin_ok || !clean || decode_uri_component(url.path())? != expected {
            continue;
        }
        return Some(Release { version: version.to_string(), install_url: url.as_str().to_string() });
    }
    None
}

fn print_update_notice(current: &str, latest: &str) {
    write_err(&format!("\nUpdate available: {current} → {latest}\nRun: guesty update\n\n"));
}

/// After a command at a terminal: a notice when a newer release exists,
/// checking GitHub at most every four hours.
pub fn check_for_update() {
    let data = load_check_data();
    let now = hooks::now_ms();
    if now >= data.last_check && now - data.last_check < CHECK_INTERVAL_MS {
        if let Some(latest) = &data.latest_version {
            if compare_versions(&local_version(), latest) == Ordering::Less {
                print_update_notice(&local_version(), latest);
            }
        }
        return;
    }
    let release = fetch_latest_release();
    let latest = release.map(|r| r.version).or(data.latest_version);
    save_check_data(now, latest.as_deref());
    if let Some(latest) = latest {
        if compare_versions(&local_version(), &latest) == Ordering::Less {
            print_update_notice(&local_version(), &latest);
        }
    }
}

/// The npm package this binary belongs to: the parent of the directory that
/// holds the real executable (`<pkg>/dist/guesty-<target>`, or `<pkg>/dist/bin.js`
/// once the postinstall has replaced it).
fn package_root() -> Option<PathBuf> {
    let exe = std::fs::canonicalize(std::env::current_exe().ok()?).ok()?;
    Some(exe.parent()?.parent()?.to_path_buf())
}

/// A Git checkout of the CLI: the npm package root has `.git`, or the binary
/// was built in a cargo checkout (an ancestor with both Cargo.toml and .git).
fn source_checkout(root: Option<&Path>) -> bool {
    if root.is_some_and(|r| r.join(".git").exists()) {
        return true;
    }
    let Some(exe) = std::env::current_exe().ok().and_then(|e| std::fs::canonicalize(e).ok()) else { return false };
    exe.ancestors().skip(1).any(|dir| dir.join("Cargo.toml").exists() && dir.join(".git").exists())
}

fn npm() -> Command {
    let mut command = Command::new(if cfg!(windows) { "npm.cmd" } else { "npm" });
    command.current_dir(std::env::temp_dir());
    command
}

/// `npm root --global`, with a ten-second limit.
fn npm_global_root() -> Option<PathBuf> {
    let mut child = npm()
        .args(["root", "--global"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .ok()?;
    let started = std::time::Instant::now();
    loop {
        match child.try_wait().ok()? {
            Some(_) => break,
            None if started.elapsed() > std::time::Duration::from_secs(10) => {
                let _ = child.kill();
                let _ = child.wait();
                return None;
            }
            None => std::thread::sleep(std::time::Duration::from_millis(20)),
        }
    }
    let output = child.wait_with_output().ok()?;
    if !output.status.success() {
        return None;
    }
    Some(PathBuf::from(crate::commands::query_options::js_trim(&String::from_utf8_lossy(&output.stdout))))
}

pub fn run_self_update() -> Result<()> {
    let Some(release) = fetch_latest_release() else {
        return Err(CliError::new(format!(
            "Cannot find an installable published GitHub release. See {}",
            releases_url()
        )));
    };
    let local = local_version();
    if compare_versions(&local, &release.version) != Ordering::Less {
        write_out(format!("guesty-cli {local} is up to date.\n").as_bytes());
        return Ok(());
    }
    let install_command = format!("npm install -g {ALLOW_REMOTE} {}", release.install_url);
    // Source checkouts and project-local packages belong to the user. Only
    // replace this CLI's verified global npm installation.
    let root = package_root();
    if source_checkout(root.as_deref()) {
        return Err(CliError::new(format!(
            "This CLI runs from a source checkout. Update it through Git, or install the published package separately:\n  {install_command}"
        )));
    }
    let mismatch = || {
        CliError::new(format!(
            "Cannot verify this CLI as the active global npm installation. Use its original package manager to update, or install the release separately:\n  {install_command}"
        ))
    };
    let global_root = npm_global_root().ok_or_else(mismatch)?;
    let installed = std::fs::canonicalize(global_root.join("guesty-cli")).map_err(|_| mismatch())?;
    let ours = root.as_deref().and_then(|r| std::fs::canonicalize(r).ok()).ok_or_else(mismatch)?;
    if installed != ours {
        return Err(mismatch());
    }
    write_out(format!("Updating guesty-cli {local} → {} from GitHub...\n", release.version).as_bytes());
    flush_out();
    let status = npm().args(["install", "--global", ALLOW_REMOTE, &release.install_url]).status();
    if !status.is_ok_and(|s| s.success()) {
        return Err(CliError::new(format!("Update failed. Try running manually:\n  {install_command}")));
    }
    let package = global_root.join("guesty-cli");
    let unverified = || {
        CliError::new(format!(
            "npm completed, but the installed CLI could not be verified as {}. Try:\n  {install_command}",
            release.version
        ))
    };
    let manifest = std::fs::read_to_string(package.join("package.json")).map_err(|_| unverified())?;
    let installed_version =
        json::parse(&manifest).ok().and_then(|m| m.get("version").and_then(Json::as_str).map(str::to_string));
    if installed_version.as_deref() != Some(release.version.as_str()) || !package.join("dist").join("bin.js").exists() {
        return Err(unverified());
    }
    save_check_data(hooks::now_ms(), Some(&release.version));
    write_out(format!("Updated successfully to {}.\n", release.version).as_bytes());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn versions() {
        let cmp = |a, b| compare_versions(a, b);
        assert_eq!(cmp("1.2.0", "1.2.0"), Ordering::Equal);
        assert_eq!(cmp("1.2.1", "1.2.0"), Ordering::Greater);
        assert_eq!(cmp("1.10.0", "1.2.0"), Ordering::Greater);
        assert_eq!(cmp("1.2.0-beta.2", "1.2.0"), Ordering::Less);
        assert_eq!(cmp("1.2.0+build.4", "1.2.0"), Ordering::Equal);
        assert_eq!(cmp("1.1.9", "1.2.0"), Ordering::Less);
        assert_eq!(cmp("1.0.0-alpha", "1.0.0-alpha.1"), Ordering::Less);
        assert_eq!(cmp("1.0.0-alpha.beta", "1.0.0-beta"), Ordering::Less);
        assert_eq!(cmp("1.0.0-2", "1.0.0-10"), Ordering::Less);
        assert_eq!(cmp("1.0.0-rc.1", "1.0.0-1"), Ordering::Greater);
        assert!(parse_version("01.0.0").is_none());
        assert!(parse_version("1.0.0-01").is_none());
        assert!(parse_version("1.2.0;injected").is_none());
        assert!(parse_version("1.2").is_none());
    }
}
