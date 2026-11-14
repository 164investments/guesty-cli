//! Settings from `.env` files, read once at startup like the Node CLI: the
//! user's `~/.guesty-cli/.env`, a `.env` next to the installed package, and
//! the working directory's `.env`. A variable already set wins, and earlier
//! files win over later ones.

use std::collections::HashSet;
use std::path::{Path, PathBuf};

/// Node's `os.homedir()`: `HOME` (or the user's passwd entry) on macOS and
/// Linux, `USERPROFILE` (or the profile folder) on Windows, where `HOME` is
/// usually unset.
pub fn home() -> PathBuf {
    std::env::home_dir().filter(|p| !p.as_os_str().is_empty()).unwrap_or_else(|| PathBuf::from("/"))
}

pub fn config_dir() -> PathBuf {
    home().join(".guesty-cli")
}

/// The package root: the Node CLI read `<dist>/../.env` next to its script.
/// The binary lives in `dist/` of the npm package too.
fn script_env_path() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    let real = std::fs::canonicalize(exe).ok()?;
    Some(real.parent()?.parent()?.join(".env"))
}

pub fn load(skip_cwd: bool) {
    let mut paths = vec![config_dir().join(".env")];
    if let Some(p) = script_env_path() {
        paths.push(p);
    }
    if !skip_cwd {
        if let Ok(cwd) = std::env::current_dir() {
            paths.push(cwd.join(".env"));
        }
    }
    let mut seen = HashSet::new();
    for path in paths {
        let key = normalize(&path);
        if !seen.insert(key) {
            continue;
        }
        let Ok(content) = std::fs::read_to_string(&path) else { continue };
        for (key, value) in parse(&content) {
            if std::env::var_os(&key).is_none() {
                // SAFETY: called once at startup, before any thread starts.
                unsafe { std::env::set_var(&key, value) };
            }
        }
    }
}

fn normalize(path: &Path) -> PathBuf {
    // `path.resolve` normalizes without touching the filesystem.
    let mut out = PathBuf::new();
    for part in path.components() {
        match part {
            std::path::Component::ParentDir => {
                out.pop();
            }
            std::path::Component::CurDir => {}
            other => out.push(other),
        }
    }
    out
}

/// The assignments in a `.env` file, in order.
pub fn parse(content: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    for line in content.split('\n') {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        // /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/, including the
        // regex's fallback to a key named "export" when the prefix doesn't fit.
        let exported = trimmed
            .strip_prefix("export")
            .filter(|r| r.starts_with(char::is_whitespace))
            .map(str::trim_start)
            .and_then(assignment);
        let Some((key, raw)) = exported.or_else(|| assignment(trimmed)) else { continue };
        // JavaScript's "." stops at these, so the regex didn't match the line.
        if raw.contains(['\r', '\u{2028}', '\u{2029}']) {
            continue;
        }
        let value = if let Some(body) = raw.strip_prefix('"') {
            // /^"((?:\\.|[^"\\])*)"\s*(?:#.*)?$/
            match double_quoted(body) {
                Some(v) => v,
                None => continue,
            }
        } else if let Some(body) = raw.strip_prefix('\'') {
            // /^'([^']*)'\s*(?:#.*)?$/
            let Some(end) = body.find('\'') else { continue };
            let tail = body[end + 1..].trim_start();
            if !(tail.is_empty() || tail.starts_with('#')) {
                continue;
            }
            body[..end].to_string()
        } else {
            strip_comment(raw).trim_end().to_string()
        };
        out.push((key.to_string(), value));
    }
    out
}

/// `KEY \s* = \s* value`: the key and the raw value, or None.
fn assignment(text: &str) -> Option<(&str, &str)> {
    let end = text.find(|c: char| !(c.is_ascii_alphanumeric() || c == '_')).unwrap_or(text.len());
    let key = &text[..end];
    if key.is_empty() || key.starts_with(|c: char| c.is_ascii_digit()) {
        return None;
    }
    let rest = text[end..].trim_start().strip_prefix('=')?;
    Some((key, rest.trim_start()))
}

