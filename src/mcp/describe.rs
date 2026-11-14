//! What `describe_operation` and `search_operations` show about an
//! operation (the describe half of PR #18's `catalog.ts`). Values follow
//! JavaScript: `None` is `undefined`, which JSON.stringify leaves out, and
//! `null` is kept.

use std::collections::HashSet;

use super::catalog::{Doc, Operation};
use super::js;
use crate::error::{CliError, Result};
use crate::json::{self, Json, Map, json};

/// `value[key]` for a value that may be anything: only objects have fields.
fn field<'a>(value: Option<&'a Json>, key: &str) -> Option<&'a Json> {
    value?.as_object()?.get(key)
}

fn truthy(value: Option<&Json>) -> bool {
    value.is_some_and(json::truthy)
}

/// `a ?? b`.
fn nullish<'a>(value: Option<&'a Json>) -> Option<&'a Json> {
    value.filter(|v| !v.is_null())
}

/// `Object.entries(value)` for an object or array; nothing for anything else.
fn entries(value: &Json) -> Vec<(String, &Json)> {
    match value {
        Json::Object(map) => json::entries(map).into_iter().map(|(k, v)| (k.clone(), v)).collect(),
        Json::Array(items) => items.iter().enumerate().map(|(i, v)| (i.to_string(), v)).collect(),
        _ => Vec::new(),
    }
}

fn keys(value: &Json) -> Vec<String> {
    entries(value).into_iter().map(|(k, _)| k).collect()
}

fn strings(values: Vec<String>, max: usize) -> Json {
    Json::Array(values.into_iter().take(max).map(Json::String).collect())
}

/// `value.replace(/\s+\n/g, "\n")`.
fn collapse_space_before_newlines(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    let mut run = String::new();
    let flush = |run: &mut String, out: &mut String| {
        // The match runs from the first space to the run's last newline,
        // and needs at least one character before that newline.
        match run.rfind('\n') {
            Some(last) if last > 0 => {
                out.push('\n');
                out.push_str(&run[last + 1..]);
            }
            _ => out.push_str(run),
        }
        run.clear();
    };
    for c in value.chars() {
        if js::is_space(c) {
            run.push(c);
        } else {
            flush(&mut run, &mut out);
            out.push(c);
        }
    }
    flush(&mut run, &mut out);
    out
}

/// `trim(value, max)`: a nonblank string, tidied and cut to `max` UTF-16 units.
pub fn trim(value: Option<&Json>, max: usize) -> Option<String> {
    let value = value?.as_str()?;
    if js::trim(value).is_empty() {
        return None;
    }
    let collapsed = collapse_space_before_newlines(value);
    let text = js::trim(&collapsed);
    if json::js_len(text) > max {
        // The documents have no characters outside the BMP, so no cut splits one.
        Some(format!("{}…", js::slice_utf16(text, max - 1).0))
    } else {
        Some(text.to_string())
    }
}

struct Resolved<'a> {
    schema: Option<&'a Json>,
    reference: Option<&'a str>,
}

fn resolve<'a>(value: Option<&'a Json>, document: &'static Doc, seen: &HashSet<String>) -> Resolved<'a> {
    let Some(value) = value.filter(|v| json::truthy(v) && (v.is_object() || v.is_array())) else {
        return Resolved { schema: None, reference: None };
    };
    let reference = match field(Some(value), "$ref") {
        Some(Json::String(r)) if r.starts_with("#/") => r.as_str(),
        _ => return Resolved { schema: Some(value), reference: None },
    };
    if seen.contains(reference) {
        return Resolved { schema: None, reference: Some(reference) };
    }
    let parts: Vec<String> = reference[2..].split('/').map(|p| p.replace("~1", "/").replace("~0", "~")).collect();
    Resolved { schema: document.pointer(&parts), reference: Some(reference) }
}

