//! Every documented Guesty operation, from the catalogs and OpenAPI documents
//! bundled with the CLI (the nightly docs watch keeps them current). Port of
//! PR #18's `src/mcp/catalog.ts`: the same operations in the same order, the
//! same search ranking, and (in `describe.rs`) the same descriptions.
//!
//! The documents are embedded in the binary. Loading them indexes each
//! operation's place in its document (`scan.rs`) and parses only the fields
//! search needs; an operation's full spec is parsed the first time it's used.

use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;

use super::js;
use super::scan::{self, Span};
use crate::error::Result;
use crate::json::{self, Json};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Api {
    OpenApi,
    BookingEngine,
}

impl Api {
    pub fn as_str(self) -> &'static str {
        match self {
            Api::OpenApi => "open-api",
            Api::BookingEngine => "booking-engine",
        }
    }

    fn docs(self) -> &'static str {
        match self {
            Api::OpenApi => "https://open-api-docs.guesty.com/reference/",
            Api::BookingEngine => "https://booking-api-docs.guesty.com/reference/",
        }
    }
}

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
    deprecated: bool,
}

/// An OpenAPI document, indexed in one pass: its top-level members (each
/// parsed the first time a `$ref` points into it), and each operation by
/// "METHOD /prefix/path".
pub struct Doc {
    text: &'static str,
    top: Vec<(String, Span)>,
    values: Vec<OnceLock<Json>>,
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
    Found {
        span,
        summary: string(summary),
        description: string(description),
        deprecated: deprecated.map(|s| &text[s.start..s.end]) == Some("true"),
    }
}

impl Doc {
    fn new(text: &'static str, prefix: &str) -> Doc {
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
        let values = top.iter().map(|_| OnceLock::new()).collect();
        Doc { text, top, values, routes }
    }

    /// `document` followed through a JSON pointer's parts, as
    /// `target?.[part]` does, when it ends at an object or array.
    pub fn pointer(&'static self, parts: &[String]) -> Option<&'static Json> {
        let (first, rest) = parts.split_first()?;
        let index = self.top.iter().rposition(|(k, _)| k == first)?;
        let mut target: &'static Json = self.values[index].get_or_init(|| scan::parse(self.text, self.top[index].1));
        for part in rest {
            target = match target {
                Json::Object(map) => map.get(part.as_str())?,
                Json::Array(items) => {
                    if !json::is_index_key(part) {
                        return None;
                    }
                    items.get(part.parse::<usize>().ok()?)?
                }
                _ => return None,
            };
        }
        (target.is_object() || target.is_array()).then_some(target)
    }
}

pub struct Operation {
    /// Guesty's documentation slug: unique across both APIs and stable in its docs URL.
    pub id: String,
    pub api: Api,
    pub group: String,
    pub method: String,
    /// Full request path, starting /v1/ (Open API) or /api/ (Booking Engine).
    pub path: String,
    pub title: String,
    pub operation_id: Option<String>,
    pub docs_url: String,
    pub deprecated: bool,
    pub changes_data: bool,
    /// The spec's `summary` and `description`, when they are strings.
    pub summary: Option<String>,
    pub description: Option<String>,
    doc: usize,
    span: Option<Span>,
    spec: OnceLock<Json>,
}

impl Operation {
    /// The operation's OpenAPI object, or `{}` when the document has none.
    pub fn spec(&self) -> &Json {
        self.spec.get_or_init(|| match self.span {
            Some(span) => scan::parse(catalog().docs[self.doc].text, span),
            None => Json::Object(json::Map::new()),
        })
    }

    pub fn document(&self) -> &'static Doc {
        &catalog().docs[self.doc]
    }
}

pub struct Catalog {
    docs: [Doc; 2],
    pub operations: Vec<Operation>,
}

const OPEN_API: &str = include_str!("../../api-spec.json");
const OPEN_API_DOCUMENT: &str = include_str!("../../openapi-spec.json");
const BOOKING_ENGINE: &str = include_str!("../../booking-engine-api-spec.json");
const BOOKING_ENGINE_DOCUMENT: &str = include_str!("../../booking-engine-openapi-spec.json");

