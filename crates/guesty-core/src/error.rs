//! The core's one error: a message for the person or agent. The CLI prints it
//! as `Error: <message>`; the MCP tools return it as an error result.

use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Error(String);

pub type Result<T, E = Error> = std::result::Result<T, E>;

impl Error {
    pub fn new(message: impl Into<String>) -> Error {
        Error(message.into())
    }

    pub fn message(&self) -> String {
        self.0.clone()
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_message(self) -> String {
        self.0
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for Error {}
