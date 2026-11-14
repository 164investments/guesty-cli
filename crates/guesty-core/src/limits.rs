//! Limits a hosted server sets on each tool call. The CLI sets none
//! (`Limits::NONE`), and with none set everything behaves as it always has.
//! Each limit fails with a plain message and never returns a partial result.

use crate::mcp::js::grouped;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Limits {
    /// Each tool call must finish within this many milliseconds, counting
    /// every request, body read and retry wait (from `Backend::now_ms`).
    pub call_deadline_ms: Option<u64>,
    /// `all_pages` stops with an error past this many results (the CLI's own
    /// limit, 10,000, always applies).
    pub max_results: Option<usize>,
    /// `all_pages` stops with an error past this many bytes of results, as
    /// compact JSON.
    pub max_total_bytes: Option<usize>,
    /// A Guesty response body larger than this is refused.
    pub max_response_bytes: Option<usize>,
    /// JSON nested deeper than this is refused before it's parsed.
    pub max_json_depth: Option<usize>,
    /// JSON with more values than this is refused before it's parsed: parsed
    /// values take far more memory than their text, and a Worker has 128 MB.
    pub max_json_values: Option<usize>,
}

impl Limits {
    pub const NONE: Limits = Limits {
        call_deadline_ms: None,
        max_results: None,
        max_total_bytes: None,
        max_response_bytes: None,
        max_json_depth: None,
        max_json_values: None,
    };

    /// The limits the hosted MCP server uses (plan items S7 and S8).
    pub const HOSTED: Limits = Limits {
        call_deadline_ms: Some(50_000),
        max_results: Some(2_000),
        max_total_bytes: Some(32 * 1024 * 1024),
        max_response_bytes: Some(8 * 1024 * 1024),
        max_json_depth: Some(128),
        max_json_values: Some(300_000),
    };

    /// The absolute time a call starting `now` must end by.
    pub fn deadline_from(&self, now_ms: f64) -> Option<f64> {
        self.call_deadline_ms.map(|ms| now_ms + ms as f64)
    }
}

fn seconds(ms: u64) -> String {
    grouped(ms.div_ceil(1000) as usize)
}

fn megabytes(bytes: usize) -> String {
    let mb = bytes as f64 / (1024.0 * 1024.0);
    crate::json::number_to_string((mb * 10.0).round() / 10.0, false)
}

/// The call ran out of time before a request could start.
pub fn deadline_message(deadline_ms: u64) -> String {
    format!(
        "This tool call ran out of time: it has {}s to finish, including every Guesty request and retry wait. Ask for less with query parameters such as fields, limit or filters.",
        seconds(deadline_ms)
    )
}

/// A retry wait that wouldn't fit in the time left.
pub fn retry_deadline_message(label: &str, status: u16, deadline_ms: u64) -> String {
    format!(
        "{label} failed: HTTP {status}. Waiting to retry would pass this tool call's {}s limit; try again shortly.",
        seconds(deadline_ms)
    )
}

/// Pagination that wouldn't finish in time.
pub fn pagination_deadline_message(deadline_ms: u64) -> String {
    format!(
        "Pagination stopped: every page didn't arrive within this tool call's {}s limit. Use filters to narrow your query; no partial result was returned.",
        seconds(deadline_ms)
    )
}

pub fn too_many_results_message(max: usize) -> String {
    format!(
        "Pagination exceeds {} results, the most this server returns. Use filters to narrow your query; no partial result was returned.",
        grouped(max)
    )
}

pub fn too_many_bytes_message(max: usize) -> String {
    format!(
        "Pagination exceeds {} MB of results, the most this server returns. Use fields or filters to narrow your query; no partial result was returned.",
        megabytes(max)
    )
}

/// A response body over `max` bytes. The `label` names the request.
pub fn response_too_large_message(label: &str, max: usize) -> String {
    format!(
        "{label} returned more than {} MB, the most this server reads. Ask for less with query parameters such as fields, limit or filters.",
        megabytes(max)
    )
}

pub fn too_many_values_message(label: &str, max: usize) -> String {
    format!(
        "{label} returned more than {} JSON values, the most this server reads at once. Ask for less with query parameters such as fields, limit or filters.",
        grouped(max)
    )
}

pub fn too_deep_message(label: &str, max: usize) -> String {
    format!("{label} returned JSON nested more than {max} levels deep, which this server doesn't read.")
}
