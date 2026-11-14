//! Port of src/commands/tasks.ts.

use crate::bail;
use crate::cli::Command;
use crate::client::{Fetch, Params, get, guesty_fetch};
use crate::commands::query_options::{fields, integer, integer_in, json_object};
use crate::commands::reservations::json_body;
use crate::json::{self, Json, Map, json};
use crate::output::print;
use crate::stdin;

pub fn command() -> Command {
    Command::new("tasks")
        .description("Manage tasks")
        .command(
            Command::new("list")
                .description("List tasks")
                .option("--status <status>", "Filter by status")
                .option("--listing <id>", "Unsupported shorthand; use the API's --filters object")
                .option("--filters <json>", "JSON object of task report filters")
                .option_default(
                    "--columns <cols>",
                    "Columns to return (space- or comma-separated)",
                    "id status taskTitle listing assignee scheduledFor",
                )
                .option_default("--limit <n>", "Max results (minimum 25)", "25")
                .option_default("--skip <n>", "Offset", "0")
                .action(|c| {
                    let o = &c.opts;
                    if o.has("listing") {
                        bail!(
                            "Guesty's tasks API does not document a --listing shorthand. Use --filters with the task report's filter fields instead."
                        );
                    }
                    let mut params = Params::new();
                    params.set("columns", fields(o.str("columns").unwrap_or(""))?);
                    params.set("limit", integer_in(o.str("limit").unwrap_or(""), "--limit", 25.0, 9_007_199_254_740_991.0)?);
                    params.set("skip", integer(o.str("skip").unwrap_or(""), "--skip")?);
                    let mut filters = match o.str("filters").filter(|s| !s.is_empty()) {
                        Some(f) => json_object(f, "--filters")?,
                        None => Map::new(),
                    };
                    if let Some(status) = o.str("status").filter(|s| !s.is_empty()) {
                        filters.insert("status".into(), json!({ "@in": [status] }));
                    }
                    if !filters.is_empty() {
                        params.set("filters", json::compact(&Json::Object(filters)));
                    }
                    print(&get("/v1/tasks-open-api/tasks", params)?);
                    Ok(())
                }),
        )
        .command(Command::new("get <id>").description("Get a single task").action(|c| {
            print(&guesty_fetch(&format!("/v1/tasks-open-api/{}", c.arg(0)), Fetch::default())?);
            Ok(())
        }))
        .command(
            Command::new("create")
                .description("Create a task (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    print(&guesty_fetch("/v1/tasks-open-api/create-single-task", Fetch { method: "POST".into(), body: Some(json_body(body)), ..Fetch::default() })?);
                    Ok(())
                }),
        )
        .command(
            Command::new("update <id>")
                .description("Update a task (--data or stdin)")
                .option("--data <json>", "JSON body")
                .action(|c| {
                    let body = stdin::data_or_stdin(c.opts.str("data"))?;
                    print(&guesty_fetch(&format!("/v1/tasks-open-api/{}", c.arg(0)), Fetch { method: "PUT".into(), body: Some(json_body(body)), ..Fetch::default() })?);
                    Ok(())
                }),
        )
        .command(Command::new("delete <id>").description("Delete a task").action(|c| {
            print(&guesty_fetch(&format!("/v1/tasks-open-api/{}", c.arg(0)), Fetch::method("DELETE"))?);
            Ok(())
        }))
}