fn load(api: Api, catalog_text: &str, doc_index: usize, doc: &Doc, out: &mut Vec<Operation>) {
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
            out.push(Operation {
                api,
                group: group.clone(),
                changes_data: method != "GET" && !READ_ONLY_POSTS.contains(&slug.as_str()),
                method,
                path,
                title: field("title"),
                operation_id: entry.get("operationId").and_then(Json::as_str).map(str::to_string),
                docs_url: format!("{}{slug}", api.docs()),
                deprecated: spec.is_some_and(|s| s.deprecated),
                summary: spec.and_then(|s| s.summary.clone()),
                description: spec.and_then(|s| s.description.clone()),
                id: slug,
                doc: doc_index,
                span: spec.map(|s| s.span),
                spec: OnceLock::new(),
            });
        }
    }
}

pub fn catalog() -> &'static Catalog {
    static CATALOG: OnceLock<Catalog> = OnceLock::new();
    CATALOG.get_or_init(|| {
        // The two documents index at the same time.
        let booking = std::thread::spawn(|| Doc::new(BOOKING_ENGINE_DOCUMENT, ""));
        let open_api = Doc::new(OPEN_API_DOCUMENT, "/v1");
        let docs = [open_api, booking.join().unwrap_or_else(|_| Doc::new(BOOKING_ENGINE_DOCUMENT, ""))];
        let mut operations = Vec::new();
        load(Api::OpenApi, OPEN_API, 0, &docs[0], &mut operations);
        load(Api::BookingEngine, BOOKING_ENGINE, 1, &docs[1], &mut operations);
        Catalog { docs, operations }
    })
}

pub fn operations() -> &'static [Operation] {
    &catalog().operations
}

/// Loads the catalog and the search index, so the first search is fast.
pub fn prepare() {
    indexed();
}

/// `/^([A-Za-z]+)\s+(\/\S*)$/` on a trimmed reference: the method and path.
fn route(value: &str) -> Option<(&str, &str)> {
    let letters = value.find(|c: char| !c.is_ascii_alphabetic()).unwrap_or(value.len());
    if letters == 0 {
        return None;
    }
    let rest = &value[letters..];
    let path = rest.trim_start_matches(js::is_space);
    if path.len() == rest.len() || !path.starts_with('/') || path.chars().any(js::is_space) {
        return None;
    }
    Some((&value[..letters], path))
}

/// Finds an operation by its id, its OpenAPI operationId, or "METHOD /path".
pub fn find_operation(reference: &str) -> Option<&'static Operation> {
    find_index(reference).map(|i| &operations()[i])
}

fn find_index(reference: &str) -> Option<usize> {
    let value = js::trim(reference);
    let route = route(value);
    operations().iter().position(|op| {
        op.id == value
            || op.operation_id.as_deref() == Some(value)
            || route.is_some_and(|(method, path)| op.method == method.to_ascii_uppercase() && op.path == path)
    })
}

// ─── Search ───────────────────────────────────────────────────────────────────

fn is_stop_word(word: &str) -> bool {
    matches!(
        word,
        "a" | "an"
            | "the"
            | "of"
            | "for"
            | "to"
            | "in"
            | "on"
            | "by"
            | "with"
            | "and"
            | "or"
            | "my"
            | "all"
            | "me"
            | "i"
            | "how"
            | "do"
            | "does"
            | "can"
            | "is"
            | "are"
            | "be"
            | "this"
            | "that"
            | "from"
            | "at"
            | "as"
            | "it"
            | "its"
            | "what"
            | "which"
            | "into"
            | "per"
            | "via"
            | "api"
            | "guesty"
            | "please"
            | "want"
            | "need"
    )
}

fn method_words(method: &str) -> &'static str {
    match method {
        "GET" => "get list read fetch show search find retrieve view",
        "POST" => "create add new post send make",
        "PUT" => "update edit change set modify replace",
        "PATCH" => "update edit change set modify",
        "DELETE" => "delete remove cancel",
        _ => "",
    }
}

/// Words people use for the same thing Guesty names differently.
fn synonyms(term: &str) -> &'static [&'static str] {
    match term {
        "booking" => &["reservation"],
        "reservation" => &["booking"],
        "stay" => &["reservation"],
        "property" | "unit" | "home" | "house" | "rental" => &["listing"],
        "price" => &["pricing", "rate"],
        "rate" => &["price", "pricing"],
        "pricing" => &["price", "rate"],
        "availability" => &["calendar"],
        "available" => &["calendar", "availability"],
        "calendar" => &["availability"],
        "message" => &["conversation", "post"],
        "conversation" => &["message"],
        "chat" => &["conversation", "message"],
        "inbox" => &["conversation"],
        "payout" => &["payment"],
        "payment" => &["payout", "charge"],
        "charge" | "refund" => &["payment"],
        "guest" => &["contact"],
        "cleaning" | "cleaner" => &["task"],
        "task" => &["cleaning"],
        "cancel" => &["cancellation", "delete"],
        "remove" => &["delete"],
        "delete" => &["remove"],
        "create" => &["add"],
        "add" => &["create"],
        "update" => &["edit"],
        "edit" => &["update"],
        "list" => &["search", "retrieve", "get"],
        "search" => &["list", "find"],
        "find" => &["search", "list"],
        "retrieve" => &["get", "list"],
        "get" => &["retrieve"],
        "show" => &["get", "retrieve"],
        "block" => &["calendar", "update"],
        _ => &[],
    }
}

