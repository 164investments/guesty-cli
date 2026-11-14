//! The clock, sleeping, terminals, and where requests go. Release builds use
//! the real clock, terminals and network. Builds with the `test-hooks`
//! feature (tests only) read:
//!
//! - `GUESTY_TEST_REDIRECT=http://127.0.0.1:PORT`: every request goes to this
//!   local mock instead, with the original origin in `x-guesty-test-origin`.
//! - `GUESTY_TEST_NOW=<ms>`: the clock starts here.
//! - `GUESTY_TEST_FAST_SLEEP=1`: sleeps return at once and advance the clock.
//! - `GUESTY_TEST_TRACE=<file>`: sleeps, requests, request timeouts and
//!   private-cache reads are appended to this file as JSON lines
//!   (`{"kind", "value", "at"}`, where `at` is the clock).
//! - `GUESTY_TEST_TTY=stdin,stdout,stderr` (or `1` for all three): these
//!   streams count as terminals.
//! - `GUESTY_TEST_VERSION=<semver>`: the version the update check compares.

use crate::json::Json;

/// setTimeout's limit; the Node CLI slept longer waits in pieces this long.
const MAX_SLEEP_MS: u64 = 2_147_483_647;

/// Which standard stream `is_terminal` asks about.
#[allow(dead_code)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Stream {
    Stdin,
    Stdout,
    Stderr,
}

#[cfg(not(feature = "test-hooks"))]
mod imp {
    use super::{Json, Stream};

    pub fn now_ms() -> f64 {
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as f64).unwrap_or(0.0)
    }

    pub(super) fn sleep_chunk(ms: u64) {
        std::thread::sleep(std::time::Duration::from_millis(ms));
    }

    pub fn redirect(url: &str) -> (String, Option<String>) {
        (url.to_string(), None)
    }

    pub fn trace(_kind: &str, _value: Json) {}

    #[allow(dead_code)]
    pub fn enabled() -> bool {
        false
    }

    #[allow(dead_code)]
    pub fn is_terminal(stream: Stream) -> bool {
        super::real_is_terminal(stream)
    }

    #[allow(dead_code)]
    pub fn version() -> String {
        env!("CARGO_PKG_VERSION").to_string()
    }
}

#[cfg(feature = "test-hooks")]
mod imp {
    use super::{Json, Stream};
    use std::io::Write;
    use std::sync::Mutex;

    static CLOCK: Mutex<Option<f64>> = Mutex::new(None);

