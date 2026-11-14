//! Port of src/commands/contacts.ts.

use crate::cli::Command;
use crate::client::{Body, Fetch, guesty_fetch};
use crate::error::Result;
use crate::json::Json;
use crate::output::print;
use crate::params;
use crate::stdin;

/// A parsed `--data`/stdin body as `guestyFetch` sent it: a JSON string is sent
/// as plain text; anything else is JSON.
pub(super) fn js_body(value: Json) -> Body {
    match value {
        Json::String(s) => Body::Text(s),
        other => Body::Json(other),
    }
}

/// `guestyFetch(path, { method, body })` with a `--data`/stdin body.
pub(super) fn send_data(path: &str, method: &str, data: Option<&str>) -> Result<()> {
    let body = stdin::data_or_stdin(data)?;
    let fetch = Fetch { method: method.to_string(), body: Some(js_body(body)), ..Fetch::default() };
    print(&guesty_fetch(path, fetch)?);
    Ok(())
}

/// `print(await guestyFetch(path))`.
pub(super) fn fetch_print(path: &str) -> Result<()> {
    print(&guesty_fetch(path, Fetch::default())?);
    Ok(())
}

/// `print(await guestyFetch(path, { method }))`.
pub(super) fn method_print(path: &str, method: &str) -> Result<()> {
    print(&guesty_fetch(path, Fetch::method(method))?);
    Ok(())
}

fn is_js_space(c: char) -> bool {
    (c.is_whitespace() && c != '\u{85}') || c == '\u{feff}'
}

/// `parseInt(value)` with no radix: leading whitespace, a sign, a `0x` prefix
/// for hexadecimal, then digits up to the first non-digit; NaN if none.
pub(super) fn parse_int(value: &str) -> f64 {
    let s = value.trim_start_matches(is_js_space);
    let (negative, s) = match s.as_bytes().first() {
        Some(b'-') => (true, &s[1..]),
        Some(b'+') => (false, &s[1..]),
        _ => (false, s),
    };
    let (radix, s) = if s.len() >= 2 && (s.starts_with("0x") || s.starts_with("0X")) { (16, &s[2..]) } else { (10, s) };
    let end = s.find(|c: char| !c.is_digit(radix)).unwrap_or(s.len());
    let digits = &s[..end];
    if digits.is_empty() {
        return f64::NAN;
    }
    let magnitude = if radix == 10 {
        digits.parse::<f64>().unwrap_or(f64::NAN)
    } else {
        digits.chars().fold(0.0, |acc, c| acc * 16.0 + c.to_digit(16).unwrap_or(0) as f64)
    };
    if negative { -magnitude } else { magnitude }
}

pub fn command() -> Command {
    Command::new("contacts")
        .description("Manage contacts")
        .command(
            Command::new("list")
                .description("List contacts")
                .option_default("--limit <n>", "Max results", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let params = params! {
                        "limit" => parse_int(c.opts.str("limit").unwrap_or("")),
                        "skip" => parse_int(c.opts.str("skip").unwrap_or("")),
                    };
                    print(&guesty_fetch("/v1/contacts", Fetch::get(params))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("get <contactId>")
                .description("Get a contact by ID")
                .action(|c| fetch_print(&format!("/v1/contacts/{}", c.arg(0)))),
        )
        .command(
            Command::new("create")
                .description("Create a contact (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data("/v1/contacts", "POST", c.opts.str("data"))),
        )
        .command(
            Command::new("update <contactId>")
                .description("Update a contact (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| send_data(&format!("/v1/contacts/{}", c.arg(0)), "PUT", c.opts.str("data"))),
        )
        .command(
            Command::new("delete <contactId>")
                .description("Delete a contact")
                .action(|c| method_print(&format!("/v1/contacts/{}", c.arg(0)), "DELETE")),
        )
}

#[cfg(test)]
mod tests {
    use super::parse_int;

    #[test]
    fn parse_int_like_javascript() {
        assert_eq!(parse_int("25"), 25.0);
        assert_eq!(parse_int("  12abc"), 12.0);
        assert_eq!(parse_int("-3"), -3.0);
        assert_eq!(parse_int("0x1f"), 31.0);
        assert_eq!(parse_int("1e3"), 1.0);
        assert!(parse_int("abc").is_nan());
        assert!(parse_int("").is_nan());
        assert!(parse_int("0x").is_nan());
    }
}
