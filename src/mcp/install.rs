//! Adds the Guesty MCP server to AI apps on this computer (port of PR #18's
//! `src/mcp/install.ts`). Each app keeps its own settings; only the
//! "guesty-cli" entry is added or replaced, never anything else.

use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use crate::env::home;
use crate::error::{CliError, Result};
use crate::json::{self, Json, Map, json};

pub const SERVER_NAME: &str = "guesty-cli";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Client {
    ClaudeCode,
    Codex,
    Cursor,
    ClaudeDesktop,
}

/// (value, label, hint), in the order apps are listed and installed.
pub const CLIENTS: [(Client, &str, &str, &str); 4] = [
    (Client::ClaudeCode, "claude-code", "Claude Code", "uses the claude command"),
    (Client::Codex, "codex", "Codex", "~/.codex/config.toml"),
    (Client::Cursor, "cursor", "Cursor", "~/.cursor/mcp.json"),
    (Client::ClaudeDesktop, "claude-desktop", "Claude Desktop", "claude_desktop_config.json"),
];

impl Client {
    pub fn value(self) -> &'static str {
        CLIENTS.iter().find(|c| c.0 == self).map(|c| c.1).unwrap_or("")
    }

    pub fn label(self) -> &'static str {
        CLIENTS.iter().find(|c| c.0 == self).map(|c| c.2).unwrap_or("")
    }

    pub fn from_value(value: &str) -> Option<Client> {
        CLIENTS.iter().find(|c| c.1 == value).map(|c| c.0)
    }
}

pub fn client_values() -> String {
    CLIENTS.iter().map(|c| c.1).collect::<Vec<_>>().join(", ")
}

pub struct Launch {
    pub command: String,
    pub args: Vec<String>,
}

impl Launch {
    pub fn to_json(&self) -> Json {
        json!({ "command": self.command, "args": self.args })
    }
}

fn path_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

/// Node's `path.join(...parts)`: joined with "/" and normalized ("." and ".."
/// segments resolved, repeated separators collapsed).
fn join(parts: &[&str]) -> PathBuf {
    if cfg!(windows) {
        return parts.iter().filter(|p| !p.is_empty()).collect();
    }
    let joined = parts.iter().filter(|p| !p.is_empty()).copied().collect::<Vec<_>>().join("/");
    let absolute = joined.starts_with('/');
    let trailing = joined.ends_with('/');
    let mut stack: Vec<&str> = Vec::new();
    for segment in joined.split('/') {
        match segment {
            "" | "." => {}
            ".." if stack.last().is_some_and(|s| *s != "..") => {
                stack.pop();
            }
            ".." if absolute => {}
            other => stack.push(other),
        }
    }
    let mut out = stack.join("/");
    if out.is_empty() && !absolute {
        out.push('.');
    }
    if trailing && !stack.is_empty() {
        out.push('/');
    }
    PathBuf::from(if absolute { format!("/{out}") } else { out })
}

fn on_path(command: &str) -> Option<PathBuf> {
    let (delimiter, extensions): (char, &[&str]) =
        if cfg!(windows) { (';', &["", ".cmd", ".exe"]) } else { (':', &[""]) };
    let path = std::env::var("PATH").unwrap_or_default();
    for directory in path.split(delimiter) {
        if directory.is_empty() {
            continue;
        }
        for extension in extensions {
            let candidate = join(&[directory, &format!("{command}{extension}")]);
            if std::fs::metadata(&candidate).is_ok_and(|m| m.is_file()) {
                return Some(candidate);
            }
        }
    }
    None
}

/// Desktop apps don't start with the terminal's PATH, so the server launches
/// with an absolute path: this executable, with symlinks resolved. (The Node
/// CLI ran node with its script; the native binary runs itself.)
pub fn launch_command(read_only: bool) -> Result<Launch> {
    let exe = std::env::current_exe()?;
    let real = std::fs::canonicalize(&exe).unwrap_or(exe);
    let mut args = vec!["mcp".to_string()];
    if read_only {
        args.push("--read-only".into());
    }
    Ok(Launch { command: path_string(&real), args })
}