    fn real_now() -> f64 {
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis() as f64).unwrap_or(0.0)
    }

    pub fn now_ms() -> f64 {
        let mut clock = CLOCK.lock().unwrap_or_else(|e| e.into_inner());
        if clock.is_none() {
            *clock = Some(std::env::var("GUESTY_TEST_NOW").ok().and_then(|v| v.parse().ok()).unwrap_or_else(real_now));
        }
        if std::env::var_os("GUESTY_TEST_NOW").is_none() {
            return real_now();
        }
        clock.unwrap_or(0.0)
    }

    pub(super) fn sleep_chunk(ms: u64) {
        trace("wait", Json::from(ms));
        if std::env::var("GUESTY_TEST_FAST_SLEEP").as_deref() == Ok("1") {
            let now = now_ms();
            *CLOCK.lock().unwrap_or_else(|e| e.into_inner()) = Some(now + ms as f64);
            return;
        }
        std::thread::sleep(std::time::Duration::from_millis(ms));
    }

    /// Unit tests share one process: start the clock again from `GUESTY_TEST_NOW`.
    #[cfg(test)]
    pub fn reset_clock() {
        *CLOCK.lock().unwrap_or_else(|e| e.into_inner()) = None;
    }

    pub fn redirect(url: &str) -> (String, Option<String>) {
        trace("request", Json::from(url));
        let Ok(target) = std::env::var("GUESTY_TEST_REDIRECT") else {
            return (url.to_string(), None);
        };
        // scheme://host[:port]/path?query → target/path?query
        let after_scheme = url.find("://").map(|i| i + 3).unwrap_or(0);
        let path_start = url[after_scheme..].find('/').map(|i| i + after_scheme).unwrap_or(url.len());
        let origin = url[..path_start].to_string();
        let rest = if path_start < url.len() { &url[path_start..] } else { "/" };
        (format!("{}{}", target.trim_end_matches('/'), rest), Some(origin))
    }

    pub fn trace(kind: &str, value: Json) {
        let Some(path) = std::env::var_os("GUESTY_TEST_TRACE") else { return };
        let at = crate::json::number(now_ms());
        let line = crate::json::compact(&crate::json::json!({ "kind": kind, "value": value, "at": at }));
        // One write per line, so lines from parallel MCP calls never interleave.
        if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
            let _ = file.write_all(format!("{line}\n").as_bytes());
        }
    }

    #[allow(dead_code)]
    pub fn enabled() -> bool {
        true
    }

    #[allow(dead_code)]
    pub fn is_terminal(stream: Stream) -> bool {
        let Ok(value) = std::env::var("GUESTY_TEST_TTY") else { return super::real_is_terminal(stream) };
        let name = match stream {
            Stream::Stdin => "stdin",
            Stream::Stdout => "stdout",
            Stream::Stderr => "stderr",
        };
        value == "1" || value.split(',').any(|v| v.trim() == name)
    }

    #[allow(dead_code)]
    pub fn version() -> String {
        std::env::var("GUESTY_TEST_VERSION")
            .ok()
            .filter(|v| !v.is_empty())
            .unwrap_or_else(|| env!("CARGO_PKG_VERSION").to_string())
    }
}

pub use imp::*;

#[allow(dead_code)]
fn real_is_terminal(stream: Stream) -> bool {
    use std::io::IsTerminal;
    match stream {
        Stream::Stdin => std::io::stdin().is_terminal(),
        Stream::Stdout => std::io::stdout().is_terminal(),
        Stream::Stderr => std::io::stderr().is_terminal(),
    }
}

/// Sleeps `ms`, in pieces no longer than setTimeout allowed, as the Node CLI did.
pub fn sleep_ms(ms: u64) {
    let mut remaining = ms;
    while remaining > 0 {
        let piece = remaining.min(MAX_SLEEP_MS);
        imp::sleep_chunk(piece);
        remaining -= piece;
    }
}

/// In-process fixtures for unit tests: a local HTTP mock that every request
/// is redirected to, a fresh HOME, the fixed clock, fast sleeps, and the
/// trace. Tests that use it hold one global lock, because the environment,
/// the clock and the caches are process-wide.
#[cfg(all(test, feature = "test-hooks"))]
#[allow(dead_code)]
pub mod testing {
    use std::io::{BufRead, BufReader, Read, Write};
    use std::net::{Shutdown, TcpListener, TcpStream};
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::{Arc, Mutex, MutexGuard};
    use std::time::Duration;

    use crate::json::{self, Json};

    pub const NOW: f64 = 1_800_000_000_000.0;

    /// A request the mock received, with the URL the CLI meant to reach.
    #[derive(Clone, Debug)]
    pub struct Recorded {
        pub method: String,
        pub url: url::Url,
        /// Lowercase names, in the order received.
        pub headers: Vec<(String, String)>,
        pub body: Vec<u8>,
        /// The CLI's clock when the request arrived.
        pub at: f64,
    }

    impl Recorded {
        pub fn header(&self, name: &str) -> Option<&str> {
            self.headers.iter().find(|(k, _)| k == name).map(|(_, v)| v.as_str())
        }
        pub fn host(&self) -> &str {
            self.url.host_str().unwrap_or("")
        }
        pub fn query(&self) -> Vec<(String, String)> {
            self.url.query_pairs().map(|(k, v)| (k.into_owned(), v.into_owned())).collect()
        }
        pub fn param(&self, name: &str) -> Option<String> {
            self.url.query_pairs().find(|(k, _)| k == name).map(|(_, v)| v.into_owned())
        }
        pub fn text(&self) -> String {
            String::from_utf8_lossy(&self.body).into_owned()
        }
    }

