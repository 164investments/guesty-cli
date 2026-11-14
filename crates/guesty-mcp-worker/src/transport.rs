//! Outbound HTTP for the Worker (S8, S10): manual redirects (never followed: an error for the
//! token service and metadata documents, a response the core turns into its own message for
//! Guesty), a timeout taken from the call's deadline, and a streamed cap on the response body.
//!
//! The same [`fetch`] serves Guesty (the internet), the token service (a service binding) and
//! client metadata documents. It never logs; errors carry no URL or body.

use std::fmt;

#[derive(Clone)]
pub struct OutboundRequest {
    pub method: String,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Option<Vec<u8>>,
}

impl fmt::Debug for OutboundRequest {
    // Headers and bodies can hold tokens; only the method is shown.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("OutboundRequest").field("method", &self.method).finish_non_exhaustive()
    }
}

impl OutboundRequest {
    pub fn get(url: impl Into<String>) -> OutboundRequest {
        OutboundRequest { method: "GET".into(), url: url.into(), headers: Vec::new(), body: None }
    }

    pub fn header(mut self, name: &str, value: impl Into<String>) -> OutboundRequest {
        self.headers.push((name.to_string(), value.into()));
        self
    }

    pub fn json(method: &str, url: impl Into<String>, body: &serde_json::Value) -> OutboundRequest {
        OutboundRequest {
            method: method.into(),
            url: url.into(),
            headers: vec![("Content-Type".into(), "application/json".into())],
            body: Some(body.to_string().into_bytes()),
        }
    }
}

#[derive(Clone)]
pub struct OutboundResponse {
    pub status: u16,
    /// Lower-case names.
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

impl fmt::Debug for OutboundResponse {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("OutboundResponse")
            .field("status", &self.status)
            .field("body_len", &self.body.len())
            .finish_non_exhaustive()
    }
}

impl OutboundResponse {
    pub fn header(&self, name: &str) -> Option<&str> {
        let name = name.to_ascii_lowercase();
        self.headers.iter().find(|(n, _)| *n == name).map(|(_, v)| v.as_str())
    }
}

#[derive(Clone, Copy, Debug)]
pub struct FetchLimits {
    /// The longest one fetch (headers and body) may take, before the deadline's own limit.
    pub timeout_ms: i64,
    /// The most response-body bytes read; past it the fetch fails.
    pub max_body_bytes: usize,
    /// Return a redirect (3xx) as a response with no body, so the caller words the error (Guesty
    /// requests: the core says redirects aren't followed). Otherwise a redirect is
    /// [`TransportError::Redirect`]. It is never followed either way.
    pub redirect_as_response: bool,
}

impl FetchLimits {
    /// Guesty responses: 16 MB (S7); the timeout is whatever is left of the call.
    pub const GUESTY: FetchLimits =
        FetchLimits { timeout_ms: i64::MAX, max_body_bytes: 16 * 1024 * 1024, redirect_as_response: true };
    /// Token-service answers are small.
    pub const TOKEN_SERVICE: FetchLimits =
        FetchLimits { timeout_ms: 10_000, max_body_bytes: 64 * 1024, redirect_as_response: false };
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TransportError {
    /// Nothing was left of the deadline, so the request wasn't sent.
    DeadlineExceeded,
    /// The request was sent but didn't finish in time. For a write, its outcome is unknown.
    Timeout,
    /// The server answered with a redirect, which is never followed.
    Redirect { status: u16 },
    /// The response body was larger than the limit.
    BodyTooLarge { limit: usize },
    /// The request couldn't be made or the connection failed.
    Network,
}

pub fn is_redirect(status: u16) -> bool {
    matches!(status, 301 | 302 | 303 | 307 | 308)
}

/// Where a request goes.
#[cfg(target_arch = "wasm32")]
pub enum Target<'a> {
    Internet,
    Service(&'a worker::Fetcher),
}

#[cfg(target_arch = "wasm32")]
pub use wasm::fetch;

#[cfg(target_arch = "wasm32")]
mod wasm {
    use futures_util::StreamExt;
    use futures_util::future::{Either, select};
    use std::time::Duration;
    use worker::{AbortController, Delay, Fetch, Headers, Method, Request, RequestInit, RequestRedirect, Response};

