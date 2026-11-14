//! Port of PR #18's `src/commands/mcp.ts`: `guesty mcp` runs the MCP server
//! and `guesty mcp install` adds it to AI apps.

use crate::cli::{Call, Command};
use crate::error::{CliError, Result};
use crate::json::{Json, json};
use crate::mcp::install::{self, CLIENTS, Client, SERVER_NAME, client_values};
use crate::mcp::{Options, serve};
use crate::output::print_value;
use crate::prompt::{self, Choice};
use crate::token_service;

pub fn command() -> Command {
    Command::new("mcp")
        .description("Run an MCP server so AI agents (Claude, Codex, Cursor) can search and call every Guesty operation with your team's shared token")
        .option("--read-only", "Refuse every operation that changes data (also GUESTY_MCP_READ_ONLY=1)")
        .action(|c| {
            let read_only = c.opts.bool("readOnly") == Some(true)
                || std::env::var("GUESTY_MCP_READ_ONLY").as_deref() == Ok("1");
            serve(Options { read_only })
        })
        .command(
            Command::new("install")
                .description("Add the Guesty MCP server to Claude Code, Codex, Cursor or Claude Desktop on this computer")
                .option("--client <apps>", &format!("Apps to add it to, separated by commas: {}", client_values()))
                .option("--all", "Add it to every supported app found on this computer")
                .option("--read-only", "Install it so it refuses every operation that changes data")
                .option("--print", "Print the server settings to add by hand, and change nothing")
                .action(install_action),
        )
}

/// `install.parent.opts().readOnly`. Commander gives a parent's options to the
/// parent wherever they appear, so "guesty mcp install --read-only" sets the
/// mcp command's --read-only. The parser hands an action only its own
/// command's options, so this reads the argument list the same way.
fn parent_read_only() -> bool {
    std::env::args().skip(1).take_while(|a| a != "--").any(|a| a == "--read-only")
}

fn install_action(c: &Call) -> Result<()> {
    // "guesty mcp install --read-only" can land on either command, since both have the option.
    let read_only = c.opts.bool("readOnly") == Some(true) || parent_read_only();
    let launch = install::launch_command(read_only)?;
    if c.opts.flag("print") {
        let mut servers = crate::json::Map::new();
        servers.insert(SERVER_NAME.into(), launch.to_json());
        print_value(&json!({ "mcpServers": Json::Object(servers) }));
        return Ok(());
    }
    let found = install::detect_clients();
    let mut clients: Vec<Client> = if let Some(apps) = c.opts.str("client").filter(|a| !a.is_empty()) {
        install::parse_clients(apps)?
    } else if c.opts.flag("all") {
        if found.is_empty() {
            return Err(CliError::new(format!(
                "No supported app was found. Use --client with {}, or --print.",
                client_values()
            )));
        }
        found.clone()
    } else if prompt::interactive() {
        Vec::new()
    } else {
        let listed = if found.is_empty() {
            String::new()
        } else {
            format!(" Found on this computer: {}.", found.iter().map(|c| c.value()).collect::<Vec<_>>().join(", "))
        };
        return Err(CliError::new(format!(
            "Choose where to add it with --client ({}) or --all.{listed}",
            client_values()
        )));
    };
    let mut failed = 0usize;
    prompt::frame("Add Guesty to your AI apps", || {
        if clients.is_empty() {
            let options: Vec<Choice> = CLIENTS
                .iter()
                .map(|(client, value, label, hint)| {
                    Choice::new(value, label, Some(if found.contains(client) { "found" } else { hint }))
                })
                .collect();
            let initial: Vec<String> = found.iter().map(|c| c.value().to_string()).collect();
            let chosen = prompt::choose_many("Which apps should get the Guesty tools?", &options, &initial)?;
            clients = chosen.iter().filter_map(|v| Client::from_value(v)).collect();
        }
        for client in &clients {
            let result = install::install_client(*client, &launch);
            if result.ok {
                prompt::success(&result.message);
            } else {
                failed += 1;
                prompt::warn(&format!("{}: {}", client.label(), result.message));
            }
        }
        let supabase = std::env::var("SUPABASE_URL").is_ok_and(|v| !v.is_empty());
        if token_service::configured_service()?.is_none() && !supabase {
            prompt::warn(&format!(
                "This CLI isn't connected to a team yet, so the tools can't reach Guesty. Run {}, or {}, first.",
                prompt::command("guesty setup"),
                prompt::command("guesty join <invite link>")
            ));
        }
        if read_only {
            prompt::info("Installed read-only: the tools refuse every operation that changes data.");
        }
        prompt::done(if failed == clients.len() {
            "Nothing was added."
        } else {
            "Ask your agent something like: \"Using Guesty, which reservations check in this week?\""
        });
        Ok(())
    })?;
    if failed > 0 {
        return Err(CliError::Exit(1));
    }
    Ok(())
}
