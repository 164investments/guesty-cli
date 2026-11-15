//! Request bodies from stdin.

use std::io::Read;

use crate::error::{CliError, Result};
use crate::json::{self, Json};

/// `readStdin()`: all of stdin as UTF-8 text. A terminal has no data.
pub fn read() -> Result<String> {
    let mut stdin = std::io::stdin();
    if crate::hooks::is_terminal(crate::hooks::Stream::Stdin) {
        return Err(CliError::new("No data on stdin. Use --data or pipe JSON."));
    }
    let mut bytes = Vec::new();
    stdin.read_to_end(&mut bytes).map_err(|e| CliError::new(e.to_string()))?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

/// `JSON.parse(text)` where a failure was an uncaught `SyntaxError`.
pub fn parse_json(text: &str) -> Result<Json> {
    json::parse(text).map_err(|_| CliError::InvalidJson)
}

/// `opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin())`.
pub fn data_or_stdin(data: Option<&str>) -> Result<Json> {
    match data {
        Some(d) if !d.is_empty() => parse_json(d),
        _ => parse_json(&read()?),
    }
}
