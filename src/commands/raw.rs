use crate::cli::{Command, Opt, Value};
use crate::client::{Body, Fetch, Params, ResponseType, guesty_fetch};
use crate::error::{CliError, Result};
use crate::json::{self, Json};
use crate::output::{Data, print, print_json, write_err};
use crate::stdin;

fn collect_headers(value: &str, previous: Option<&Value>) -> Result<Value> {
    let mut items = match previous {
        Some(Value::List(items)) => items.clone(),
        _ => Vec::new(),
    };
    items.push(value.to_string());
    Ok(Value::List(items))
}

/// `Name: value` headers, lowercased, the last of a repeated name winning.
fn parse_headers(values: &[String]) -> Result<Vec<(String, String)>> {
    let mut headers: Vec<(String, String)> = Vec::new();
    for header in values {
        let Some(separator) = header.find(':') else {
            return Err(CliError::new("Invalid header. Use 'Name: value'."));
        };
        let key = crate::commands::query_options::js_trim(&header[..separator]);
        let value = crate::commands::query_options::js_trim(&header[separator + 1..]);
        if key.is_empty() {
            return Err(CliError::new("Invalid header. Header name is required."));
        }
        let key = key.to_lowercase();
        match headers.iter_mut().find(|(k, _)| *k == key) {
            Some(entry) => entry.1 = value.to_string(),
            None => headers.push((key, value.to_string())),
        }
    }
    Ok(headers)
}

fn parse_json(value: &str, option: &str) -> Result<Json> {
    json::parse(value).map_err(|_| CliError::new(format!("{option} must be valid JSON.")))
}

fn set_header(headers: &mut Vec<(String, String)>, name: &str, value: &str) {
    match headers.iter_mut().find(|(k, _)| k == name) {
        Some(entry) => entry.1 = value.to_string(),
        None => headers.push((name.to_string(), value.to_string())),
    }
}