/// `process.env[name] ?? fallback`: a variable that is set wins, even when empty.
fn env_or(name: &str, fallback: impl FnOnce() -> String) -> String {
    std::env::var_os(name).map(|v| v.to_string_lossy().into_owned()).unwrap_or_else(fallback)
}

fn home_str() -> String {
    path_string(&home())
}

pub fn claude_desktop_config() -> PathBuf {
    if cfg!(target_os = "macos") {
        return join(&[&home_str(), "Library", "Application Support", "Claude", "claude_desktop_config.json"]);
    }
    let dir = if cfg!(windows) {
        env_or("APPDATA", || path_string(&join(&[&home_str(), "AppData", "Roaming"])))
    } else {
        env_or("XDG_CONFIG_HOME", || path_string(&join(&[&home_str(), ".config"])))
    };
    join(&[&dir, "Claude", "claude_desktop_config.json"])
}

fn codex_home() -> PathBuf {
    PathBuf::from(env_or("CODEX_HOME", || path_string(&join(&[&home_str(), ".codex"]))))
}

fn cursor_config() -> PathBuf {
    join(&[&home_str(), ".cursor", "mcp.json"])
}

pub fn detect_clients() -> Vec<Client> {
    let mut found = Vec::new();
    if on_path("claude").is_some() {
        found.push(Client::ClaudeCode);
    }
    if on_path("codex").is_some() || codex_home().exists() {
        found.push(Client::Codex);
    }
    if join(&[&home_str(), ".cursor"]).exists() {
        found.push(Client::Cursor);
    }
    if claude_desktop_config().parent().is_some_and(Path::exists) {
        found.push(Client::ClaudeDesktop);
    }
    found
}

/// Node's message for a failed file operation, e.g. `EACCES: permission denied, open 'x'`.
fn fs_error(e: &std::io::Error, syscall: &str, path: &Path) -> CliError {
    let path = path_string(path);
    let (code, text) = match e.kind() {
        std::io::ErrorKind::NotFound => ("ENOENT", "no such file or directory"),
        std::io::ErrorKind::PermissionDenied => ("EACCES", "permission denied"),
        std::io::ErrorKind::IsADirectory => return CliError::new("EISDIR: illegal operation on a directory, read"),
        std::io::ErrorKind::NotADirectory => ("ENOTDIR", "not a directory"),
        _ => return CliError::new(format!("{e}, {syscall} '{path}'")),
    };
    CliError::new(format!("{code}: {text}, {syscall} '{path}'"))
}

fn mode_of(path: &Path) -> Option<u32> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::metadata(path).ok().map(|m| m.permissions().mode() & 0o777)
    }
    #[cfg(not(unix))]
    {
        let _ = path;
        None
    }
}

/// Writes through a temporary file and keeps the original's permissions, since
/// these files can hold other servers' secrets.
fn write_atomically(file: &Path, content: &str) -> Result<()> {
    if let Some(dir) = file.parent().filter(|d| !d.as_os_str().is_empty()) {
        std::fs::create_dir_all(dir).map_err(|e| fs_error(&e, "mkdir", dir))?;
    }
    let mode = if file.exists() { mode_of(file).unwrap_or(0o644) } else { 0o644 };
    let temporary = PathBuf::from(format!("{}.guesty-cli-tmp", path_string(file)));
    #[cfg(unix)]
    {
        use std::io::Write;
        use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
        let mut handle = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(mode)
            .open(&temporary)
            .map_err(|e| fs_error(&e, "open", &temporary))?;
        handle.write_all(content.as_bytes()).map_err(|e| fs_error(&e, "write", &temporary))?;
        std::fs::set_permissions(&temporary, std::fs::Permissions::from_mode(mode))
            .map_err(|e| fs_error(&e, "chmod", &temporary))?;
    }
    #[cfg(not(unix))]
    {
        let _ = mode;
        std::fs::write(&temporary, content).map_err(|e| fs_error(&e, "open", &temporary))?;
    }
    std::fs::rename(&temporary, file).map_err(|e| fs_error(&e, "rename", &temporary))?;
    Ok(())
}

