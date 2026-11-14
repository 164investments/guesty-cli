//! Small JavaScript behaviours the MCP server's text depends on: what `\s`
//! and `trim()` treat as whitespace, UTF-16 string slicing and en-US number
//! grouping. (The Pacific-time date format is in `pacific.rs`.) Shared by the
//! build script, so it uses only std and `crate::json`.

use crate::json::Json;

/// JavaScript's `\s` (and what `trim()` removes).
pub fn is_space(c: char) -> bool {
    matches!(
        c,
        '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2000}'
            ..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' | '\u{205f}' | '\u{3000}' | '\u{feff}'
    )
}

/// `value.trim()`.
pub fn trim(value: &str) -> &str {
    value.trim_matches(is_space)
}

/// `value.slice(0, units)` in UTF-16 code units. When the cut falls inside a
/// character outside the Basic Multilingual Plane, JavaScript keeps its lone
/// high surrogate, which a Rust string can't hold: it's returned separately.
pub fn slice_utf16(value: &str, units: usize) -> (&str, Option<u16>) {
    let mut count = 0;
    for (i, c) in value.char_indices() {
        let width = c.len_utf16();
        if count + width > units {
            let lone = (count < units).then(|| {
                let mut buf = [0u16; 2];
                c.encode_utf16(&mut buf)[0]
            });
            return (&value[..i], lone);
        }
        count += width;
    }
    (value, None)
}

/// `n.toLocaleString("en-US")` for a nonnegative integer.
pub fn grouped(n: usize) -> String {
    let digits = n.to_string();
    let mut out = String::new();
    for (i, d) in digits.chars().enumerate() {
        if i > 0 && (digits.len() - i) % 3 == 0 {
            out.push(',');
        }
        out.push(d);
    }
    out
}

/// `String(value)` for a value that may be `undefined` (None).
pub fn string(value: Option<&Json>) -> String {
    match value {
        None => "undefined".into(),
        Some(v) => crate::json::js_string(v),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn helpers() {
        assert_eq!(grouped(60_000), "60,000");
        assert_eq!(grouped(1_234_567), "1,234,567");
        assert_eq!(grouped(12), "12");
        assert_eq!(slice_utf16("ab😀c", 3), ("ab", Some(0xd83d)));
        assert_eq!(slice_utf16("ab😀c", 4), ("ab😀", None));
        assert_eq!(slice_utf16("abc", 9), ("abc", None));
        assert_eq!(trim("\u{feff} x\u{85}\u{a0}"), "x\u{85}");
    }
}
