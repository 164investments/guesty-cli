//! `guesty mcp`: a Model Context Protocol server over stdio, newline-delimited
//! JSON-RPC 2.0 (port of PR #18's `src/mcp/server.ts`). It offers tools only,
//! so it needs no SDK. The protocol and the tools are the shared core's
//! (`guesty_core::mcp`); this file is the stdio transport and the `Backend`
//! that sends the tools' requests with the CLI's client.
//!
//! Each message is handled on its own: tool calls that may reach Guesty or
//! the token service run on their own threads, so a slow request doesn't hold
//! up the rest. Stdout carries only protocol messages, one whole line each.
//! At the end of input the server waits for pending calls, then exits.

pub mod install;

use std::future::Future;
use std::io::{BufRead, Write};
use std::sync::Arc;
use std::task::{Context, Poll, Waker};

use guesty_core::mcp::{Backend, Call, LOCAL_NOT_CONNECTED, Server, Work, js};
use guesty_core::request::{BookingFetch, Fetch};

use crate::client;
use crate::error::{CliError, Result};
use crate::json::Json;
use crate::output::{Data, write_err};
use crate::token_service;

#[derive(Clone, Copy)]
pub struct Options {
    pub read_only: bool,
}

/// The tools' I/O through the CLI's synchronous client, so every request,
/// retry and message is the CLI's own. No limits apply locally.
struct Local;

fn core_error(e: CliError) -> guesty_core::Error {
    guesty_core::Error::new(e.message())
}

impl Backend for Local {
    async fn open_api(&self, path: &str, fetch: Fetch, _call: &Call) -> guesty_core::Result<Data> {
        client::guesty_fetch(path, fetch).map_err(core_error)
    }

    async fn booking_engine(&self, path: &str, fetch: BookingFetch, _call: &Call) -> guesty_core::Result<Data> {
        client::booking_engine_fetch(path, fetch).map_err(core_error)
    }

    fn team_service(&self) -> guesty_core::Result<String> {
        match token_service::configured_service().map_err(core_error)? {
            Some(service) => Ok(service.url),
            None => Err(guesty_core::Error::new(LOCAL_NOT_CONNECTED)),
        }
    }

    async fn team_request(
        &self,
        method: &str,
        path: &str,
        body: Option<&Json>,
        _call: &Call,
    ) -> guesty_core::Result<Json> {
        let service = token_service::configured_service()
            .map_err(core_error)?
            .ok_or_else(|| guesty_core::Error::new(LOCAL_NOT_CONNECTED))?;
        token_service::call(&service.url, method, path, Some(&service.key), body, None)
            .map_err(|e| core_error(e.into()))
    }

    fn now_ms(&self) -> f64 {
        crate::hooks::now_ms()
    }
}

/// Runs a future to completion on this thread. `Local`'s futures never wait
/// (its requests block instead), so this only polls; it parks between polls
/// in case a future ever does.
fn block_on<F: Future>(future: F) -> F::Output {
    struct Unpark(std::thread::Thread);
    impl std::task::Wake for Unpark {
        fn wake(self: Arc<Self>) {
            self.0.unpark();
        }
    }
    let waker = Waker::from(Arc::new(Unpark(std::thread::current())));
    let mut context = Context::from_waker(&waker);
    let mut future = std::pin::pin!(future);
    loop {
        if let Poll::Ready(output) = future.as_mut().poll(&mut context) {
            return output;
        }
        std::thread::park();
    }
}

fn send(line: &str) {
    let mut out = std::io::stdout().lock();
    let _ = out.write_all(format!("{line}\n").as_bytes()).and_then(|()| out.flush());
}

/// The lines `readline` gives: split at \n, \r\n, \r, U+2028 and U+2029.
fn lines_of(chunk: &[u8]) -> Vec<String> {
    let mut content = chunk.strip_suffix(b"\n").unwrap_or(chunk);
    content = content.strip_suffix(b"\r").unwrap_or(content);
    String::from_utf8_lossy(content).split(['\r', '\u{2028}', '\u{2029}']).map(str::to_string).collect()
}

pub fn serve(options: Options) -> Result<()> {
    let server =
        Arc::new(Server::new(Local, guesty_core::mcp::Options::local(options.read_only, env!("CARGO_PKG_VERSION"))));
    let stdin = std::io::stdin();
    let mut input = stdin.lock();
    let mut pending: Vec<std::thread::JoinHandle<()>> = Vec::new();
    let mut chunk = Vec::new();
    loop {
        chunk.clear();
        match input.read_until(b'\n', &mut chunk) {
            Ok(0) | Err(_) => break,
            Ok(_) => {}
        }
        for line in lines_of(&chunk) {
            if js::trim(&line).is_empty() {
                continue;
            }
            let message = match server.parse(&line) {
                Ok(message) => message,
                Err(reply) => {
                    send(&reply);
                    continue;
                }
            };
            match server.dispatch(&message) {
                Work::Reply(line) => send(&line),
                Work::Call { id, name, args } => {
                    pending.retain(|h| !h.is_finished());
                    let server = Arc::clone(&server);
                    pending.push(std::thread::spawn(move || send(&block_on(server.run_call(&id, &name, &args)))));
                }
                Work::None => {}
            }
        }
    }
    for handle in pending {
        if handle.join().is_err() {
            write_err("Guesty MCP error: a tool call stopped unexpectedly.\n");
        }
    }
    Ok(())
}
