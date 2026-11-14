//! Builds the catalog index from the four bundled API documents, as the
//! 2.0.0 CLI did at startup (port of PR #18's `catalog.ts`): the same
//! operations in the same order, each operation's place in its OpenAPI
//! document, and its search words. `build/main.rs` writes the result as
//! Rust statics, so nothing is scanned or parsed at runtime. The core's tests
//! include this file too, to check the generated index against a fresh build.

use std::collections::{BTreeSet, HashMap};

use super::js;
use super::json::{self, Json};
use super::scan::{self, Span};
use super::words::{method_words, words};

/// POST operations that only read: a quote calculation and two CSV downloads.
/// Every other non-GET operation changes data and needs the user's confirmation.
const READ_ONLY_POSTS: [&str; 3] = [
    "post_additional-fees-quotes-quoteid-amount",
    "propertiesexportlistingscsvdownload",
    "reservationsv2listcsvdownload",
];
const HTTP_METHODS: [&str; 5] = ["get", "post", "put", "patch", "delete"];

/// What search needs from one operation's OpenAPI object, and where it is.
struct Found {
    span: Span,
    summary: Option<String>,
    description: Option<String>,
    /// Where the description's string is, when it is one.
    description_span: Option<Span>,
    deprecated: bool,
}

/// An OpenAPI document's top-level members and each operation by "METHOD /prefix/path".
pub struct Doc {
    pub top: Vec<(String, Span)>,
    routes: HashMap<String, Found>,
}

/// An operation object's `summary`, `description` and `deprecated`.
fn found(text: &str, span: Span) -> Found {
    let (mut summary, mut description, mut deprecated) = (None, None, None);
    if scan::is_object(text, span) {
        let b = text.as_bytes();
        scan::each_member(text, span.start, |key, at| {
            let slot = match key.as_ref() {
                "summary" => &mut summary,
                "description" => &mut description,
                "deprecated" => &mut deprecated,
                _ => return None,
            };
            let end = scan::skip(b, at);
            // JSON.parse keeps the last duplicate.
            *slot = Some(Span { start: at, end });
            Some(end)
        });
    }
    let string = |s: Option<Span>| match s.map(|s| scan::parse(text, s)) {
        Some(Json::String(v)) => Some(v),
        _ => None,
    };
    let description_text = string(description);
    Found {
        span,
        summary: string(summary),
        description_span: description.filter(|_| description_text.is_some()),
        description: description_text,
        deprecated: deprecated.map(|s| &text[s.start..s.end]) == Some("true"),
    }
}