    /// How the mock answers one request.
    #[derive(Clone, Debug)]
    pub enum Reply {
        /// A status, extra headers and a body (content-type application/json unless given).
        Send { status: u16, headers: Vec<(String, String)>, body: Vec<u8> },
        /// Closes the connection without answering: a network error.
        Drop,
        /// Never answers, so the CLI's timeout fires.
        Hang,
        /// Sends the status and headers, then fails partway through the body.
        BodyFails,
    }

    impl Reply {
        pub fn json(status: u16, value: Json) -> Reply {
            Reply::Send { status, headers: Vec::new(), body: json::compact(&value).into_bytes() }
        }
        pub fn ok(value: Json) -> Reply {
            Reply::json(200, value)
        }
        pub fn raw(status: u16, body: &str) -> Reply {
            Reply::Send { status, headers: Vec::new(), body: body.as_bytes().to_vec() }
        }
        pub fn status(status: u16) -> Reply {
            Reply::Send { status, headers: Vec::new(), body: b"{}".to_vec() }
        }
        pub fn header(mut self, name: &str, value: &str) -> Reply {
            if let Reply::Send { headers, .. } = &mut self {
                headers.push((name.to_ascii_lowercase(), value.to_string()));
            }
            self
        }
    }

    type Handler = Box<dyn FnMut(&Recorded) -> Reply + Send>;

    static LOCK: Mutex<()> = Mutex::new(());
    static COUNTER: AtomicUsize = AtomicUsize::new(0);

    /// One test's fixtures. Dropping it stops the mock and removes HOME.
    pub struct Session {
        _lock: MutexGuard<'static, ()>,
        pub root: PathBuf,
        pub home: PathBuf,
        pub trace_path: PathBuf,
        requests: Arc<Mutex<Vec<Recorded>>>,
        handler: Arc<Mutex<Handler>>,
        stop: Arc<std::sync::atomic::AtomicBool>,
        address: String,
    }

    fn set(name: &str, value: impl AsRef<std::ffi::OsStr>) {
        // SAFETY: every test that changes the environment holds LOCK.
        unsafe { std::env::set_var(name, value) }
    }

    fn unset(name: &str) {
        // SAFETY: as above.
        unsafe { std::env::remove_var(name) }
    }

    impl Session {
        /// Every request gets `{"ok": true}` until `answer` is called.
        pub fn new() -> Session {
            let lock = LOCK.lock().unwrap_or_else(|e| e.into_inner());
            let root = std::env::temp_dir().join(format!(
                "guesty-unit-{}-{}",
                std::process::id(),
                COUNTER.fetch_add(1, Ordering::SeqCst)
            ));
            let _ = std::fs::remove_dir_all(&root);
            let home = root.join("home");
            std::fs::create_dir_all(home.join(".guesty-cli")).expect("temporary HOME");
            let trace_path = root.join("trace.jsonl");
            let listener = TcpListener::bind("127.0.0.1:0").expect("mock listener");
            listener.set_nonblocking(true).expect("nonblocking listener");
            let address = format!("http://{}", listener.local_addr().expect("mock address"));
            let requests: Arc<Mutex<Vec<Recorded>>> = Arc::default();
            let handler: Arc<Mutex<Handler>> =
                Arc::new(Mutex::new(Box::new(|_| Reply::ok(json::json!({ "ok": true })))));
            let stop = Arc::new(std::sync::atomic::AtomicBool::new(false));
            {
                let (requests, handler, stop) = (requests.clone(), handler.clone(), stop.clone());
                std::thread::spawn(move || serve(listener, requests, handler, stop));
            }
            for name in [
                "SUPABASE_URL",
                "SUPABASE_SERVICE_ROLE_KEY",
                "GUESTY_TOKEN_SERVICE_URL",
                "GUESTY_TOKEN_SERVICE_KEY",
                "GUESTY_CLIENT_ID",
                "GUESTY_CLIENT_SECRET",
                "GUESTY_TEST_TTY",
            ] {
                unset(name);
            }
            set("HOME", &home);
            set("GUESTY_TEST_REDIRECT", &address);
            set("GUESTY_TEST_NOW", json::number_to_string(NOW, false));
            set("GUESTY_TEST_FAST_SLEEP", "1");
            set("GUESTY_TEST_TRACE", &trace_path);
            super::reset_clock();
            crate::auth::reset_for_tests();
            crate::client::reset_rate_limits_for_tests();
            Session { _lock: lock, root, home, trace_path, requests, handler, stop, address }
        }

