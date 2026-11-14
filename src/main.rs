//! `guesty`: the Guesty Open API and Booking Engine API from the command
//! line, and as an MCP server for agents (`guesty mcp`).
//!
//! This is a port of the Node CLI (1.x) with the same commands, options,
//! output and exit codes: 0 on success, 1 on any error. Results go to
//! stdout; everything else goes to stderr. Authentication only reads cached
//! tokens (`auth.rs`); the CLI never requests an OAuth token.

mod auth;
mod cli;
mod client;
mod commands;
mod config;
mod env;
mod error;
mod hooks;
mod http;
mod json;
mod output;
mod prompt;
mod stdin;
mod token_service;
mod update;

use std::io::IsTerminal;

use error::CliError;

fn main() {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    // Agents start the MCP server inside whatever project they're working in,
    // so it must not pick up that project's .env (and, say, its database keys).
    env::load(argv.first().map(String::as_str) == Some("mcp"));

    let program = commands::program();
    let skip_update_check = argv
        .iter()
        .any(|a| ["token", "update", "init", "mcp", "--help", "-h", "--version", "-V"].contains(&a.as_str()));

    let code = match cli::parse(&program, argv) {
        cli::Parsed::Exit(exit) => {
            output::write_out(exit.stdout.as_bytes());
            output::write_err(&exit.stderr);
            exit.code
        }
        cli::Parsed::Failed(e) => report(e),
        cli::Parsed::Run(call) => {
            let action = call.command.action.as_ref().expect("action");
            match action(&call) {
                Ok(()) => {
                    if std::io::stdout().is_terminal() && std::io::stderr().is_terminal() && !skip_update_check {
                        update::check_for_update();
                    }
                    0
                }
                Err(e) => report(e),
            }
        }
    };
    output::flush_out();
    std::process::exit(code);
}

fn report(e: CliError) -> i32 {
    match e {
        CliError::Shown => 1,
        CliError::Exit(code) => code,
        other => {
            output::write_err(&format!("Error: {}\n", output::printable(&other.message())));
            1
        }
    }
}
