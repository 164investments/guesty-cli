//! Saved settings in `~/.guesty-cli/.env`.

use std::path::PathBuf;

use crate::env;
use crate::error::{CliError, Result};

pub fn env_file() -> PathBuf {
    env::config_dir().join(".env")
}

/// Replaces the named settings in `~/.guesty-cli/.env` and keeps every other
/// line. `None` removes a setting. The file holds an access key, so only its
/// owner can read it.
pub fn save_settings(values: &[(&str, Option<&str>)]) -> Result<PathBuf> {
    for (name, value) in values {
        let valid_name = !name.is_empty()
            && name.starts_with(|c: char| c.is_ascii_alphabetic() || c == '_')
            && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_');
        let bad_value = value.is_some_and(|v| {
            v.chars()
                .any(|c| (c as u32) < 0x20 || c == '\x7f' || c.is_whitespace() || c == '#' || c == '"' || c == '\'')
        });
        if !valid_name || bad_value {
            return Err(CliError::new(format!("Refusing to save an invalid value for {name}.")));
        }
    }
    let dir = env::config_dir();
    create_private_dir(&dir)?;
    let file = env_file();
    let existing = std::fs::read_to_string(&file).unwrap_or_default();
    let mut kept: Vec<&str> = existing
        .split('\n')
        .filter(|line| {
            let trimmed = line.trim();
            let rest = trimmed
                .strip_prefix("export")
                .filter(|r| r.starts_with(char::is_whitespace))
                .map(str::trim_start)
                .unwrap_or(trimmed);
            let end = rest.find(|c: char| !(c.is_ascii_alphanumeric() || c == '_')).unwrap_or(rest.len());
            let name = &rest[..end];
            let is_assignment = !name.is_empty()
                && !name.starts_with(|c: char| c.is_ascii_digit())
                && rest[end..].trim_start().starts_with('=');
            !(is_assignment && values.iter().any(|(n, _)| *n == name))
        })
        .collect();
    while kept.last().is_some_and(|l| l.trim().is_empty()) {
        kept.pop();
    }
    let mut lines: Vec<String> = kept.iter().map(|s| s.to_string()).collect();
    for (name, value) in values {
        if let Some(v) = value {
            lines.push(format!("{name}={v}"));
        }
    }
    let temporary = dir.join(format!(".env.{}.tmp", std::process::id()));
    let content = if lines.is_empty() { String::new() } else { format!("{}\n", lines.join("\n")) };
    write_private(&temporary, content.as_bytes())?;
    std::fs::rename(&temporary, &file).map_err(|e| CliError::new(e.to_string()))?;
    for (name, value) in values {
        // SAFETY: single-threaded command code; no other thread reads the environment.
        unsafe {
            match value {
                Some(v) => std::env::set_var(name, v),
                None => std::env::remove_var(name),
            }
        }
    }
    Ok(file)
}

pub fn create_private_dir(dir: &std::path::Path) -> Result<()> {
    let mut builder = std::fs::DirBuilder::new();
    builder.recursive(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::DirBuilderExt;
        builder.mode(0o700);
    }
    builder.create(dir).map_err(|e| CliError::new(e.to_string()))
}

/// Writes a file only its owner can read (mode 0600 on a new file).
pub fn write_private(path: &std::path::Path, bytes: &[u8]) -> Result<()> {
    use std::io::Write;
    let mut options = std::fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(path).map_err(|e| CliError::new(e.to_string()))?;
    file.write_all(bytes).map_err(|e| CliError::new(e.to_string()))
}