/// Spellings Guesty's titles use for the same word.
fn variant(word: &str) -> Option<&'static str> {
    Some(match word {
        "cancellation" | "canceled" | "cancelled" | "cancelling" | "canceling" => "cancel",
        "msg" | "messaging" => "message",
        "checking" | "checkin" | "checkout" => "check",
        _ => return None,
    })
}

fn stem(word: &str) -> String {
    let n = word.len();
    if n > 4 && word.ends_with("ies") {
        return format!("{}y", &word[..n - 3]);
    }
    if n > 4 && ["sses", "xes", "ches", "shes"].iter().any(|end| word.ends_with(end)) {
        return word[..n - 2].to_string();
    }
    if n > 3 && word.ends_with('s') && !word.ends_with("ss") {
        return word[..n - 1].to_string();
    }
    word.to_string()
}

/// The search words in a text: camelCase split, lowercased, stop words
/// dropped, plurals and variant spellings folded.
pub fn words(text: &str) -> Vec<String> {
    let mut spaced = String::with_capacity(text.len() + 8);
    let mut previous: Option<char> = None;
    for c in text.chars() {
        if previous.is_some_and(|p| p.is_ascii_lowercase() || p.is_ascii_digit()) && c.is_ascii_uppercase() {
            spaced.push(' ');
        }
        spaced.push(c);
        previous = Some(c);
    }
    let lower = spaced.to_lowercase();
    lower
        .split(|c: char| !(c.is_ascii_lowercase() || c.is_ascii_digit()))
        .filter(|word| !word.is_empty() && !is_stop_word(word))
        .map(|word| {
            let stemmed = stem(word);
            variant(&stemmed).map(str::to_string).unwrap_or(stemmed)
        })
        .collect()
}

struct Indexed {
    fields: [(HashSet<String>, f64); 4],
    title_words: Vec<String>,
}

fn indexed() -> &'static [Indexed] {
    static INDEX: OnceLock<Vec<Indexed>> = OnceLock::new();
    INDEX.get_or_init(|| {
        operations()
            .iter()
            .map(|op| {
                let description = op.description.as_deref().map(|d| js::slice_utf16(d, 600).0).unwrap_or("");
                let summary = op.summary.as_deref().unwrap_or("");
                let set = |text: &str| words(text).into_iter().collect::<HashSet<String>>();
                Indexed {
                    title_words: words(&op.title),
                    fields: [
                        (set(&format!("{} {summary}", op.title)), 4.0),
                        (
                            set(&format!(
                                "{} {} {} {}",
                                op.path,
                                op.operation_id.as_deref().unwrap_or(""),
                                op.group,
                                op.id
                            )),
                            3.0,
                        ),
                        (set(method_words(&op.method)), 1.5),
                        (set(description), 1.0),
                    ],
                }
            })
            .collect()
    })
}

#[derive(Default)]
pub struct SearchOptions {
    pub api: Option<Api>,
    pub limit: Option<f64>,
    pub include_deprecated: bool,
}

/// `query.trim().match(/\/[\w/{}.-]*/)?.[0]`
fn path_query(query: &str) -> Option<&str> {
    let trimmed = js::trim(query);
    let start = trimmed.find('/')?;
    let rest = &trimmed[start + 1..];
    let end = rest
        .find(|c: char| !(c.is_ascii_alphanumeric() || matches!(c, '_' | '/' | '{' | '}' | '.' | '-')))
        .unwrap_or(rest.len());
    Some(&trimmed[start..start + 1 + end])
}

