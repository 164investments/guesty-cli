//! What a request produced, mirroring the JavaScript values the Node CLI
//! printed, and the text rule for strings from a service we don't control.

use crate::json::{self, Json};

#[derive(Debug, Clone, PartialEq)]
pub enum Data {
    /// `undefined` (an empty or 204 response).
    None,
    Json(Json),
    Text(String),
    Bytes(Vec<u8>),
}

impl Data {
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
