//! Milliseconds since the Unix epoch, from the Workers clock or the system clock.

#[cfg(target_arch = "wasm32")]
pub fn now_ms() -> i64 {
    js_sys::Date::now() as i64
}

#[cfg(not(target_arch = "wasm32"))]
pub fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as i64).unwrap_or(0)
}

/// A point in time a whole tool call must finish by (S8). Every fetch, body read and retry wait
/// takes its timeout from what's left.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Deadline {
    pub at_ms: i64,
}

impl Deadline {
    pub fn after(now_ms: i64, budget_ms: i64) -> Deadline {
        Deadline { at_ms: now_ms + budget_ms }
    }

    /// Milliseconds left at `now_ms`; zero once it has passed.
    pub fn remaining_at(&self, now_ms: i64) -> i64 {
        (self.at_ms - now_ms).max(0)
    }

    pub fn remaining(&self) -> i64 {
        self.remaining_at(now_ms())
    }

    /// Whether a wait of `wait_ms` (a retry or Retry-After) still leaves `then_need_ms` for the
    /// request that follows it.
    pub fn fits(&self, now_ms: i64, wait_ms: i64, then_need_ms: i64) -> bool {
        self.remaining_at(now_ms) > wait_ms + then_need_ms
    }

    /// The timeout for one fetch: the smaller of its own cap and what's left of the deadline.
    /// `None` when nothing is left.
    pub fn fetch_timeout(&self, now_ms: i64, cap_ms: i64) -> Option<i64> {
        let left = self.remaining_at(now_ms);
        (left > 0).then(|| left.min(cap_ms))
    }
}
