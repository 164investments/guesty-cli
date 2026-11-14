//! The Guesty CLI's core, shared with a hosted MCP server: no network,
//! filesystem, environment, terminal or threads, so it builds for
//! `wasm32-unknown-unknown`.
//!
//! - `json`: JSON exactly as JavaScript reads and writes it.
//! - `request`: Guesty request checks and the decisions a request loop
//!   makes (retries, 401s, redirects, errors, decoding, pagination steps).
//! - `token_service`: token-service addresses, invites and responses.
//! - `mcp`: the MCP protocol and its five tools, async over a `Backend` that
//!   does the I/O, with the operation catalog indexed at build time.
//! - `limits`: optional per-call limits for a hosted server.

pub mod data;
pub mod error;
pub mod json;
pub mod limits;
pub mod mcp;
pub mod request;
pub mod token_service;

pub use data::Data;
pub use error::{Error, Result};
pub use limits::Limits;