pub fn search_operations(query: &str, options: &SearchOptions) -> Result<Vec<&'static Operation>> {
    let limit = options.limit.unwrap_or(10.0).max(1.0).min(25.0).trunc() as usize;
    let ops = operations();
    let exact = find_index(query);
    let mut terms: Vec<String> = Vec::new();
    for term in words(query) {
        if !terms.contains(&term) {
            terms.push(term);
        }
    }
    let path_query = path_query(query);
    let related: HashSet<&str> =
        terms.iter().flat_map(|t| std::iter::once(t.as_str()).chain(synonyms(t).iter().copied())).collect();
    let mut scored: Vec<(usize, f64)> = Vec::new();
    for (i, (op, entry)) in ops.iter().zip(indexed()).enumerate() {
        if options.api.is_some_and(|api| op.api != api) {
            continue;
        }
        let is_exact = exact == Some(i);
        if op.deprecated && !options.include_deprecated && !is_exact {
            continue;
        }
        let mut score: f64 = if is_exact { 100.0 } else { 0.0 };
        if let Some(pq) = path_query {
            if pq.len() > 1 && op.path.starts_with(pq) {
                score += if op.path == pq { 20.0 } else { 8.0 };
            }
        }
        let fields = &entry.fields;
        let mut matched = 0usize;
        let mut in_title = 0usize;
        for term in &terms {
            let mut best: f64 = 0.0;
            for (set, weight) in fields {
                if set.contains(term) {
                    best = best.max(*weight);
                }
            }
            for synonym in synonyms(term) {
                for (set, weight) in fields {
                    if set.contains(*synonym) {
                        best = best.max(weight / 2.0);
                    }
                }
            }
            if best > 0.0 {
                matched += 1;
            }
            if fields[0].0.contains(term) || synonyms(term).iter().any(|s| fields[0].0.contains(*s)) {
                in_title += 1;
            }
            score += best;
        }
        if terms.len() > 1 && matched == terms.len() {
            score += 3.0;
        }
        // Several of the words together in the title beat one word plus the path.
        if in_title > 1 {
            score += 2.0 * (in_title - 1) as f64;
        }
        // Prefer titles that are mostly about what was asked.
        if in_title > 0 && !entry.title_words.is_empty() {
            let hits = entry.title_words.iter().filter(|w| related.contains(w.as_str())).count();
            score += 4.0 * hits as f64 / entry.title_words.len() as f64;
        }
        if score <= 0.0 {
            continue;
        }
        if op.deprecated {
            score *= 0.6;
        }
        scored.push((i, score));
    }
    // A stable sort, like Array.prototype.sort.
    scored.sort_by(|(ai, a), (bi, b)| {
        let (x, y) = (&ops[*ai], &ops[*bi]);
        let by_score = b - a;
        if by_score != 0.0 {
            return by_score.partial_cmp(&0.0).unwrap_or(std::cmp::Ordering::Equal);
        }
        (x.changes_data as i32 - y.changes_data as i32)
            .cmp(&0)
            .then((json::js_len(&x.path) as i64 - json::js_len(&y.path) as i64).cmp(&0))
    });
    Ok(scored.into_iter().take(limit).map(|(i, _)| &ops[i]).collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn documents_are_valid_json() {
        for text in [OPEN_API, OPEN_API_DOCUMENT, BOOKING_ENGINE, BOOKING_ENGINE_DOCUMENT] {
            assert!(json::parse(text).is_ok());
        }
    }

    #[test]
    fn the_index_matches_a_full_parse() {
        let doc = json::parse(OPEN_API_DOCUMENT).unwrap();
        for op in operations().iter().filter(|op| op.api == Api::OpenApi) {
            let full = doc["paths"].get(&op.path[3..]).and_then(|item| item.get(op.method.to_lowercase()));
            match full {
                Some(spec) => {
                    assert_eq!(op.spec(), spec, "{}", op.id);
                    assert_eq!(
                        op.description.as_ref(),
                        spec.get("description").and_then(Json::as_str).map(str::to_string).as_ref()
                    );
                }
                None => assert_eq!(op.spec(), &Json::Object(json::Map::new())),
            }
        }
    }

    #[test]
    fn words_fold_like_catalog_ts() {
        assert_eq!(words("getListingsByID for the Cancelled stays"), ["get", "listing", "id", "cancel", "stay"]);
        assert_eq!(words("boxes classes properties"), ["box", "class", "property"]);
        assert_eq!(route("get  /v1/x"), Some(("get", "/v1/x")));
        assert_eq!(route("get/v1/x"), None);
        assert_eq!(path_query(" GET /v1/webhooks?x"), Some("/v1/webhooks"));
    }
}
