//! Port of src/commands/conversations.ts.

use crate::bail;
use crate::cli::Command;
use crate::client::{Fetch, Params, get, guesty_fetch};
use crate::commands::query_options::{collect, empty_list, fields, integer_in, json_array};
use crate::json::{self, Json, Map, json};
use crate::output::print;

pub fn command() -> Command {
    Command::new("conversations")
        .alias("conv")
        .description("Manage conversations/messaging")
        .command(
            Command::new("list")
                .description("List conversations")
                .option("--reservation <id>", "Filter by reservation ID")
                .option("--filters <json>", "JSON array of conversation filters")
                .option("--fields <fields>", "Fields to return (space- or comma-separated)")
                .option("--sort <field>", "Sort field, prefix with - for descending")
                .option_default("--limit <n>", "Max results", "25")
                .option("--cursor-after <cursor>", "Pagination cursor (forward)")
                .option("--cursor-before <cursor>", "Pagination cursor (backward)")
                .action(|c| {
                    let o = &c.opts;
                    let truthy = |k: &str| o.str(k).filter(|s| !s.is_empty());
                    let mut params = Params::new();
                    params.set("limit", integer_in(o.str("limit").unwrap_or(""), "--limit", 1.0, 100.0)?);
                    if truthy("cursorAfter").is_some() && truthy("cursorBefore").is_some() {
                        bail!("Use only one of --cursor-after and --cursor-before.");
                    }
                    if let Some(v) = truthy("cursorAfter") {
                        params.set("cursorAfter", v);
                    }
                    if let Some(v) = truthy("cursorBefore") {
                        params.set("cursorBefore", v);
                    }
                    if let Some(f) = truthy("fields") {
                        let mut selected: Vec<String> = fields(f)?.split(' ').map(str::to_string).collect();
                        // Guesty cannot build pagination cursors when the projected response omits its sort field.
                        if let Some(sort) = truthy("sort") {
                            for field in fields(sort)?.split(' ') {
                                let field = field.strip_prefix(['+', '-']).unwrap_or(field);
                                selected.push(field.to_string());
                            }
                        }
                        let mut unique: Vec<String> = Vec::new();
                        for field in selected {
                            if !unique.contains(&field) {
                                unique.push(field);
                            }
                        }
                        params.set("fields", unique.join(" "));
                    }
                    if let Some(sort) = truthy("sort") {
                        params.set("sort", sort);
                    }
                    let mut filters = match truthy("filters") {
                        Some(f) => json_array(f, "--filters")?,
                        None => Vec::new(),
                    };
                    if let Some(id) = truthy("reservation") {
                        filters.push(json!({ "field": "reservation._id", "operator": "$eq", "value": id }));
                    }
                    if !filters.is_empty() {
                        params.set("filters", json::compact(&Json::Array(filters)));
                    }
                    print(&get("/v1/communication/conversations", params)?);
                    Ok(())
                }),
        )
        .command(
            Command::new("get <id>")
                .description("Get a conversation by ID")
                .option("--fields <fields>", "Fields to return (space- or comma-separated)")
                .action(|c| {
                    let params = match c.opts.str("fields").filter(|s| !s.is_empty()) {
                        Some(f) => {
                            let mut p = Params::new();
                            p.set("fields", fields(f)?);
                            Some(p)
                        }
                        None => None,
                    };
                    let path = format!("/v1/communication/conversations/{}", c.arg(0));
                    print(&guesty_fetch(&path, Fetch { params, ..Fetch::default() })?);
                    Ok(())
                }),
        )
        .command(
            Command::new("posts <id>")
                .description("Get posts for a conversation")
                .option("--sort <field>", "Sort field, prefix with - for descending")
                .option("--cursor-after <cursor>", "Pagination cursor (forward)")
                .option("--cursor-before <cursor>", "Pagination cursor (backward)")
                .action(|c| {
                    let o = &c.opts;
                    let truthy = |k: &str| o.str(k).filter(|s| !s.is_empty());
                    if truthy("cursorAfter").is_some() && truthy("cursorBefore").is_some() {
                        bail!("Use only one of --cursor-after and --cursor-before.");
                    }
                    let mut params = Params::new();
                    for key in ["sort", "cursorAfter", "cursorBefore"] {
                        if let Some(v) = truthy(key) {
                            params.set(key, v);
                        }
                    }
                    print(&get(&format!("/v1/communication/conversations/{}/posts", c.arg(0)), params)?);
                    Ok(())
                }),
        )
        .command(
            Command::new("post <conversationId>")
                .description("Create a post in a conversation without sending it")
                .required_option("--module <type>", "Message module (sms, email, note, log, whatsapp, airbnb2)")
                .required_option("--body <text>", "Message body")
                .option("--sent-by <sender>", "Sender: host or guest")
                .action(|c| {
                    let sent_by = c.opts.str("sentBy").filter(|s| !s.is_empty());
                    if sent_by.is_some_and(|s| s != "host" && s != "guest") {
                        bail!("--sent-by must be host or guest.");
                    }
                    let mut body = Map::new();
                    body.insert("body".into(), opt_json(c.opts.str("body")));
                    body.insert("module".into(), json!({ "type": opt_json(c.opts.str("module")) }));
                    if let Some(s) = sent_by {
                        body.insert("sentBy".into(), Json::String(s.into()));
                    }
                    let path = format!("/v1/communication/conversations/{}/posts", c.arg(0));
                    print(&guesty_fetch(&path, Fetch::json("POST", Json::Object(body)))?);
                    Ok(())
                }),
        )
        .command(
            Command::new("send <conversationId>")
                .description("Send a message in a conversation")
                .required_option("--module <type>", "Message module (sms, email, note, log, whatsapp, airbnb2)")
                .required_option("--body <text>", "Message body")
                .option_parsed("--to <recipient>", "Recipient (repeat for multiple)", collect, empty_list())
                .option_parsed("--cc <recipient>", "CC recipient (repeat for multiple)", collect, empty_list())
                .option_parsed("--bcc <recipient>", "BCC recipient (repeat for multiple)", collect, empty_list())
                .action(|c| {
                    let mut module = Map::new();
                    module.insert("type".into(), opt_json(c.opts.str("module")));
                    for key in ["to", "cc", "bcc"] {
                        let values = c.opts.list(key);
                        if !values.is_empty() {
                            module.insert(key.into(), json!(values));
                        }
                    }
                    let body = json!({ "body": opt_json(c.opts.str("body")), "module": module });
                    let path = format!("/v1/communication/conversations/{}/send-message", c.arg(0));
                    print(&guesty_fetch(&path, Fetch::json("POST", body))?);
                    Ok(())
                }),
        )
}

/// A required option's string (always given; mandatory options can't be undefined).
fn opt_json(value: Option<&str>) -> Json {
    value.map(|s| Json::String(s.into())).unwrap_or(Json::Null)
}