/// A schema small enough for an agent's context: descriptions trimmed, long
/// lists capped, references resolved, and deep nesting cut with a docs pointer.
fn compact(
    value: Option<&Json>,
    document: &'static Doc,
    depth: usize,
    max_depth: usize,
    seen: &HashSet<String>,
) -> Option<Json> {
    let Resolved { schema, reference } = resolve(value, document, seen);
    let Some(schema) = schema else {
        return match reference {
            Some(r) => Some(
                json!({ "note": format!("Recursive reference to {}; see the docs.", r.rsplit('/').next().unwrap_or("")) }),
            ),
            None => value.cloned(),
        };
    };
    let extended;
    let next_seen = match reference {
        Some(r) => {
            let mut s = seen.clone();
            s.insert(r.to_string());
            extended = s;
            &extended
        }
        None => seen,
    };
    let get = |key: &str| field(Some(schema), key);
    if depth >= max_depth {
        let mut out = Map::new();
        let kind = nullish(get("type")).cloned().or_else(|| truthy(get("properties")).then(|| json!("object")));
        if let Some(kind) = kind {
            out.insert("type".into(), kind);
        }
        out.insert("note".into(), json!("More fields; see the docs."));
        return Some(Json::Object(out));
    }
    let mut out = Map::new();
    for key in ["type", "format", "nullable", "default", "minimum", "maximum", "minItems", "maxItems", "pattern"] {
        if let Some(v) = get(key) {
            out.insert(key.into(), v.clone());
        }
    }
    if let Some(description) = trim(get("description"), 240) {
        out.insert("description".into(), Json::String(description));
    }
    if let Some(Json::Array(values)) = get("enum") {
        let mut list: Vec<Json> = values.iter().take(25).cloned().collect();
        if values.len() > 25 {
            list.push(json!("…"));
        }
        out.insert("enum".into(), Json::Array(list));
    }
    if let Some(example) = get("example") {
        if json::js_len(&json::compact(example)) <= 160 {
            out.insert("example".into(), example.clone());
        }
    }
    if let Some(Json::Array(required)) = get("required") {
        if !required.is_empty() {
            out.insert("required".into(), Json::Array(required.clone()));
        }
    }
    if truthy(get("items")) {
        if let Some(items) = compact(get("items"), document, depth + 1, max_depth, next_seen) {
            out.insert("items".into(), items);
        }
    }
    if let Some(properties) = get("properties").filter(|p| p.is_object() || p.is_array()) {
        let list = entries(properties);
        let mut shown = Map::new();
        for (name, child) in list.iter().take(60) {
            if let Some(c) = compact(Some(child), document, depth + 1, max_depth, next_seen) {
                shown.insert(name.clone(), c);
            }
        }
        out.insert("properties".into(), Json::Object(shown));
        if list.len() > 60 {
            out.insert("note".into(), Json::String(format!("{} more properties; see the docs.", list.len() - 60)));
        }
    }
    if let Some(extra) = get("additionalProperties").filter(|p| p.is_object() || p.is_array()) {
        if let Some(c) = compact(Some(extra), document, depth + 1, max_depth, next_seen) {
            out.insert("additionalProperties".into(), c);
        }
    }
    for key in ["oneOf", "anyOf", "allOf"] {
        if let Some(Json::Array(children)) = get(key) {
            let list = children
                .iter()
                .take(10)
                .map(|child| compact(Some(child), document, depth + 1, max_depth, next_seen).unwrap_or(Json::Null))
                .collect();
            out.insert(key.into(), Json::Array(list));
        }
    }
    Some(Json::Object(out))
}

fn compact_schema(schema: Option<&Json>, document: &'static Doc) -> Result<Json> {
    for max_depth in [6, 4, 2] {
        let Some(result) = compact(schema, document, 0, max_depth, &HashSet::new()) else {
            // JSON.stringify(undefined).length
            return Err(CliError::new("Cannot read properties of undefined (reading 'length')"));
        };
        if json::js_len(&json::compact(&result)) <= 20_000 {
            return Ok(result);
        }
    }
    Ok(json!({ "note": "This schema is too large to show; see the docs." }))
}

/// Top-level response fields, plus the fields of each item in a results list.
fn response_shape(schema: Option<&Json>, document: &'static Doc) -> Option<Json> {
    let none = HashSet::new();
    let resolved = resolve(schema, document, &none).schema?;
    let get = |key: &str| field(Some(resolved), key);
    if get("type") == Some(&json!("array")) || truthy(get("items")) {
        let item = resolve(get("items"), document, &none).schema;
        let names = match field(item, "properties") {
            Some(p) if json::truthy(p) => keys(p),
            _ => Vec::new(),
        };
        return Some(if names.is_empty() {
            json!({ "type": "array" })
        } else {
            json!({ "array_of": strings(names, 40) })
        });
    }
    let properties = get("properties").filter(|p| json::truthy(p));
    let Some(properties) = properties else {
        return truthy(get("type")).then(|| json!({ "type": get("type").cloned() }));
    };
    let mut shape = Map::new();
    shape.insert("fields".into(), strings(keys(properties), 40));
    for (name, child) in entries(properties) {
        let list = resolve(Some(child), document, &none).schema;
        let item = if field(list, "type") == Some(&json!("array")) {
            resolve(field(list, "items"), document, &none).schema
        } else {
            None
        };
        if let Some(p) = field(item, "properties").filter(|p| json::truthy(p)) {
            shape.insert(format!("{name}[]"), strings(keys(p), 40));
        }
    }
    Some(Json::Object(shape))
}

