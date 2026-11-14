//! A JSON scanner for the bundled OpenAPI documents. Parsing the 5 MB Open
//! API document into values takes about 10 ms; finding where each value
//! starts and ends takes about 2 ms. The catalog indexes the documents by
//! these spans and parses only the parts a request needs. The documents are
//! valid JSON (`catalog.rs` tests that), so the scanner doesn't validate.

use std::borrow::Cow;

/// A value's byte range in its document.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Span {
    pub start: usize,
    pub end: usize,
}

pub fn ws(b: &[u8], mut i: usize) -> usize {
    while i < b.len() && matches!(b[i], b' ' | b'\t' | b'\n' | b'\r') {
        i += 1;
    }
    i
}

/// Bytes that matter inside a string (1) and inside a container (2).
const CLASSES: [u8; 256] = {
    let mut table = [0u8; 256];
    table[b'"' as usize] = 1 | 2;
    table[b'\\' as usize] = 1;
    table[b'{' as usize] = 2;
    table[b'[' as usize] = 2;
    table[b'}' as usize] = 2;
    table[b']' as usize] = 2;
    table
};

/// The index just past the string that starts at `i` (its opening quote).
fn skip_string(b: &[u8], mut i: usize) -> usize {
    i += 1;
    while i < b.len() {
        if CLASSES[b[i] as usize] & 1 == 0 {
            i += 1;
            continue;
        }
        if b[i] == b'"' {
            return i + 1;
        }
        i += 2;
    }
    i
}

/// The index just past the value that starts at `i`.
pub fn skip(b: &[u8], i: usize) -> usize {
    match b.get(i) {
        Some(b'"') => skip_string(b, i),
        Some(b'{' | b'[') => {
            let mut depth = 0usize;
            let mut j = i;
            while j < b.len() {
                let c = b[j];
                if CLASSES[c as usize] & 2 == 0 {
                    j += 1;
                    continue;
                }
                match c {
                    b'"' => {
                        j = skip_string(b, j);
                        continue;
                    }
                    b'{' | b'[' => depth += 1,
                    _ => {
                        depth -= 1;
                        if depth == 0 {
                            return j + 1;
                        }
                    }
                }
                j += 1;
            }
            j
        }
        _ => {
            let mut j = i;
            while j < b.len() && !matches!(b[j], b',' | b'}' | b']' | b' ' | b'\t' | b'\n' | b'\r') {
                j += 1;
            }
            j
        }
    }
}

/// The whole text as one value's span.
#[cfg(test)]
fn root(text: &str) -> Span {
    let b = text.as_bytes();
    let start = ws(b, 0);
    Span { start, end: skip(b, start) }
}

pub fn is_object(text: &str, span: Span) -> bool {
    text.as_bytes().get(span.start) == Some(&b'{')
}

/// Visits each member of the object that starts at `start`, in document
/// order, with its decoded key and where its value starts. `each` returns
/// where the value ends when it read the value itself, or None to skip it.
/// Returns where the object ends (or the value, when it isn't an object).
pub fn each_member(text: &str, start: usize, mut each: impl FnMut(Cow<'_, str>, usize) -> Option<usize>) -> usize {
    let b = text.as_bytes();
    if b.get(start) != Some(&b'{') {
        return skip(b, start);
    }
    let mut i = ws(b, start + 1);
    while i < b.len() && b[i] == b'"' {
        let key_end = skip_string(b, i);
        let key = decode_string(&text[i..key_end]);
        // The colon.
        i = ws(b, ws(b, key_end) + 1);
        let end = each(key, i).unwrap_or_else(|| skip(b, i));
        i = ws(b, end);
        if b.get(i) == Some(&b',') {
            i = ws(b, i + 1);
        }
    }
    i + 1
}

/// An object's members as (decoded key, value span), in document order.
/// Duplicate keys are all listed; JSON.parse keeps the last one's value.
#[cfg(test)]
fn members(text: &str, span: Span) -> Vec<(String, Span)> {
    let mut out = Vec::new();
    if !is_object(text, span) {
        return out;
    }
    let b = text.as_bytes();
    each_member(text, span.start, |key, at| {
        let end = skip(b, at);
        out.push((key.into_owned(), Span { start: at, end }));
        Some(end)
    });
    out
}

/// The value JSON.parse would keep for `key`: the last duplicate.
#[cfg(test)]
fn member(members: &[(String, Span)], key: &str) -> Option<Span> {
    members.iter().rev().find(|(k, _)| k == key).map(|(_, s)| *s)
}

/// A JSON string literal's value.
fn decode_string(literal: &str) -> Cow<'_, str> {
    if !literal.contains('\\') {
        return Cow::Borrowed(&literal[1..literal.len() - 1]);
    }
    Cow::Owned(crate::json::parse(literal).ok().and_then(|v| v.as_str().map(str::to_string)).unwrap_or_default())
}

/// Parses one value.
pub fn parse(text: &str, span: Span) -> crate::json::Json {
    crate::json::parse(&text[span.start..span.end]).unwrap_or(crate::json::Json::Null)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_members_and_their_values() {
        let text = r#" {"a": [1, {"x": "}"}], "b\"c" : "q\\\"", "a": true, "n": -1.5e3 } "#;
        let r = root(text);
        let m = members(text, r);
        let keys: Vec<&str> = m.iter().map(|(k, _)| k.as_str()).collect();
        assert_eq!(keys, ["a", "b\"c", "a", "n"]);
        assert_eq!(&text[m[0].1.start..m[0].1.end], r#"[1, {"x": "}"}]"#);
        assert_eq!(&text[m[1].1.start..m[1].1.end], r#""q\\\"""#);
        assert_eq!(&text[member(&m, "a").unwrap().start..member(&m, "a").unwrap().end], "true");
        assert_eq!(&text[m[3].1.start..m[3].1.end], "-1.5e3");
        assert!(members("[]", root("[]")).is_empty());
    }
}
