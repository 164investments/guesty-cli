//! JSON the way the Node CLI wrote it. `JSON.parse` keeps key order and reads
//! every number as a double; `JSON.stringify` prints numbers with
//! JavaScript's `Number#toString` and escapes only what JSON requires. Output
//! must match the Node CLI byte for byte, because scripts and agents compare
//! and parse it.

use serde_json::Value;

pub use serde_json::{Map, Value as Json, json};

/// `JSON.parse`. The error carries no detail; callers decide the message.
pub fn parse(text: &str) -> Result<Value, ()> {
    let mut de = serde_json::Deserializer::from_str(text);
    de.disable_recursion_limit();
    let value = serde::Deserialize::deserialize(&mut de).map_err(|_| ())?;
    de.end().map_err(|_| ())?;
    Ok(value)
}

/// Whether arrays and objects in `text` nest deeper than `max` levels (a
/// byte scan that skips strings; run it before parsing untrusted input).
pub fn nests_deeper_than(text: &str, max: usize) -> bool {
    let b = text.as_bytes();
    let (mut depth, mut i) = (0usize, 0usize);
    while i < b.len() {
        match b[i] {
            b'"' => {
                i += 1;
                while i < b.len() && b[i] != b'"' {
                    i += if b[i] == b'\\' { 2 } else { 1 };
                }
            }
            b'[' | b'{' => {
                depth += 1;
                if depth > max {
                    return true;
                }
            }
            b']' | b'}' => depth = depth.saturating_sub(1),
            _ => {}
        }
        i += 1;
    }
    false
}

/// Whether valid JSON `text` has more than `max` values, counted cheaply
/// without parsing: every `,` and `:` outside strings starts another value
/// (or member), plus the first one.
pub fn has_more_values_than(text: &str, max: usize) -> bool {
    let b = text.as_bytes();
    let (mut values, mut i) = (1usize, 0usize);
    while i < b.len() {
        match b[i] {
            b'"' => {
                i += 1;
                while i < b.len() && b[i] != b'"' {
                    i += if b[i] == b'\\' { 2 } else { 1 };
                }
            }
            b',' | b':' => {
                values += 1;
                if values > max {
                    return true;
                }
            }
            _ => {}
        }
        i += 1;
    }
    false
}

/// `JSON.stringify(value)`.
pub fn compact(value: &Value) -> String {
    let mut out = String::new();
    write_value(&mut out, value, None, 0);
    out
}

/// `JSON.stringify(value, null, indent)`.
pub fn pretty(value: &Value, indent: usize) -> String {
    let mut out = String::new();
    write_value(&mut out, value, Some(indent), 0);
    out
}

/// `JSON.stringify(text)`: a quoted, escaped string.
pub fn quote(text: &str) -> String {
    let mut out = String::with_capacity(text.len() + 2);
    write_string(&mut out, text);
    out
}

fn newline(out: &mut String, indent: Option<usize>, depth: usize) {
    if let Some(width) = indent {
        out.push('\n');
        for _ in 0..width * depth {
            out.push(' ');
        }
    }
}

fn write_value(out: &mut String, value: &Value, indent: Option<usize>, depth: usize) {
    match value {
        Value::Null => out.push_str("null"),
        Value::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Value::Number(n) => out.push_str(&number_to_string(n.as_f64().unwrap_or(f64::NAN), true)),
        Value::String(s) => write_string(out, s),
        Value::Array(items) => {
            if items.is_empty() {
                out.push_str("[]");
                return;
            }
            out.push('[');
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                newline(out, indent, depth + 1);
                write_value(out, item, indent, depth + 1);
            }
            newline(out, indent, depth);
            out.push(']');
        }
        Value::Object(map) => {
            if map.is_empty() {
                out.push_str("{}");
                return;
            }
            out.push('{');
            for (i, (key, item)) in entries(map).into_iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                newline(out, indent, depth + 1);
                write_string(out, key);
                out.push(':');
                if indent.is_some() {
                    out.push(' ');
                }
                write_value(out, item, indent, depth + 1);
            }
            newline(out, indent, depth);
            out.push('}');
        }
    }
}

fn write_string(out: &mut String, s: &str) {
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
}

/// A key JavaScript treats as an array index ("0", "17", not "01" or "-1").
pub fn is_index_key(key: &str) -> bool {
    !key.is_empty()
        && key.len() <= 10
        && key.bytes().all(|b| b.is_ascii_digit())
        && (key == "0" || !key.starts_with('0'))
        && key.parse::<u64>().is_ok_and(|n| n < 4_294_967_295)
}

/// `Object.entries(object)`: integer-like keys first in ascending order, then
/// the rest in insertion order. `JSON.stringify` uses the same order.
pub fn entries(map: &Map<String, Value>) -> Vec<(&String, &Value)> {
    if !map.keys().any(|k| is_index_key(k)) {
        return map.iter().collect();
    }
    let mut index: Vec<(&String, &Value)> = map.iter().filter(|(k, _)| is_index_key(k)).collect();
    index.sort_by_key(|(k, _)| k.parse::<u64>().unwrap_or(0));
    index.extend(map.iter().filter(|(k, _)| !is_index_key(k)));
    index
}

