//! Search words: how the catalog index (built by `build/main.rs`) and a
//! query are split into terms. Shared by the build script, so it uses only std.

pub fn is_stop_word(word: &str) -> bool {
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

pub fn method_words(method: &str) -> &'static str {
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
pub fn synonyms(term: &str) -> &'static [&'static str] {
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
pub fn variant(word: &str) -> Option<&'static str> {
    Some(match word {
        "cancellation" | "canceled" | "cancelled" | "cancelling" | "canceling" => "cancel",
        "msg" | "messaging" => "message",
        "checking" | "checkin" | "checkout" => "check",
        _ => return None,
    })
}

pub fn stem(word: &str) -> String {
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