fn double_quoted(body: &str) -> Option<String> {
    let mut chars = body.char_indices();
    let mut value = String::new();
    while let Some((i, c)) = chars.next() {
        match c {
            '\\' => {
                let (_, next) = chars.next()?;
                // The Node CLI kept escapes as written.
                value.push('\\');
                value.push(next);
            }
            '"' => {
                let tail = body[i + 1..].trim_start();
                return (tail.is_empty() || tail.starts_with('#')).then_some(value);
            }
            c => value.push(c),
        }
    }
    None
}

/// `value.replace(/\s+#.*$/, "")`.
fn strip_comment(value: &str) -> &str {
    let bytes: Vec<(usize, char)> = value.char_indices().collect();
    for (pos, &(i, c)) in bytes.iter().enumerate() {
        if c == '#' && pos > 0 && bytes[pos - 1].1.is_whitespace() {
            let mut start = pos;
            while start > 0 && bytes[start - 1].1.is_whitespace() {
                start -= 1;
            }
            let _ = i;
            return &value[..bytes[start].0];
        }
    }
    value
}

#[cfg(test)]
mod tests {
    use super::parse;

    #[test]
    fn parses_like_the_node_cli() {
        let got = parse("A=1\nexport B = two # note\nC=\"q \\\" x\" # c\nD='s'\n# x\nE=a#b\nbad key=1\nF=\"open\n");
        assert_eq!(
            got,
            vec![
                ("A".into(), "1".into()),
                ("B".into(), "two".into()),
                ("C".into(), "q \\\" x".into()),
                ("D".into(), "s".into()),
                ("E".into(), "a#b".into()),
            ]
        );
    }
}

/// Port of "environment files fill missing keys in order and preserve
/// explicitly empty process variables" (test/io.test.mjs), which called
/// loadEnv() with fake home, package and working-directory files.
#[cfg(all(test, feature = "test-hooks"))]
mod load_tests {
    use crate::hooks::testing::Session;

    const KEYS: [&str; 7] = [
        "GUESTY_TEST_FIRST",
        "GUESTY_TEST_SECOND",
        "GUESTY_TEST_THIRD",
        "GUESTY_TEST_EMPTY",
        "GUESTY_TEST_PROCESS",
        "GUESTY_TEST_HASH",
        "invalid-key",
    ];

    #[test]
    fn environment_files_fill_missing_keys_in_order_and_preserve_explicitly_empty_process_variables() {
        let session = Session::new();
        for key in KEYS {
            session.env(key, None);
        }
        session.env("GUESTY_TEST_EMPTY", Some(""));
        session.env("GUESTY_TEST_PROCESS", Some("process"));
        std::fs::write(
            session.home.join(".guesty-cli/.env"),
            "export GUESTY_TEST_FIRST=home # comment\nGUESTY_TEST_EMPTY=override\nGUESTY_TEST_PROCESS=override\nGUESTY_TEST_HASH='a#b' # comment\ninvalid-key=bad",
        )
        .unwrap();
        // The package's .env: `<dir of the executable>/../.env`, as for the CLI binary in dist/.
        let script = super::script_env_path().expect("script .env path");
        assert!(!script.exists(), "{} must not exist before the test", script.display());
        std::fs::write(&script, "GUESTY_TEST_FIRST=source\nGUESTY_TEST_SECOND=source").unwrap();
        let cwd = session.root.join("cwd");
        std::fs::create_dir_all(&cwd).unwrap();
        std::fs::write(cwd.join(".env"), "GUESTY_TEST_SECOND=cwd\nGUESTY_TEST_THIRD=cwd").unwrap();
        let previous = std::env::current_dir().unwrap();
        std::env::set_current_dir(&cwd).unwrap();
        super::load(false);
        std::env::set_current_dir(previous).unwrap();
        let _ = std::fs::remove_file(&script);
        let got: Vec<Option<String>> = KEYS.iter().map(|k| std::env::var(k).ok()).collect();
        for key in KEYS {
            session.env(key, None);
        }
        let expected = [Some("home"), Some("source"), Some("cwd"), Some(""), Some("process"), Some("a#b"), None];
        assert_eq!(got, expected.map(|v| v.map(str::to_string)));
    }
}