fn add_to_json_config(file: &Path, launch: &Launch) -> Result<String> {
    let shown = path_string(file);
    let mut config = Json::Object(Map::new());
    if file.exists() {
        let raw = std::fs::read_to_string(file).map_err(|e| fs_error(&e, "open", file))?;
        if !super::js::trim(&raw).is_empty() {
            config = json::parse(&raw).map_err(|_| {
                CliError::new(format!(
                    "{shown} isn't valid JSON, so it wasn't changed. Fix it, or run guesty mcp install --print and add the server by hand."
                ))
            })?;
        }
        if !config.is_object() {
            return Err(CliError::new(format!("{shown} isn't a JSON object, so it wasn't changed.")));
        }
    }
    let object = config.as_object_mut().expect("object");
    let mut servers = match object.get("mcpServers") {
        Some(Json::Object(servers)) => servers.clone(),
        _ => Map::new(),
    };
    let replaced = servers.contains_key(SERVER_NAME);
    servers.insert(SERVER_NAME.into(), launch.to_json());
    object.insert("mcpServers".into(), Json::Object(servers));
    write_atomically(file, &format!("{}\n", json::pretty(&config, 2)))?;
    Ok(format!("{} {SERVER_NAME} in {shown}", if replaced { "Updated" } else { "Added" }))
}

/// `/^\s*\[\s*mcp_servers\s*\.\s*(?:"guesty-cli"|guesty-cli)\s*(?:\.[^\]]*)?\]\s*(?:#.*)?$/`:
/// the [mcp_servers.guesty-cli] table or one of its subtables.
fn is_our_table(line: &str) -> bool {
    let skip = |s: &str| s.trim_start_matches(super::js::is_space).to_string();
    let Some(rest) = skip(line).strip_prefix('[').map(skip) else { return false };
    let Some(rest) = rest.strip_prefix("mcp_servers").map(skip) else { return false };
    let Some(rest) = rest.strip_prefix('.').map(skip) else { return false };
    let Some(rest) = rest.strip_prefix("\"guesty-cli\"").or_else(|| rest.strip_prefix("guesty-cli")).map(skip) else {
        return false;
    };
    let rest = match rest.strip_prefix('.') {
        Some(sub) => match sub.find(']') {
            Some(end) => sub[end..].to_string(),
            None => return false,
        },
        None => rest,
    };
    let Some(after) = rest.strip_prefix(']') else { return false };
    let after = skip(after);
    // `.` stops at line terminators, so a comment can't run past one.
    after.is_empty() || (after.starts_with('#') && !after.contains(['\r', '\u{2028}', '\u{2029}']))
}

/// Drops any existing [mcp_servers.guesty-cli] table (and its subtables), then appends ours.
fn add_to_codex_toml(file: &Path, launch: &Launch) -> Result<String> {
    let raw = if file.exists() {
        std::fs::read_to_string(file).map_err(|e| fs_error(&e, "open", file))?
    } else {
        String::new()
    };
    let mut kept: Vec<&str> = Vec::new();
    let mut skipping = false;
    let mut replaced = false;
    for line in raw.split('\n') {
        if line.trim_start_matches(super::js::is_space).starts_with('[') {
            skipping = is_our_table(line);
            if skipping {
                replaced = true;
            }
        }
        if !skipping {
            kept.push(line);
        }
    }
    let joined = kept.join("\n");
    let body = joined.trim_end_matches('\n');
    let table = [
        format!("[mcp_servers.{SERVER_NAME}]"),
        format!("command = {}", json::quote(&launch.command)),
        format!("args = [{}]", launch.args.iter().map(|a| json::quote(a)).collect::<Vec<_>>().join(", ")),
    ]
    .join("\n");
    let content = if body.is_empty() { format!("{table}\n") } else { format!("{body}\n\n{table}\n") };
    write_atomically(file, &content)?;
    Ok(format!("{} {SERVER_NAME} in {}", if replaced { "Updated" } else { "Added" }, path_string(file)))
}

