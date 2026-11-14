//! stdout and stderr, as the Node CLI wrote them. Results go to stdout;
//! warnings, progress and errors go to stderr, so stdout stays parseable.

use std::io::Write;
use std::sync::Mutex;

use crate::json::{self, Json};

/// What a request or command produced, mirroring the JavaScript values the
/// Node CLI printed.
#[derive(Debug, Clone)]
pub enum Data {
    /// `undefined` (an empty or 204 response).
    None,
    Json(Json),
    Text(String),
    Bytes(Vec<u8>),
}

impl Data {
    pub fn json(&self) -> Option<&Json> {
        match self {
            Data::Json(j) => Some(j),
            _ => None,
        }
    }

    /// The value as JSON, as `JSON.stringify` would see it (`undefined` is null).
    pub fn into_json(self) -> Json {
        match self {
            Data::None => Json::Null,
            Data::Json(j) => j,
            Data::Text(t) => Json::String(t),
            Data::Bytes(b) => {
                // Buffer#toJSON.
                json::json!({ "type": "Buffer", "data": b })
            }
        }
    }
}

static OUT: Mutex<Option<std::io::BufWriter<std::io::Stdout>>> = Mutex::new(None);

/// Writes to stdout. A closed pipe (`guesty ... | head`) ends the process quietly.
pub fn write_out(bytes: &[u8]) {
    let mut guard = OUT.lock().unwrap_or_else(|e| e.into_inner());
    let out = guard.get_or_insert_with(|| std::io::BufWriter::with_capacity(64 * 1024, std::io::stdout()));
    if out.write_all(bytes).is_err() {
        std::process::exit(0);
    }
}

pub fn flush_out() {
    let mut guard = OUT.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(out) = guard.as_mut() {
        if out.flush().is_err() {
            std::process::exit(0);
        }
    }
}

/// Writes to stderr, after flushing stdout so the two interleave as written.
pub fn write_err(text: &str) {
    flush_out();
    crate::hooks::trace("stderr", crate::json::Json::from(text));
    let _ = std::io::stderr().write_all(text.as_bytes());
}

/// Text from a token service, which may be someone else's server, can carry
/// terminal escape sequences. Control characters other than newline become "?".
pub fn printable(value: &str) -> String {
    value
        .chars()
        .map(|c| {
            let n = c as u32;
            if (n <= 0x09) || (0x0b..=0x1f).contains(&n) || (0x7f..=0x9f).contains(&n) { '?' } else { c }
        })
        .collect()
}

/// `print(data)`.
pub fn print(data: &Data) {
    match data {
        Data::None => write_out(b"null\n"),
        Data::Text(s) => {
            write_out(s.as_bytes());
            if !s.ends_with('\n') {
                write_out(b"\n");
            }
        }
        Data::Bytes(b) => write_out(b),
        Data::Json(j) => print_json(j),
    }
}

/// `print(value)` for a JSON value.
pub fn print_value(value: &Json) {
    print(&Data::Json(value.clone()));
}

/// `printJson(data)`: `JSON.stringify(data, null, 2)` and a newline.
pub fn print_json(value: &Json) {
    let mut text = json::pretty(value, 2);
    text.push('\n');
    write_out(text.as_bytes());
}

/// `printTable(rows, columns)`.
pub fn print_table(rows: &[json::Map<String, Json>], columns: Option<&[&str]>) {
    if rows.is_empty() {
        write_out(b"[]\n");
        return;
    }
    let cols: Vec<String> = match columns {
        Some(c) => c.iter().map(|s| s.to_string()).collect(),
        None => rows[0].keys().cloned().collect(),
    };
    let cell = |row: &json::Map<String, Json>, col: &str| match row.get(col) {
        None | Some(Json::Null) => String::new(),
        Some(v) => json::js_string(v),
    };
    let widths: Vec<usize> = cols
        .iter()
        .map(|c| rows.iter().map(|r| json::js_len(&cell(r, c))).fold(json::js_len(c), usize::max))
        .collect();
    let pad = |s: &str, w: usize| format!("{s}{}", " ".repeat(w.saturating_sub(json::js_len(s))));
    let header: Vec<String> = cols.iter().zip(&widths).map(|(c, w)| pad(c, *w)).collect();
    let sep: Vec<String> = widths.iter().map(|w| "-".repeat(*w)).collect();
    write_out(format!("{}\n{}\n", header.join("  "), sep.join("  ")).as_bytes());
    for row in rows {
        let line: Vec<String> = cols.iter().zip(&widths).map(|(c, w)| pad(&cell(row, c), *w)).collect();
        write_out(format!("{}\n", line.join("  ")).as_bytes());
    }
}

/// Commands that call an endpoint Guesty documents as deprecated keep working
/// and print this notice on stderr, so stdout stays machine-readable.
pub fn warn_deprecated(command: &str, replacements: &[&str]) {
    let names: Vec<String> = replacements.iter().map(|n| format!("\"guesty {n}\"")).collect();
    let use_text = match names.len() {
        0 => String::new(),
        1 => names[0].clone(),
        n => format!("{}, or {}", names[..n - 1].join(", "), names[n - 1]),
    };
    let tail = if use_text.is_empty() {
        " Guesty documents no replacement.\n".to_string()
    } else {
        format!(" Use {use_text} instead.\n")
    };
    write_err(&format!("\x1b[33m[deprecated]\x1b[0m \"guesty {command}\" calls an endpoint Guesty has deprecated.{tail}"));
}