        pub fn env(&self, name: &str, value: Option<&str>) -> &Session {
            match value {
                Some(v) => set(name, v),
                None => unset(name),
            }
            self
        }

        /// `SUPABASE_URL=https://cache.invalid` with a fake key, as the Node fixtures set.
        pub fn shared_cache(&self) -> &Session {
            self.env("SUPABASE_URL", Some("https://cache.invalid"));
            self.env("SUPABASE_SERVICE_ROLE_KEY", Some("fake-isolated-cache-key"))
        }

        /// Writes `~/.guesty-cli/token.json` with `{ token }`.
        pub fn disk_token(&self, token: Json) -> &Session {
            let file = self.home.join(".guesty-cli/token.json");
            std::fs::write(file, json::compact(&json::json!({ "token": token }))).expect("token.json");
            self
        }

        pub fn answer(&self, handler: impl FnMut(&Recorded) -> Reply + Send + 'static) -> &Session {
            *self.handler.lock().unwrap_or_else(|e| e.into_inner()) = Box::new(handler);
            self
        }

        pub fn address(&self) -> &str {
            &self.address
        }

        pub fn requests(&self) -> Vec<Recorded> {
            self.requests.lock().unwrap_or_else(|e| e.into_inner()).clone()
        }

        /// Requests to one host.
        pub fn requests_to(&self, host: &str) -> Vec<Recorded> {
            self.requests().into_iter().filter(|r| r.host() == host).collect()
        }

        /// Every trace line of `kind`, as (value, clock).
        pub fn trace(&self, kind: &str) -> Vec<(Json, f64)> {
            let text = std::fs::read_to_string(&self.trace_path).unwrap_or_default();
            text.lines()
                .filter_map(|l| json::parse(l).ok())
                .filter(|v| v.get("kind").and_then(Json::as_str) == Some(kind))
                .map(|v| {
                    (v.get("value").cloned().unwrap_or(Json::Null), v.get("at").and_then(Json::as_f64).unwrap_or(0.0))
                })
                .collect()
        }

        pub fn waits(&self) -> Vec<u64> {
            self.trace("wait").iter().filter_map(|(v, _)| v.as_u64()).collect()
        }

        pub fn timeouts(&self) -> Vec<u64> {
            self.trace("timeout").iter().filter_map(|(v, _)| v.as_u64()).collect()
        }

        pub fn token_reads(&self) -> usize {
            self.trace("tokenRead").len()
        }

        /// Every file under HOME, for "nothing was written" checks.
        pub fn home_files(&self) -> Vec<(PathBuf, Vec<u8>)> {
            let mut out = Vec::new();
            walk(&self.home, &mut out);
            out.sort();
            out
        }
    }

    impl Drop for Session {
        fn drop(&mut self) {
            self.stop.store(true, Ordering::SeqCst);
            let _ = std::fs::remove_dir_all(&self.root);
        }
    }