/// `execFileSync(command, args)` with no input: fails, with Node's message, on
/// a nonzero exit, a failure to start, or after 30 seconds.
fn run(command: &Path, args: &[String]) -> std::result::Result<(), String> {
    let mut cmd = if cfg!(windows) {
        // Windows runs these CLIs through .cmd shims, which need a shell and quoting.
        let quoted: Vec<String> = args
            .iter()
            .map(|a| if a.contains([' ', '\t', '"']) { format!("\"{}\"", a.replace('"', "\\\"")) } else { a.clone() })
            .collect();
        let mut c = std::process::Command::new("cmd.exe");
        c.arg("/d").arg("/s").arg("/c").arg(format!("{} {}", path_string(command), quoted.join(" ")));
        c
    } else {
        let mut c = std::process::Command::new(command);
        c.args(args);
        c
    };
    let shown = path_string(command);
    let mut child = cmd
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("spawnSync {shown} {}", fs_code(&e)))?;
    let mut stderr = child.stderr.take();
    let reader = std::thread::spawn(move || {
        let mut text = Vec::new();
        if let Some(s) = stderr.as_mut() {
            let _ = std::io::Read::read_to_end(s, &mut text);
        }
        text
    });
    let deadline = Instant::now() + Duration::from_secs(30);
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break Some(status),
            Ok(None) if Instant::now() < deadline => std::thread::sleep(Duration::from_millis(10)),
            _ => {
                let _ = child.kill();
                let _ = child.wait();
                break None;
            }
        }
    };
    let output = reader.join().unwrap_or_default();
    match status {
        None => Err(format!("spawnSync {shown} ETIMEDOUT")),
        Some(s) if s.success() => Ok(()),
        Some(_) => {
            let mut message = format!(
                "Command failed: {}",
                std::iter::once(shown).chain(args.iter().cloned()).collect::<Vec<_>>().join(" ")
            );
            if !output.is_empty() {
                message.push('\n');
                message.push_str(&String::from_utf8_lossy(&output));
            }
            Err(message)
        }
    }
}

fn fs_code(e: &std::io::Error) -> &'static str {
    match e.kind() {
        std::io::ErrorKind::NotFound => "ENOENT",
        std::io::ErrorKind::PermissionDenied => "EACCES",
        _ => "EIO",
    }
}

fn strings(values: &[&str]) -> Vec<String> {
    values.iter().map(|s| s.to_string()).collect()
}

fn install_claude_code(launch: &Launch) -> Result<String> {
    let Some(claude) = on_path("claude") else {
        let shown: Vec<String> = std::iter::once(&launch.command).chain(&launch.args).map(|a| json::quote(a)).collect();
        return Err(CliError::new(format!(
            "The claude command isn't on PATH. In a terminal where it is, run: claude mcp add --scope user {SERVER_NAME} -- {}",
            shown.join(" ")
        )));
    };
    // Not added before, if this fails.
    let _ = run(&claude, &strings(&["mcp", "remove", "--scope", "user", SERVER_NAME]));
    let mut add = strings(&["mcp", "add", "--scope", "user", SERVER_NAME, "--"]);
    add.push(launch.command.clone());
    add.extend(launch.args.iter().cloned());
    run(&claude, &add).map_err(CliError::new)?;
    Ok(format!(
        "Added {SERVER_NAME} to Claude Code for your user. Start a new Claude Code session, or run /mcp, to use it."
    ))
}