/// JavaScript's `Number#toString()`, or for JSON (`json` true) `null` for
/// NaN and the infinities, as `JSON.stringify` prints them.
pub fn number_to_string(value: f64, json: bool) -> String {
    if value.is_nan() {
        return if json { "null".into() } else { "NaN".into() };
    }
    if value.is_infinite() {
        return if json {
            "null".into()
        } else if value > 0.0 {
            "Infinity".into()
        } else {
            "-Infinity".into()
        };
    }
    if value == 0.0 {
        return "0".into();
    }
    let negative = value < 0.0;
    // ryu gives the shortest round-tripping digits, which is what
    // ECMAScript's Number::toString chooses too; only the layout differs.
    let mut buf = ryu::Buffer::new();
    let text = buf.format_finite(value.abs());
    let (mantissa, exp) = match text.split_once(['e', 'E']) {
        Some((m, e)) => (m, e.parse::<i32>().unwrap_or(0)),
        None => (text, 0),
    };
    let (int_part, frac_part) = mantissa.split_once('.').unwrap_or((mantissa, ""));
    let mut digits: String = format!("{int_part}{frac_part}");
    // n: the position of the decimal point relative to the digit string.
    let mut n = int_part.len() as i32 + exp;
    let leading = digits.len() - digits.trim_start_matches('0').len();
    digits.drain(..leading);
    n -= leading as i32;
    let trimmed = digits.trim_end_matches('0').len();
    digits.truncate(trimmed);
    let k = digits.len() as i32;
    let mut out = String::new();
    if negative {
        out.push('-');
    }
    if k <= n && n <= 21 {
        out.push_str(&digits);
        for _ in 0..(n - k) {
            out.push('0');
        }
    } else if 0 < n && n <= 21 {
        out.push_str(&digits[..n as usize]);
        out.push('.');
        out.push_str(&digits[n as usize..]);
    } else if -6 < n && n <= 0 {
        out.push_str("0.");
        for _ in 0..(-n) {
            out.push('0');
        }
        out.push_str(&digits);
    } else {
        let e = n - 1;
        out.push_str(&digits[..1]);
        if k > 1 {
            out.push('.');
            out.push_str(&digits[1..]);
        }
        out.push('e');
        out.push(if e < 0 { '-' } else { '+' });
        out.push_str(&e.abs().to_string());
    }
    out
}

/// JavaScript's `String(value)` for a JSON value used as a query parameter
/// or in a message.
pub fn js_string(value: &Value) -> String {
    match value {
        Value::Null => "null".into(),
        Value::Bool(b) => b.to_string(),
        Value::Number(n) => number_to_string(n.as_f64().unwrap_or(f64::NAN), false),
        Value::String(s) => s.clone(),
        Value::Array(items) => items
            .iter()
            .map(|item| match item {
                Value::Null => String::new(),
                other => js_string(other),
            })
            .collect::<Vec<_>>()
            .join(","),
        Value::Object(_) => "[object Object]".into(),
    }
}

/// A JSON number from an f64, as JavaScript would hold it.
pub fn number(value: f64) -> Value {
    if value.fract() == 0.0 && value.abs() < 9_007_199_254_740_992.0 {
        if value >= 0.0 {
            return Value::from(value as u64);
        }
        return Value::from(value as i64);
    }
    serde_json::Number::from_f64(value).map(Value::Number).unwrap_or(Value::Null)
}

/// JavaScript truthiness of a JSON value.
pub fn truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_f64().is_some_and(|f| f != 0.0 && !f.is_nan()),
        Value::String(s) => !s.is_empty(),
        _ => true,
    }
}

/// UTF-16 length, which is what JavaScript's `string.length` counts.
pub fn js_len(s: &str) -> usize {
    s.encode_utf16().count()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numbers_print_like_javascript() {
        for (v, s) in [
            (1.0, "1"),
            (-1.5, "-1.5"),
            (0.1, "0.1"),
            (1e21, "1e+21"),
            (1e20, "100000000000000000000"),
            (123456789012345680000.0, "123456789012345680000"),
            (1e-7, "1e-7"),
            (1.5e-7, "1.5e-7"),
            (0.000001, "0.000001"),
            (12345678901234567890.0, "12345678901234567000"),
            (5e-324, "5e-324"),
            (1.7976931348623157e308, "1.7976931348623157e+308"),
            (-0.0, "0"),
            (25.0, "25"),
        ] {
            assert_eq!(number_to_string(v, false), s, "{v}");
        }
    }

    #[test]
    fn stringify_matches_node() {
        let v = parse(r#"{"b":1.0,"a":[],"c":{},"d":"x\u0001\n\"/é","b":2}"#).unwrap();
        assert_eq!(compact(&v), r#"{"b":2,"a":[],"c":{},"d":"x\u0001\n\"/é"}"#);
        assert_eq!(compact(&parse(r#"{"b":1,"10":2,"2":3,"01":4}"#).unwrap()), r#"{"2":3,"10":2,"b":1,"01":4}"#);
        assert_eq!(pretty(&parse("[1,{\"a\":[2]}]").unwrap(), 2), "[\n  1,\n  {\n    \"a\": [\n      2\n    ]\n  }\n]");
    }

    #[test]
    fn nesting_depth() {
        assert!(!nests_deeper_than(r#"{"a":[1,{"b":"[[[["}]}"#, 3));
        assert!(nests_deeper_than(r#"{"a":[1,{"b":[]}]}"#, 3));
        assert!(!nests_deeper_than(r#""\"[[[""#, 0));
        assert!(!nests_deeper_than("[]", 1) && nests_deeper_than("[[]]", 1));
        assert!(!has_more_values_than(r#"{"a":[1,2],"b":"x,y:z"}"#, 6));
        assert!(has_more_values_than(r#"{"a":[1,2],"b":"x,y:z"}"#, 4));
        assert!(!has_more_values_than("[1]", 1) && has_more_values_than("[1,2]", 1));
    }
}