    fn walk(dir: &Path, out: &mut Vec<(PathBuf, Vec<u8>)>) {
        let Ok(entries) = std::fs::read_dir(dir) else { return };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                walk(&path, out);
            } else if let Ok(bytes) = std::fs::read(&path) {
                out.push((path, bytes));
            }
        }
    }

    fn serve(
        listener: TcpListener,
        requests: Arc<Mutex<Vec<Recorded>>>,
        handler: Arc<Mutex<Handler>>,
        stop: Arc<std::sync::atomic::AtomicBool>,
    ) {
        while !stop.load(Ordering::SeqCst) {
            match listener.accept() {
                Ok((stream, _)) => {
                    let _ = stream.set_nonblocking(false);
                    let _ = handle(stream, &requests, &handler);
                }
                Err(_) => std::thread::sleep(Duration::from_millis(1)),
            }
        }
    }

    fn handle(
        stream: TcpStream,
        requests: &Arc<Mutex<Vec<Recorded>>>,
        handler: &Arc<Mutex<Handler>>,
    ) -> std::io::Result<()> {
        stream.set_read_timeout(Some(Duration::from_secs(5)))?;
        let mut reader = BufReader::new(stream.try_clone()?);
        let mut line = String::new();
        reader.read_line(&mut line)?;
        let mut parts = line.split_whitespace();
        let method = parts.next().unwrap_or("").to_string();
        let target = parts.next().unwrap_or("/").to_string();
        let mut headers = Vec::new();
        loop {
            let mut header = String::new();
            if reader.read_line(&mut header)? == 0 || header.trim().is_empty() {
                break;
            }
            if let Some((name, value)) = header.split_once(':') {
                headers.push((name.trim().to_ascii_lowercase(), value.trim().to_string()));
            }
        }
        let find = |name: &str| headers.iter().find(|(k, _)| k == name).map(|(_, v)| v.clone());
        let mut body = Vec::new();
        if let Some(length) = find("content-length").and_then(|v| v.parse::<usize>().ok()) {
            body.resize(length, 0);
            reader.read_exact(&mut body)?;
        } else if find("transfer-encoding").is_some_and(|v| v.contains("chunked")) {
            loop {
                let mut size = String::new();
                reader.read_line(&mut size)?;
                let n = usize::from_str_radix(size.trim(), 16).unwrap_or(0);
                let mut chunk = vec![0; n + 2];
                reader.read_exact(&mut chunk)?;
                if n == 0 {
                    break;
                }
                body.extend_from_slice(&chunk[..n]);
            }
        }
        let origin = find("x-guesty-test-origin").unwrap_or_else(|| "http://unknown".into());
        let url = url::Url::parse(&format!("{origin}{target}")).expect("request URL");
        let recorded = Recorded {
            method: method.clone(),
            url,
            headers: headers.into_iter().filter(|(k, _)| k != "x-guesty-test-origin").collect(),
            body,
            at: super::now_ms(),
        };
        requests.lock().unwrap_or_else(|e| e.into_inner()).push(recorded.clone());
        let reply = (handler.lock().unwrap_or_else(|e| e.into_inner()))(&recorded);
        let mut stream = stream;
        match reply {
            Reply::Drop => {
                let _ = stream.shutdown(Shutdown::Both);
            }
            Reply::Hang => {
                // Wait for the client to give up.
                let mut buf = [0u8; 64];
                while matches!(reader.read(&mut buf), Ok(n) if n > 0) {}
            }
            Reply::BodyFails => {
                stream.write_all(
                    b"HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: 1000\r\nconnection: close\r\n\r\n{\"partial\":",
                )?;
                stream.flush()?;
                let _ = stream.shutdown(Shutdown::Both);
            }
            Reply::Send { status, headers, body } => {
                let empty = [204, 205, 304].contains(&status) || method == "HEAD";
                let mut head = format!("HTTP/1.1 {status} Mock\r\nconnection: close\r\n");
                if !headers.iter().any(|(k, _)| k == "content-type") {
                    head.push_str("content-type: application/json\r\n");
                }
                for (k, v) in &headers {
                    head.push_str(&format!("{k}: {v}\r\n"));
                }
                if !empty {
                    head.push_str(&format!("content-length: {}\r\n", body.len()));
                }
                head.push_str("\r\n");
                stream.write_all(head.as_bytes())?;
                if !empty {
                    stream.write_all(&body)?;
                }
                stream.flush()?;
                let _ = stream.shutdown(Shutdown::Write);
            }
        }
        Ok(())
    }
}

