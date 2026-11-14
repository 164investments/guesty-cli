//! The clock, sleeping, and where requests go. Release builds use the real
//! clock and network. Builds with the `test-hooks` feature (tests only) read:
//!
//! - `GUESTY_TEST_REDIRECT=http://127.0.0.1:PORT`: every request goes to this
//!   local mock instead, with the original origin in `x-guesty-test-origin`.
//! - `GUESTY_TEST_NOW=<ms>`: the clock starts here.
//! - `GUESTY_TEST_FAST_SLEEP=1`: sleeps return at once and advance the clock.
//! - `GUESTY_TEST_TRACE=<file>`: sleeps, request timeouts and private-cache
//!   reads are appended to this file as JSON lines.

use crate::json::Json;

#[cfg(not(feature = "test-hooks"))]
mod imp {
    use super::Json;

    pub fn now_ms() -> f64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as f64)
            .unwrap_or(0.0)
    }

    pub fn sleep_ms(ms: u64) {
        std::thread::sleep(std::time::Duration::from_millis(ms));
    }

    pub fn redirect(url: &str) -> (String, Option<String>) {
        (url.to_string(), None)
    }

    pub fn trace(_kind: &str, _value: Json) {}

    pub fn enabled() -> bool {
        false
    }
}

#[cfg(feature = "test-hooks")]
mod imp {
    use super::Json;
    use std::io::Write;
    use std::sync::Mutex;

    static CLOCK: Mutex<Option<f64>> = Mutex::new(None);

    fn real_now() -> f64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as f64)
            .unwrap_or(0.0)
    }

    pub fn now_ms() -> f64 {
        let mut clock = CLOCK.lock().unwrap_or_else(|e| e.into_inner());
        if clock.is_none() {
            *clock = Some(
                std::env::var("GUESTY_TEST_NOW").ok().and_then(|v| v.parse().ok()).unwrap_or_else(real_now),
            );
        }
        if std::env::var_os("GUESTY_TEST_NOW").is_none() {
            return real_now();
        }
        clock.unwrap_or(0.0)
    }

    pub fn sleep_ms(ms: u64) {
        trace("wait", Json::from(ms));
        if std::env::var("GUESTY_TEST_FAST_SLEEP").as_deref() == Ok("1") {
            let now = now_ms();
            *CLOCK.lock().unwrap_or_else(|e| e.into_inner()) = Some(now + ms as f64);
            return;
        }
        std::thread::sleep(std::time::Duration::from_millis(ms));
    }

    pub fn redirect(url: &str) -> (String, Option<String>) {
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
        let line = crate::json::compact(&crate::json::json!({ "kind": kind, "value": value }));
        if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
            let _ = writeln!(file, "{line}");
        }
    }

    pub fn enabled() -> bool {
        true
    }
}

pub use imp::*;