/// The `{name}` placeholders in a path, as `/\{([^}]+)\}/g` finds them.
pub fn placeholders(path: &str) -> Vec<(usize, usize, &str)> {
    let mut found = Vec::new();
    let mut i = 0;
    while let Some(open) = path[i..].find('{').map(|o| o + i) {
        match path[open + 1..].find('}').map(|c| c + open + 1) {
            Some(close) if close > open + 1 => {
                found.push((open, close + 1, &path[open + 1..close]));
                i = close + 1;
            }
            Some(_) => i = open + 1,
            None => break,
        }
    }
    found
}

pub fn parameters(op: &Operation) -> Vec<Json> {
    let document = op.document();
    let none = HashSet::new();
    let mut result: Vec<Json> = Vec::new();
    if let Some(Json::Array(list)) = field(Some(op.spec()), "parameters") {
        for raw in list {
            let Some(param) = resolve(Some(raw), document, &none).schema else { continue };
            let (Some(Json::String(name)), Some(Json::String(place))) =
                (field(Some(param), "name"), field(Some(param), "in"))
            else {
                continue;
            };
            if place == "header" && name.eq_ignore_ascii_case("authorization") {
                continue;
            }
            let empty = Json::Object(Map::new());
            let schema = resolve(field(Some(param), "schema"), document, &none).schema.unwrap_or(&empty);
            let get = |key: &str| field(Some(schema), key);
            let mut out = Map::new();
            out.insert("name".into(), Json::String(name.clone()));
            out.insert("in".into(), Json::String(place.clone()));
            out.insert(
                "required".into(),
                Json::Bool(field(Some(param), "required") == Some(&Json::Bool(true)) || place == "path"),
            );
            let kind =
                nullish(get("type")).cloned().or_else(|| truthy(get("oneOf")).then(|| json!("one of several types")));
            if let Some(kind) = kind {
                out.insert("type".into(), kind);
            }
            let description = nullish(field(Some(param), "description")).or_else(|| get("description"));
            if let Some(d) = trim(description, 300) {
                out.insert("description".into(), Json::String(d));
            }
            if let Some(Json::Array(values)) = get("enum") {
                out.insert("enum".into(), Json::Array(values.iter().take(25).cloned().collect()));
            }
            if let Some(default) = get("default") {
                out.insert("default".into(), default.clone());
            }
            if let Some(example) = nullish(field(Some(param), "example")).or_else(|| get("example")) {
                out.insert("example".into(), example.clone());
            }
            result.push(Json::Object(out));
        }
    }
    // Path parameters Guesty's page left undocumented still have to be filled in.
    for (_, _, name) in placeholders(&op.path) {
        let documented = result.iter().any(|p| p["in"] == "path" && p["name"] == name);
        if !documented {
            result.push(json!({ "name": name, "in": "path", "required": true, "type": "string" }));
        }
    }
    result
}