    use super::{FetchLimits, OutboundRequest, OutboundResponse, Target, TransportError, is_redirect};
    use crate::clock::{Deadline, now_ms};

    fn method(name: &str) -> Method {
        Method::from(name.to_ascii_uppercase())
    }

    fn build(request: &OutboundRequest, signal: &worker::AbortSignal) -> Result<Request, TransportError> {
        let headers = Headers::new();
        for (name, value) in &request.headers {
            headers.append(name, value).map_err(|_| TransportError::Network)?;
        }
        let mut init = RequestInit::new();
        init.with_method(method(&request.method)).with_headers(headers).with_redirect(RequestRedirect::Manual);
        if let Some(body) = &request.body {
            init.with_body(Some(js_sys::Uint8Array::from(body.as_slice()).into()));
        }
        let built = Request::new_with_init(&request.url, &init).map_err(|_| TransportError::Network)?;
        // Carry the abort signal on the request itself, so a service-binding fetch is aborted too.
        let with_signal = web_sys::RequestInit::new();
        with_signal.set_signal(Some(signal));
        let sys = web_sys::Request::new_with_request_and_init(built.inner(), &with_signal)
            .map_err(|_| TransportError::Network)?;
        Ok(Request::from(sys))
    }

    /// Sends one request and reads its whole body, within `limits` and the deadline.
    pub async fn fetch(
        target: &Target<'_>,
        request: &OutboundRequest,
        deadline: Deadline,
        limits: FetchLimits,
    ) -> Result<OutboundResponse, TransportError> {
        let Some(timeout) = deadline.fetch_timeout(now_ms(), limits.timeout_ms) else {
            return Err(TransportError::DeadlineExceeded);
        };
        let ends_at = now_ms() + timeout;
        let controller = AbortController::default();
        let signal = controller.signal();
        let built = build(request, &signal)?;
        let send = async {
            match target {
                Target::Internet => Fetch::Request(built).send_with_signal(&signal).await,
                Target::Service(fetcher) => fetcher.fetch_request(built).await,
            }
        };
        let timer = Delay::from(Duration::from_millis(timeout as u64));
        let mut response: Response = match select(Box::pin(send), Box::pin(timer)).await {
            Either::Left((Ok(response), _)) => response,
            Either::Left((Err(_), _)) => return Err(TransportError::Network),
            Either::Right(_) => {
                controller.abort();
                return Err(TransportError::Timeout);
            }
        };
        let status = response.status_code();
        let headers: Vec<(String, String)> =
            response.headers().entries().map(|(n, v)| (n.to_ascii_lowercase(), v)).collect();
        if is_redirect(status) {
            controller.abort();
            if limits.redirect_as_response {
                return Ok(OutboundResponse { status, headers, body: Vec::new() });
            }
            return Err(TransportError::Redirect { status });
        }
        let declared = headers.iter().find(|(n, _)| n == "content-length").and_then(|(_, v)| v.parse::<usize>().ok());
        if declared.is_some_and(|n| n > limits.max_body_bytes) {
            controller.abort();
            return Err(TransportError::BodyTooLarge { limit: limits.max_body_bytes });
        }
        let mut body = Vec::new();
        if status != 204 && status != 304 && request.method != "HEAD" {
            let Ok(mut stream) = response.stream() else {
                return Ok(OutboundResponse { status, headers, body });
            };
            loop {
                let left = ends_at - now_ms();
                if left <= 0 {
                    controller.abort();
                    return Err(TransportError::Timeout);
                }
                let timer = Delay::from(Duration::from_millis(left as u64));
                match select(stream.next(), Box::pin(timer)).await {
                    Either::Left((Some(Ok(chunk)), _)) => {
                        if body.len() + chunk.len() > limits.max_body_bytes {
                            controller.abort();
                            return Err(TransportError::BodyTooLarge { limit: limits.max_body_bytes });
                        }
                        body.extend_from_slice(&chunk);
                    }
                    Either::Left((Some(Err(_)), _)) => return Err(TransportError::Network),
                    Either::Left((None, _)) => break,
                    Either::Right(_) => {
                        controller.abort();
                        return Err(TransportError::Timeout);
                    }
                }
            }
        }
        Ok(OutboundResponse { status, headers, body })
    }
}