impl Doc {
    pub fn new(text: &str, prefix: &str) -> Doc {
        let b = text.as_bytes();
        let mut top = Vec::new();
        let mut routes = HashMap::new();
        scan::each_member(text, scan::ws(b, 0), |key, at| {
            let end = if key == "paths" && b[at] == b'{' {
                // Each path's last value wins, as in JSON.parse.
                let mut paths: HashMap<String, Vec<(&'static str, Found)>> = HashMap::new();
                let end = scan::each_member(text, at, |path, item| {
                    let mut methods: Vec<(&'static str, Found)> = Vec::new();
                    let end = scan::each_member(text, item, |method, spec| {
                        let method = HTTP_METHODS.iter().find(|m| **m == method)?;
                        // `spec && typeof spec === "object"`
                        if !matches!(b[spec], b'{' | b'[') {
                            return None;
                        }
                        let end = scan::skip(b, spec);
                        methods.retain(|(m, _)| m != method);
                        methods.push((method, found(text, Span { start: spec, end })));
                        Some(end)
                    });
                    paths.insert(path.into_owned(), methods);
                    Some(end)
                });
                routes = HashMap::new();
                for (path, methods) in paths {
                    for (method, spec) in methods {
                        routes.insert(format!("{} {prefix}{path}", method.to_uppercase()), spec);
                    }
                }
                end
            } else {
                scan::skip(b, at)
            };
            top.push((key.into_owned(), Span { start: at, end }));
            Some(end)
        });
        Doc { top, routes }
    }
}

/// One operation, as the runtime catalog holds it.
pub struct Op {
    pub id: String,
    /// "OpenApi" or "BookingEngine".
    pub api: &'static str,
    pub group: String,
    pub method: String,
    pub path: String,
    pub title: String,
    pub operation_id: Option<String>,
    pub docs_url: String,
    pub deprecated: bool,
    pub changes_data: bool,
    pub summary: Option<String>,
    pub description: Option<String>,
    pub description_span: Option<Span>,
    pub doc: usize,
    pub span: Option<Span>,
}

/// An operation's search words: title and summary (weight 4), path, ids and
/// group (3), its method's verbs (1.5) and the description's start (1),
/// each sorted and without repeats; and the title's words in order.
pub struct Search {
    pub fields: [Vec<String>; 4],
    pub title_words: Vec<String>,
}

fn load(api: &'static str, docs: &str, catalog_text: &str, doc_index: usize, doc: &Doc, out: &mut Vec<Op>) {
    let catalog = json::parse(catalog_text).unwrap_or(Json::Null);
    let Some(groups) = catalog.as_object() else { return };
    for (group, entries) in json::entries(groups) {
        let Some(entries) = entries.as_array() else { continue };
        for entry in entries {
            let field = |name: &str| entry.get(name).map(|v| js::string(Some(v))).unwrap_or_default();
            let method = field("method").to_uppercase();
            let path = field("path");
            let slug = field("slug");
            let spec = doc.routes.get(&format!("{method} {path}"));
            out.push(Op {
                api,
                group: group.clone(),
                changes_data: method != "GET" && !READ_ONLY_POSTS.contains(&slug.as_str()),
                method,
                path,
                title: field("title"),
                operation_id: entry.get("operationId").and_then(Json::as_str).map(str::to_string),
                docs_url: format!("{docs}{slug}"),
                deprecated: spec.is_some_and(|s| s.deprecated),
                summary: spec.and_then(|s| s.summary.clone()),
                description: spec.and_then(|s| s.description.clone()),
                description_span: spec.and_then(|s| s.description_span),
                id: slug,
                doc: doc_index,
                span: spec.map(|s| s.span),
            });
        }
    }
}

fn search(op: &Op) -> Search {
    let description = op.description.as_deref().map(|d| js::slice_utf16(d, 600).0).unwrap_or("");
    let summary = op.summary.as_deref().unwrap_or("");
    let set = |text: &str| words(text).into_iter().collect::<BTreeSet<String>>().into_iter().collect::<Vec<_>>();
    Search {
        title_words: words(&op.title),
        fields: [
            set(&format!("{} {summary}", op.title)),
            set(&format!("{} {} {} {}", op.path, op.operation_id.as_deref().unwrap_or(""), op.group, op.id)),
            set(method_words(&op.method)),
            set(description),
        ],
    }
}

pub struct Index {
    pub docs: [Doc; 2],
    pub operations: Vec<Op>,
    pub search: Vec<Search>,
    /// Every search word, sorted; `Search` fields are sorted the same way.
    pub vocabulary: Vec<String>,
}

/// The index of the Open API catalog and document, then the Booking Engine's.
pub fn build(open_api: &str, open_api_document: &str, booking: &str, booking_document: &str) -> Index {
    let docs = [Doc::new(open_api_document, "/v1"), Doc::new(booking_document, "")];
    let mut operations = Vec::new();
    load("OpenApi", "https://open-api-docs.guesty.com/reference/", open_api, 0, &docs[0], &mut operations);
    load("BookingEngine", "https://booking-api-docs.guesty.com/reference/", booking, 1, &docs[1], &mut operations);
    let search: Vec<Search> = operations.iter().map(search).collect();
    let all = search.iter().flat_map(|s| s.fields.iter().flatten().chain(&s.title_words));
    let vocabulary: Vec<String> = all.cloned().collect::<BTreeSet<String>>().into_iter().collect();
    Index { docs, operations, search, vocabulary }
}
