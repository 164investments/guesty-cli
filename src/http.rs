//! One HTTP request, the way the Node CLI's `fetch` calls made it: no proxy
//! from the environment, redirects never followed, a per-request timeout,
//! and the response body read in full.

use std::io::Read;
use std::sync::OnceLock;
use std::time::Duration;

use crate::hooks;
use crate::json::json;

pub struct Request<'a> {
    pub method: &'a str,
    pub url: &'a str,
    pub headers: Vec<(String, String)>,
    pub body: Option<Vec<u8>>,
    pub timeout_ms: u64,
}

/// A response: status, lowercase header names and the body (the shared core's type).
pub use guesty_core::request::Response;

fn agent() -> &'static ureq::Agent {
    static AGENT: OnceLock<ureq::Agent> = OnceLock::new();
    AGENT.get_or_init(|| {
        ureq::Agent::config_builder()
            .http_status_as_error(false)
            .max_redirects(0)
            .max_redirects_will_error(false)
            .save_redirect_history(false)
            .proxy(None)
            .user_agent("guesty-cli")
            .build()
            .new_agent()
    })
}

/// Sends a request. `Err` is a network failure or timeout (fetch rejecting).
pub fn send(req: Request) -> Result<Response, ()> {
    hooks::trace("timeout", json!(req.timeout_ms));
    let (url, origin) = hooks::redirect(req.url);
    let method = ureq::http::Method::from_bytes(req.method.as_bytes()).map_err(|_| ())?;
    let mut builder = ureq::http::Request::builder().method(method).uri(&url);
    for (name, value) in &req.headers {
        builder = builder.header(name.as_str(), value.as_str());
    }
    if let Some(origin) = origin {
        builder = builder.header("x-guesty-test-origin", origin);
    }
    let agent = agent();
    let timeout = Some(Duration::from_millis(req.timeout_ms.max(1)));
    // A request without a body sends no Content-Length, as fetch does.
    let response = match req.body {
        Some(body) => {
            let request = builder.body(body).map_err(|_| ())?;
            let configured =
                agent.configure_request(request).timeout_global(timeout).allow_non_standard_methods(true).build();
            agent.run(configured)
        }
        None => {
            let request = builder.body(()).map_err(|_| ())?;
            let configured =
                agent.configure_request(request).timeout_global(timeout).allow_non_standard_methods(true).build();
            agent.run(configured)
        }
    }
    .map_err(|_| ())?;
    let status = response.status().as_u16();
    let headers = response
        .headers()
        .iter()
        .map(|(k, v)| (k.as_str().to_ascii_lowercase(), String::from_utf8_lossy(v.as_bytes()).into_owned()))
        .collect();
    let mut body = Vec::new();
    let read = response
        .into_body()
        .into_with_config()
        .limit(u64::MAX)
        .reader()
        .read_to_end(&mut body)
        .map(|_| body)
        .map_err(|_| ());
    Ok(Response { status, headers, body: read })
}
