//! Errors from commands. The Node CLI printed `Error: <message>` on stderr and
//! exited 1 for every failure; commander's own parse errors (`error: ...`)
//! are printed by `cli.rs` instead.

use std::fmt;

#[derive(Debug)]
pub enum CliError {
    /// Printed as `Error: <message>` with control characters made visible.
    Message(String),
    /// Invalid JSON from `--data` or stdin (a `SyntaxError` in Node).
    InvalidJson,
    /// Already shown to the person (an interactive prompt's frame): exit 1
    /// and print nothing more.
    Shown,
    /// Exit with this code, printing nothing.
    Exit(i32),
}

pub type Result<T, E = CliError> = std::result::Result<T, E>;

impl CliError {
    pub fn new(message: impl Into<String>) -> CliError {
        CliError::Message(message.into())
    }

    pub fn message(&self) -> String {
        match self {
            CliError::Message(m) => m.clone(),
            CliError::InvalidJson => "Invalid JSON input. Check the JSON supplied through --data or stdin.".into(),
            CliError::Shown => "Stopped.".into(),
            CliError::Exit(_) => String::new(),
        }
    }
}

impl fmt::Display for CliError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message())
    }
}

/// `throw new Error(message)`.
#[macro_export]
macro_rules! bail {
    ($($arg:tt)*) => {
        return Err($crate::error::CliError::Message(format!($($arg)*)))
    };
}

impl From<guesty_core::Error> for CliError {
    fn from(e: guesty_core::Error) -> Self {
        CliError::Message(e.into_message())
    }
}

impl From<std::io::Error> for CliError {
    fn from(e: std::io::Error) -> Self {
        CliError::Message(e.to_string())
    }
}