pub fn command() -> Command {
    Command::new("raw")
        .description("Make a raw Guesty Open API resource request, including text, CSV, and binary payloads. OAuth endpoints are disabled.")
        .argument("<method>", "HTTP method (GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS)")
        .argument("<path>", "API path (e.g. /v1/listings)")
        .option("--data <json>", "JSON request body")
        .option("--text <text>", "Plain-text request body")
        .option("--data-file <path>", "Read the request body from a file")
        .option("--stdin", "Read the request body from stdin as text")
        .option("--params <json>", "Query params as JSON")
        .option("--content-type <type>", "Request Content-Type header")
        .option("--accept <type>", "Request Accept header")
        .option_parsed("-H, --header <header>", "Additional header in 'Name: value' format", collect_headers, Some(Value::List(Vec::new())))
        .add_option(Opt::new("--response <mode>", "Response mode").choices(&["auto", "json", "text", "buffer"]).default("auto"))
        .option_default("--timeout <seconds>", "Per-request timeout in seconds", "60")
        .option("--output <path>", "Write the response body to a file")
        .input("dataOption")
        .input("textOption")
        .input("dataFileOption")
        .input("stdinFlag")
        .input("readsTextFromStdin")
        .input("writesToOutputFile")
        .action(|c| {
            let o = &c.opts;
            let given = ["data", "text", "dataFile", "stdin"].iter().filter(|k| o.has(k)).count();
            if given > 1 {
                return Err(CliError::new("Use only one body input: --data, --text, --data-file, or --stdin."));
            }
            let timeout = o.str("timeout").unwrap_or("60");
            let shaped = match timeout.split_once('.') {
                Some((i, f)) => !i.is_empty() && !f.is_empty() && i.bytes().chain(f.bytes()).all(|b| b.is_ascii_digit()),
                None => !timeout.is_empty() && timeout.bytes().all(|b| b.is_ascii_digit()),
            };
            let timeout_ms = timeout.parse::<f64>().unwrap_or(f64::NAN) * 1000.0;
            if !shaped || !(timeout_ms.fract() == 0.0 && timeout_ms.abs() <= 9_007_199_254_740_991.0) || timeout_ms <= 0.0 || timeout_ms > 2_147_483_647.0 {
                return Err(CliError::new("--timeout must be a positive number of seconds, at most 2147483.647."));
            }
            let body = if let Some(data) = o.str("data") {
                // JSON primitives, including strings and null, must retain JSON encoding.
                Some(Body::Text(json::compact(&parse_json(data, "--data")?)))
            } else if let Some(text) = o.str("text") {
                Some(Body::Text(text.to_string()))
            } else if let Some(file) = o.str("dataFile") {
                Some(Body::Bytes(std::fs::read(file).map_err(|e| CliError::new(node_fs_error(&e, "read", file)))?))
            } else if o.flag("stdin") {
                Some(Body::Text(stdin::read()?))
            } else {
                None
            };
            let params = match o.str("params") {
                Some(p) => Some(Params::from_json(&parse_json(p, "--params")?)?),
                None => None,
            };
            let mut headers = parse_headers(o.list("header"))?;
            if o.has("data") && !headers.iter().any(|(k, _)| k == "content-type") {
                set_header(&mut headers, "content-type", "application/json");
            }
            if let Some(ct) = o.str("contentType").filter(|s| !s.is_empty()) {
                set_header(&mut headers, "content-type", ct);
            }
            if let Some(accept) = o.str("accept").filter(|s| !s.is_empty()) {
                set_header(&mut headers, "accept", accept);
            }
            let response = o.str("response").unwrap_or("auto");
            let response_type = match response {
                "json" => ResponseType::Json,
                "text" => ResponseType::Text,
                "buffer" => ResponseType::Buffer,
                _ => ResponseType::Auto,
            };
            let data = guesty_fetch(
                c.arg(1),
                Fetch {
                    method: c.arg(0).to_uppercase(),
                    body,
                    params,
                    headers,
                    response_type,
                    timeout_ms: timeout_ms as u64,
                },
            )?;

            if let Some(output) = o.str("output").filter(|s| !s.is_empty()) {
                let bytes: Vec<u8> = match &data {
                    Data::None => Vec::new(),
                    _ if response == "json" => format!("{}\n", json::pretty(&data.clone().into_json(), 2)).into_bytes(),
                    Data::Text(t) => t.clone().into_bytes(),
                    Data::Bytes(b) => b.clone(),
                    Data::Json(j) => format!("{}\n", json::pretty(j, 2)).into_bytes(),
                };
                std::fs::write(output, bytes).map_err(|e| CliError::new(node_fs_error(&e, "open", output)))?;
                write_err(&format!("Saved response to {output}\n"));
                return Ok(());
            }
            if response == "json" {
                print_json(&data.into_json());
            } else {
                print(&data);
            }
            Ok(())
        })
}

/// Node's message for a failed file operation, e.g.
/// `ENOENT: no such file or directory, open 'x'`.
pub fn node_fs_error(e: &std::io::Error, syscall: &str, path: &str) -> String {
    let (code, text) = match e.kind() {
        std::io::ErrorKind::NotFound => ("ENOENT", "no such file or directory"),
        std::io::ErrorKind::PermissionDenied => ("EACCES", "permission denied"),
        std::io::ErrorKind::IsADirectory => ("EISDIR", "illegal operation on a directory"),
        std::io::ErrorKind::AlreadyExists => ("EEXIST", "file already exists"),
        std::io::ErrorKind::NotADirectory => ("ENOTDIR", "not a directory"),
        _ => return format!("{e}, {syscall} '{path}'"),
    };
    // `syscall` "read" means readFileSync: its open succeeds on a directory and
    // the read fails, so Node names no path. Everything else failed at open.
    if code == "EISDIR" && syscall == "read" {
        return format!("{code}: {text}, read");
    }
    format!("{code}: {text}, open '{path}'")
}
