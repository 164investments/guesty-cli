//! Every documented Guesty operation, from the catalogs and OpenAPI documents
//! bundled with the CLI (the nightly docs watch keeps them current). Port of
//! PR #18's `src/mcp/catalog.ts`: the same operations in the same order, the
//! same search ranking, and (in `describe.rs`) the same descriptions.
//!
//! The index is built when the crate compiles (`build/main.rs`): each
//! operation's fields, its place in its OpenAPI document, and its search
//! words are statics, so nothing is scanned at startup. The OpenAPI documents
//! are embedded; an operation's full spec is parsed the first time it's used.

use std::sync::OnceLock;

use super::js;
use super::words::{synonyms, words};
use crate::json::{self, Json};
pub use crate::request::Api;

/// A value's byte range in its document.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Span {
    pub start: usize,
    pub end: usize,
}

fn parse(text: &str, span: Span) -> Json {
    json::parse(&text[span.start..span.end]).unwrap_or(Json::Null)
}

/// An OpenAPI document and its top-level members, each parsed the first time
/// a `$ref` points into it.
pub struct Doc {
    text: &'static str,
    top: &'static [(&'static str, Span)],
    values: &'static [OnceLock<Json>],
}

impl Doc {
    /// `document` followed through a JSON pointer's parts, as
    /// `target?.[part]` does, when it ends at an object or array.
    pub fn pointer(&'static self, parts: &[String]) -> Option<&'static Json> {
        let (first, rest) = parts.split_first()?;
        // JSON.parse keeps the last duplicate.
        let index = self.top.iter().rposition(|(k, _)| k == first)?;
        let mut target: &'static Json = self.values[index].get_or_init(|| parse(self.text, self.top[index].1));
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
    pub id: &'static str,
    pub api: Api,
    pub group: &'static str,
    pub method: &'static str,
    /// Full request path, starting /v1/ (Open API) or /api/ (Booking Engine).
    pub path: &'static str,
    pub title: &'static str,
    pub operation_id: Option<&'static str>,
    pub docs_url: &'static str,
    pub deprecated: bool,
    pub changes_data: bool,
    doc: usize,
    span: Option<Span>,
    /// Where the spec's `description` is, when it's a string.
    description_span: Option<Span>,
    spec: OnceLock<Json>,
    description: OnceLock<Option<String>>,
}

impl Operation {
    /// The operation's OpenAPI object, or `{}` when the document has none.
    pub fn spec(&self) -> &Json {
        self.spec.get_or_init(|| match self.span {
            Some(span) => parse(DOCS[self.doc].text, span),
            None => Json::Object(json::Map::new()),
        })
    }

    /// The spec's `description`, when it's a string.
    pub fn description(&self) -> Option<&str> {
        let decoded = self.description.get_or_init(|| {
            let span = self.description_span?;
            parse(DOCS[self.doc].text, span).as_str().map(str::to_string)
        });
        decoded.as_deref()
    }

    pub fn document(&self) -> &'static Doc {
        &DOCS[self.doc]
    }
}

/// An operation's search words, as places in `WORDS`: four fields, each
/// sorted, with their weights in `WEIGHTS`, and its title's words in order.
struct Indexed {
    fields: [&'static [u16]; 4],
    title_words: &'static [u16],
}

/// Title and summary, path and ids, the method's verbs, the description.
const WEIGHTS: [f64; 4] = [4.0, 3.0, 1.5, 1.0];

const OPEN_API_DOCUMENT: &str = include_str!("../../../../openapi-spec.json");
const BOOKING_ENGINE_DOCUMENT: &str = include_str!("../../../../booking-engine-openapi-spec.json");

include!(concat!(env!("OUT_DIR"), "/catalog_index.rs"));

static DOCS: [Doc; 2] = [
    Doc { text: OPEN_API_DOCUMENT, top: &DOC_0_TOP, values: &DOC_0_VALUES },
    Doc { text: BOOKING_ENGINE_DOCUMENT, top: &DOC_1_TOP, values: &DOC_1_VALUES },
];

pub fn operations() -> &'static [Operation] {
    &OPERATIONS
}

fn indexed() -> &'static [Indexed] {
    &SEARCH
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
            || op.operation_id == Some(value)
            || route.is_some_and(|(method, path)| op.method == method.to_ascii_uppercase() && op.path == path)
    })
}

// ─── Search ───────────────────────────────────────────────────────────────────

/// A word's place in the vocabulary; None when no operation uses it.
fn word_id(word: &str) -> Option<u16> {
    WORDS.binary_search(&word).ok().map(|i| i as u16)
}

