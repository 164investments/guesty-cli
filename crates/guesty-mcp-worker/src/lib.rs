//! The hosted Guesty MCP server (`https://guesty-mcp.staykit.ai/mcp`) on Cloudflare Workers.
//!
//! This crate is everything around the MCP tools: HTTP routing, the OAuth 2.1 authorization
//! server, storage in D1, the sign-in page, per-request member-key checks against the team token
//! service, and the outbound transport. The tools themselves are the shared core's
//! (`guesty-core`), run by [`hosted::CoreHandler`] through [`mcp::McpHandler`].
//!
//! The pure modules (`oauth`, `crypto`, `store`, `html`, `mcp`, `hosted`, `token_service`, `config`) build
//! and test natively. Everything that touches the Workers runtime lives in `app` and the wasm
//! halves of `transport` and `db`, compiled only for `wasm32`.

pub mod clock;
pub mod config;
pub mod crypto;
pub mod db;
pub mod hosted;
pub mod html;
pub mod mcp;
pub mod oauth;
pub mod store;
pub mod token_service;
pub mod transport;

#[cfg(target_arch = "wasm32")]
mod app;

#[cfg(test)]
mod tests;

#[cfg(test)]
mod hosted_tests;