/// Ports of the stdin and output tests in test/io.test.mjs, which called
/// readStdin() and print() in one Node process. They swap the process's
/// standard file descriptors, so they hold the shared test lock.
#[cfg(all(test, feature = "test-hooks"))]
mod io_tests {
    use super::testing::Session;
    use crate::output::{self, Data};
    use crate::stdin;
    use std::io::{Read, Write};
    use std::os::fd::{FromRawFd, RawFd};

    fn pipe() -> (RawFd, RawFd) {
        let mut fds = [0; 2];
        assert_eq!(unsafe { libc::pipe(fds.as_mut_ptr()) }, 0);
        (fds[0], fds[1])
    }

    /// Runs `f` with `fd` replaced by `with`, then restores it.
    fn swapped<T>(fd: RawFd, with: Option<RawFd>, f: impl FnOnce() -> T) -> T {
        let saved = unsafe { libc::dup(fd) };
        match with {
            Some(w) => assert!(unsafe { libc::dup2(w, fd) } >= 0),
            None => assert_eq!(unsafe { libc::close(fd) }, 0),
        }
        let out = f();
        unsafe {
            libc::dup2(saved, fd);
            libc::close(saved);
        }
        out
    }

    #[test]
    fn stdin_is_read_in_full_and_a_repeat_read_finishes() {
        let _session = Session::new();
        let (read, write) = pipe();
        let mut writer = unsafe { std::fs::File::from_raw_fd(write) };
        writer.write_all(b"hello\n").unwrap();
        drop(writer);
        let (first, second) = swapped(0, Some(read), || (stdin::read().unwrap(), stdin::read().unwrap()));
        unsafe { libc::close(read) };
        assert_eq!(first, "hello\n");
        assert_eq!(second, "");
    }

    #[test]
    fn tty_stdin_rejects() {
        let _session = Session::new();
        let (mut master, mut slave) = (0, 0);
        let opened = unsafe {
            libc::openpty(&mut master, &mut slave, std::ptr::null_mut(), std::ptr::null_mut(), std::ptr::null_mut())
        };
        assert_eq!(opened, 0);
        let result = swapped(0, Some(slave), stdin::read);
        unsafe {
            libc::close(slave);
            libc::close(master);
        }
        let error = result.err().expect("a terminal has no data").message();
        assert!(error.contains("No data on stdin"), "{error}");
    }

    #[test]
    fn closed_stdin_finishes_without_waiting() {
        let _session = Session::new();
        // Node rejected with "Stdin is closed"; a closed descriptor reads as empty
        // here, so the command reports invalid JSON input instead of hanging.
        let (text, body) = swapped(0, None, || (stdin::read().unwrap(), stdin::data_or_stdin(None)));
        assert_eq!(text, "");
        assert!(matches!(body, Err(crate::error::CliError::InvalidJson)));
    }

    #[test]
    fn byte_output_is_written_as_bytes() {
        let _session = Session::new();
        let (read, write) = pipe();
        swapped(1, Some(write), || {
            output::print(&Data::Bytes(vec![65, 0, 66]));
            output::flush_out();
            std::io::stdout().flush().unwrap();
        });
        unsafe { libc::close(write) };
        let mut got = Vec::new();
        unsafe { std::fs::File::from_raw_fd(read) }.read_to_end(&mut got).unwrap();
        assert_eq!(got, b"A\0B");
    }
}