fn has(set: &[u16], word: Option<u16>) -> bool {
    word.is_some_and(|id| set.binary_search(&id).is_ok())
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

pub fn search_operations(query: &str, options: &SearchOptions) -> Vec<&'static Operation> {
    let limit = options.limit.unwrap_or(10.0).max(1.0).min(25.0).trunc() as usize;
    let ops = operations();
    let exact = find_index(query);
    let mut terms: Vec<String> = Vec::new();
    for term in words(query) {
        if !terms.contains(&term) {
            terms.push(term);
        }
    }
    // Each term and its synonyms, as vocabulary places.
    let ids: Vec<(Option<u16>, Vec<Option<u16>>)> =
        terms.iter().map(|t| (word_id(t), synonyms(t).iter().map(|s| word_id(s)).collect())).collect();
    let path_query = path_query(query);
    let related: std::collections::HashSet<&str> =
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
        for (term, synonyms) in &ids {
            let mut best: f64 = 0.0;
            for (set, weight) in fields.iter().zip(WEIGHTS) {
                if has(set, *term) {
                    best = best.max(weight);
                }
            }
            for synonym in synonyms {
                for (set, weight) in fields.iter().zip(WEIGHTS) {
                    if has(set, *synonym) {
                        best = best.max(weight / 2.0);
                    }
                }
            }
            if best > 0.0 {
                matched += 1;
            }
            if has(fields[0], *term) || synonyms.iter().any(|s| has(fields[0], *s)) {
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
            let hits = entry.title_words.iter().filter(|w| related.contains(WORDS[usize::from(**w)])).count();
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
            .then((json::js_len(x.path) as i64 - json::js_len(y.path) as i64).cmp(&0))
    });
    scored.into_iter().take(limit).map(|(i, _)| &ops[i]).collect()
}

#[cfg(test)]
mod tests {
    use super::super::build_index;
    use super::*;

    const OPEN_API: &str = include_str!("../../../../api-spec.json");
    const BOOKING_ENGINE: &str = include_str!("../../../../booking-engine-api-spec.json");

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
                    assert_eq!(op.description(), spec.get("description").and_then(Json::as_str));
                }
                None => assert_eq!(op.spec(), &Json::Object(json::Map::new())),
            }
        }
    }

    /// The statics `build/main.rs` wrote are what the build-time indexer
    /// computes from the documents now, field by field.
    #[test]
    fn the_generated_index_matches_a_fresh_build() {
        let fresh = build_index::build(OPEN_API, OPEN_API_DOCUMENT, BOOKING_ENGINE, BOOKING_ENGINE_DOCUMENT);
        assert_eq!(fresh.operations.len(), operations().len());
        for (op, built) in operations().iter().zip(&fresh.operations) {
            assert_eq!(op.id, built.id);
            assert_eq!(format!("{:?}", op.api), built.api);
            assert_eq!(op.group, built.group);
            assert_eq!(op.method, built.method);
            assert_eq!(op.path, built.path);
            assert_eq!(op.title, built.title);
            assert_eq!(op.operation_id, built.operation_id.as_deref());
            assert_eq!(op.docs_url, built.docs_url);
            assert_eq!((op.deprecated, op.changes_data), (built.deprecated, built.changes_data));
            assert_eq!(op.description(), built.description.as_deref());
            assert_eq!(op.doc, built.doc);
            assert_eq!(op.span.map(|s| (s.start, s.end)), built.span.map(|s| (s.start, s.end)));
        }
        assert_eq!(WORDS.to_vec(), fresh.vocabulary.iter().map(String::as_str).collect::<Vec<_>>());
        let spelled = |ids: &[u16]| ids.iter().map(|i| WORDS[usize::from(*i)].to_string()).collect::<Vec<_>>();
        for (entry, built) in indexed().iter().zip(&fresh.search) {
            for (field, words) in entry.fields.iter().zip(&built.fields) {
                assert_eq!(&spelled(field), words);
            }
            assert_eq!(spelled(entry.title_words), built.title_words);
        }
        for (doc, built) in DOCS.iter().zip(&fresh.docs) {
            let top: Vec<(&str, usize, usize)> = doc.top.iter().map(|(k, s)| (*k, s.start, s.end)).collect();
            let expected: Vec<(&str, usize, usize)> =
                built.top.iter().map(|(k, s)| (k.as_str(), s.start, s.end)).collect();
            assert_eq!(top, expected);
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