pub fn describe_operation(op: &Operation) -> Result<Json> {
    let document = op.document();
    let none = HashSet::new();
    let spec = op.spec();
    let params = parameters(op);
    let body = resolve(field(Some(spec), "requestBody"), document, &none).schema;
    let empty = Json::Object(Map::new());
    let content = nullish(field(body, "content")).unwrap_or(&empty);
    let types = keys(content);
    let content_type = types.iter().find(|t| t.contains("json")).or(types.first()).cloned();
    let mut responses = Map::new();
    if let Some(all) = nullish(field(Some(spec), "responses")) {
        for (status, raw) in entries(all) {
            let b = status.as_bytes();
            if !(b.len() == 3 && b[0] == b'2' && b[1].is_ascii_digit() && b[2].is_ascii_digit()) {
                continue;
            }
            let response = resolve(Some(raw), document, &none).schema;
            let description = trim(field(response, "description"), 200);
            let media = nullish(field(response, "content")).unwrap_or(&empty);
            let found = entries(media).into_iter().find(|(t, _)| t.contains("json")).map(|(_, v)| v);
            let shown = match found.filter(|v| json::truthy(v)) {
                Some(media) => response_shape(field(Some(media), "schema"), document).or(description.map(Json::String)),
                None => Some(Json::String(description.unwrap_or_else(|| "No content".into()))),
            };
            match shown {
                Some(v) => {
                    responses.insert(status, v);
                }
                None => {
                    responses.shift_remove(&status);
                }
            }
        }
    }
    let mut example = Map::new();
    example.insert("operation".into(), Json::String(op.id.clone()));
    let placeholder_map = |place: &str, required_only: bool| {
        let mut map = Map::new();
        for p in params.iter().filter(|p| p["in"] == place && (!required_only || p["required"] == true)) {
            let name = p["name"].as_str().unwrap_or("").to_string();
            map.insert(name.clone(), Json::String(format!("<{name}>")));
        }
        map
    };
    let path_params = placeholder_map("path", false);
    if params.iter().any(|p| p["in"] == "path") {
        example.insert("path_params".into(), Json::Object(path_params));
    }
    if params.iter().any(|p| p["in"] == "query" && p["required"] == true) {
        example.insert("query".into(), Json::Object(placeholder_map("query", true)));
    }
    if body.is_some() {
        example.insert("body".into(), json!("<object matching request_body.schema>"));
    }
    if op.changes_data {
        example.insert("confirm".into(), json!(true));
    }
    let mut out = Map::new();
    out.insert("id".into(), json!(op.id));
    out.insert("api".into(), json!(op.api.as_str()));
    out.insert("method".into(), json!(op.method));
    out.insert("path".into(), json!(op.path));
    out.insert("title".into(), json!(op.title));
    out.insert("docs".into(), json!(op.docs_url));
    out.insert("changes_data".into(), json!(op.changes_data));
    if op.deprecated {
        out.insert(
            "deprecated".into(),
            json!("Guesty marks this operation deprecated. Search for its replacement before using it."),
        );
    }
    if let Some(d) = trim(field(Some(spec), "description"), 2_500).or_else(|| trim(field(Some(spec), "summary"), 500)) {
        out.insert("description".into(), Json::String(d));
    }
    out.insert("parameters".into(), Json::Array(params.clone()));
    let request_body = match body {
        None => Json::Null,
        Some(body) => {
            let mut rb = Map::new();
            rb.insert("required".into(), Json::Bool(field(Some(body), "required") == Some(&Json::Bool(true))));
            if let Some(t) = &content_type {
                rb.insert("content_type".into(), json!(t));
            }
            match &content_type {
                Some(t) if !t.contains("json") => {
                    rb.insert(
                        "note".into(),
                        Json::String(format!(
                            "This operation takes {t}, which call_operation can't send. Use the matching Guesty CLI command in a terminal instead."
                        )),
                    );
                }
                Some(t) => {
                    let media = content.get(t.as_str());
                    let schema = compact_schema(field(media.filter(|m| !m.is_null()), "schema"), document)?;
                    rb.insert("schema".into(), schema);
                }
                None => {}
            }
            Json::Object(rb)
        }
    };
    out.insert("request_body".into(), request_body);
    out.insert("responses".into(), Json::Object(responses));
    out.insert("example_call".into(), Json::Object(example));
    Ok(Json::Object(out))
}

/// `split(/\n\s*\n|(?<=\.)\s/)[0]`: the text before the first blank line or
/// the first space after a full stop.
fn first_sentence(text: &str) -> &str {
    let chars: Vec<(usize, char)> = text.char_indices().collect();
    for (k, &(at, c)) in chars.iter().enumerate() {
        if c == '\n' && chars[k + 1..].iter().take_while(|(_, c)| js::is_space(*c)).any(|(_, c)| *c == '\n') {
            return &text[..at];
        }
        if js::is_space(c) && k > 0 && chars[k - 1].1 == '.' {
            return &text[..at];
        }
    }
    text
}

pub fn listing(op: &Operation) -> Json {
    let first = op.description.as_deref().map(|d| Json::String(first_sentence(d).to_string()));
    let summary = trim(first.as_ref(), 200);
    let mut out = Map::new();
    out.insert("id".into(), json!(op.id));
    out.insert("api".into(), json!(op.api.as_str()));
    out.insert("method".into(), json!(op.method));
    out.insert("path".into(), json!(op.path));
    out.insert("title".into(), json!(op.title));
    if let Some(s) = summary.filter(|s| *s != op.title) {
        out.insert("summary".into(), Json::String(s));
    }
    out.insert("changes_data".into(), json!(op.changes_data));
    if op.deprecated {
        out.insert("deprecated".into(), json!(true));
    }
    Json::Object(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn text_tidying_matches_javascript() {
        assert_eq!(collapse_space_before_newlines("a  \n\n b\n c \t\nd"), "a\n b\n c\nd");
        assert_eq!(collapse_space_before_newlines("a\nb"), "a\nb");
        assert_eq!(first_sentence("One. Two"), "One.");
        assert_eq!(first_sentence("One\n \nTwo. x"), "One");
        assert_eq!(first_sentence("v1.2 is"), "v1.2 is");
        assert_eq!(placeholders("/a/{id}/{}/{x{y}/{z"), vec![(3, 7, "id"), (11, 16, "x{y")]);
    }
}