fn install_codex(launch: &Launch) -> Result<String> {
    if let Some(codex) = on_path("codex") {
        let _ = run(&codex, &strings(&["mcp", "remove", SERVER_NAME]));
        let mut add = strings(&["mcp", "add", SERVER_NAME, "--"]);
        add.push(launch.command.clone());
        add.extend(launch.args.iter().cloned());
        if run(&codex, &add).is_ok() {
            return Ok(format!("Added {SERVER_NAME} to Codex. Start a new Codex session to use it."));
        }
        // Older Codex versions have no "mcp add"; edit its settings file instead.
    }
    let config = join(&[&path_string(&codex_home()), "config.toml"]);
    Ok(format!("{}. Start a new Codex session to use it.", add_to_codex_toml(&config, launch)?))
}

pub struct InstallResult {
    pub ok: bool,
    pub message: String,
}

pub fn install_client(client: Client, launch: &Launch) -> InstallResult {
    let result = match client {
        Client::ClaudeCode => install_claude_code(launch),
        Client::Codex => install_codex(launch),
        Client::Cursor => {
            add_to_json_config(&cursor_config(), launch).map(|m| format!("{m}. Restart Cursor to use it."))
        }
        Client::ClaudeDesktop => add_to_json_config(&claude_desktop_config(), launch)
            .map(|m| format!("{m}. Quit and reopen Claude Desktop to use it.")),
    };
    match result {
        Ok(message) => InstallResult { ok: true, message },
        Err(e) => InstallResult { ok: false, message: e.message() },
    }
}

pub fn parse_clients(value: &str) -> Result<Vec<Client>> {
    let names: Vec<&str> =
        value.split(|c: char| super::js::is_space(c) || c == ',').filter(|n| !n.is_empty()).collect();
    let unknown: Vec<&str> = names.iter().copied().filter(|n| Client::from_value(n).is_none()).collect();
    if !unknown.is_empty() || names.is_empty() {
        let listed = if unknown.is_empty() { "(none)".to_string() } else { unknown.join(", ") };
        return Err(CliError::new(format!("Unknown app {listed}. Use {}.", client_values())));
    }
    let mut clients = Vec::new();
    for name in names {
        let client = Client::from_value(name).expect("known");
        if !clients.contains(&client) {
            clients.push(client);
        }
    }
    Ok(clients)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_our_codex_tables() {
        for line in [
            "[mcp_servers.guesty-cli]",
            " [ mcp_servers . \"guesty-cli\" ] # x",
            "[mcp_servers.guesty-cli.env]",
            "[mcp_servers.guesty-cli]\r",
        ] {
            assert!(is_our_table(line), "{line}");
        }
        for line in [
            "[mcp_servers.guesty-cli2]",
            "[mcp_servers.other]",
            "[mcp_servers.guesty-cli] # c\r",
            "[mcp_servers.guesty-cli] x",
        ] {
            assert!(!is_our_table(line), "{line}");
        }
    }

    #[test]
    fn joins_like_node() {
        assert_eq!(join(&[".", "config.toml"]), PathBuf::from("config.toml"));
        assert_eq!(join(&["/a//b/", "../c", "./d"]), PathBuf::from("/a/c/d"));
        assert_eq!(join(&["", "Claude", "x.json"]), PathBuf::from("Claude/x.json"));
        assert_eq!(join(&["../..", "x"]), PathBuf::from("../../x"));
        assert_eq!(join(&["/", ".."]), PathBuf::from("/"));
    }

    #[test]
    fn parses_app_names() {
        assert_eq!(parse_clients("cursor, codex cursor").unwrap(), vec![Client::Cursor, Client::Codex]);
        assert_eq!(
            parse_clients(" , ").unwrap_err().message(),
            "Unknown app (none). Use claude-code, codex, cursor, claude-desktop."
        );
        assert_eq!(
            parse_clients("chatgpt,cursor").unwrap_err().message(),
            "Unknown app chatgpt. Use claude-code, codex, cursor, claude-desktop."
        );
    }
}
