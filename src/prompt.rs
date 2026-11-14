//! Prompts and messages for `setup`, `team` and `mcp install`.
//!
//! A person at a terminal gets interactive prompts. Piped input (scripts and
//! tests) gets plain prompts and is read one line per question. Both write to
//! stderr, so stdout stays clean for results. Keep both paths asking the same
//! questions in the same order.

use std::io::{BufRead, IsTerminal};
use std::sync::Mutex;

use crate::error::{CliError, Result};
use crate::output::write_err;

pub fn interactive() -> bool {
    std::io::stdin().is_terminal()
}

static FRAMED: Mutex<bool> = Mutex::new(false);

fn framed() -> bool {
    *FRAMED.lock().unwrap_or_else(|e| e.into_inner())
}

/// One line of piped input, after writing the question; None at end of input.
fn next_line(question: &str) -> Option<String> {
    write_err(question);
    let mut line = String::new();
    let read = std::io::stdin().lock().read_line(&mut line).unwrap_or(0);
    write_err("\n");
    if read == 0 {
        return None;
    }
    // readline splits on \r\n, \n and \r.
    let line = line.trim_end_matches('\n').trim_end_matches('\r');
    let line = line.split('\r').next().unwrap_or("");
    Some(crate::commands::query_options::js_trim(line).to_string())
}

fn read_line(question: &str) -> Result<String> {
    next_line(question).ok_or_else(|| CliError::new("Setup needs an answer, but input ended."))
}

fn plain(message: &str) {
    write_err(&format!("{message}\n"));
}

/// Highlights a command the person can run next.
pub fn command(value: &str) -> String {
    if interactive() { format!("\x1b[36m{value}\x1b[39m") } else { value.to_string() }
}

/// Runs a command's steps inside one titled frame and shows a failure there,
/// next to the step that failed.
pub fn frame(title: &str, run: impl FnOnce() -> Result<()>) -> Result<()> {
    if !interactive() {
        return run();
    }
    *FRAMED.lock().unwrap_or_else(|e| e.into_inner()) = true;
    interactive_ui::intro(title);
    let result = run();
    *FRAMED.lock().unwrap_or_else(|e| e.into_inner()) = false;
    match result {
        Ok(()) => Ok(()),
        Err(CliError::Shown) => Err(CliError::Shown),
        Err(CliError::Exit(code)) => Err(CliError::Exit(code)),
        Err(e) => {
            interactive_ui::cancel(&crate::output::printable(&e.message()));
            Err(CliError::Shown)
        }
    }
}

pub fn info(message: &str) {
    if interactive() { interactive_ui::info(message) } else { plain(message) }
}

pub fn success(message: &str) {
    if interactive() { interactive_ui::success(message) } else { plain(message) }
}

pub fn warn(message: &str) {
    if interactive() { interactive_ui::warn(message) } else { plain(message) }
}

pub fn done(message: &str) {
    if interactive() && framed() {
        interactive_ui::outro(message)
    } else if interactive() {
        interactive_ui::success(message)
    } else {
        plain(message)
    }
}

/// Rows of label and value, aligned in a box at a terminal.
pub fn summary(title: &str, rows: &[(String, String)]) {
    if !interactive() {
        plain(title);
        for (label, value) in rows {
            plain(&format!("  {label}: {value}"));
        }
        return;
    }
    interactive_ui::summary(title, rows);
}

/// Returns None when the answer is acceptable, or the reason it is not.
pub type Check = Box<dyn Fn(&str) -> Option<String>>;

pub fn required(reason: &str) -> Check {
    let reason = reason.to_string();
    Box::new(move |value| if value.is_empty() { Some(reason.clone()) } else { None })
}

/// Turns a parser that fails on bad input into a check that explains why.
pub fn parses<T: 'static>(parse: fn(&str) -> Result<T>) -> Check {
    Box::new(move |value| parse(value).err().map(|e| e.message()))
}

#[derive(Default)]
pub struct TextOptions {
    pub placeholder: Option<String>,
    pub fallback: Option<String>,
    pub check: Option<Check>,
}

pub fn text(message: &str, options: TextOptions) -> Result<String> {
    let fallback = options.fallback.clone().unwrap_or_default();
    let settle = |value: Option<&str>| -> String {
        let trimmed = value.map(crate::commands::query_options::js_trim).unwrap_or("");
        if trimmed.is_empty() { fallback.clone() } else { trimmed.to_string() }
    };
    if !interactive() {
        let line = read_line(&format!("{message}: "))?;
        let answer = settle(Some(&line));
        if let Some(problem) = options.check.as_ref().and_then(|c| c(&answer)) {
            return Err(CliError::new(problem));
        }
        return Ok(answer);
    }
    let answer = interactive_ui::text(message, &options)?;
    Ok(settle(Some(&answer)))
}

pub fn secret(message: &str, check: Option<Check>) -> Result<String> {
    if !interactive() {
        let answer = read_line(&format!("{message}: "))?;
        if let Some(problem) = check.as_ref().and_then(|c| c(&answer)) {
            return Err(CliError::new(problem));
        }
        return Ok(answer);
    }
    Ok(crate::commands::query_options::js_trim(&interactive_ui::password(message, check)?).to_string())
}

/// Piped input that ends before the question answers no.
pub fn confirm(message: &str) -> Result<bool> {
    if !interactive() {
        let line = next_line(&format!("{message} (y/N) ")).unwrap_or_default();
        let lower = line.to_ascii_lowercase();
        return Ok(lower == "y" || lower == "yes");
    }
    interactive_ui::confirm(message)
}

#[derive(Clone, Debug)]
pub struct Choice {
    pub value: String,
    pub label: String,
    pub hint: Option<String>,
}

impl Choice {
    pub fn new(value: &str, label: &str, hint: Option<&str>) -> Choice {
        Choice { value: value.into(), label: label.into(), hint: hint.map(str::to_string) }
    }
}

pub fn choose(message: &str, options: &[Choice]) -> Result<String> {
    if !interactive() {
        plain(&options.iter().enumerate().map(|(i, o)| format!("  {}. {}", i + 1, o.label)).collect::<Vec<_>>().join("\n"));
        let numbers: Vec<String> = (1..=options.len()).map(|n| n.to_string()).collect();
        let listed = format!("{} or {}", numbers[..numbers.len() - 1].join(", "), numbers[numbers.len() - 1]);
        let line = read_line(&format!("{message} Choose {listed}: "))?;
        // Number(line) - 1: "" is 0, so it picks nothing.
        let picked = js_number(&line).filter(|n| n.fract() == 0.0 && *n >= 1.0).and_then(|n| options.get(n as usize - 1));
        return match picked {
            Some(choice) => Ok(choice.value.clone()),
            None => Err(CliError::new(format!("Setup stopped: choose {listed}."))),
        };
    }
    interactive_ui::select(message, options)
}

/// Only asked at a terminal; scripts name their choices with options instead.
pub fn choose_many(message: &str, options: &[Choice], initial: &[String]) -> Result<Vec<String>> {
    interactive_ui::multiselect(message, options, initial)
}

/// Shows a spinner while the work runs, then what happened.
pub fn task<T>(working: &str, finished: impl FnOnce(&T) -> String, failed: &str, work: impl FnOnce() -> Result<T>) -> Result<T> {
    if !interactive() {
        plain(&format!("{working}..."));
        return work();
    }
    interactive_ui::task(working, finished, failed, work)
}

/// JavaScript's `Number(string)` for a typed answer.
fn js_number(value: &str) -> Option<f64> {
    let t = crate::commands::query_options::js_trim(value);
    if t.is_empty() {
        return Some(0.0);
    }
    t.parse::<f64>().ok().filter(|n| n.is_finite())
}

/// The terminal side, with cliclack (a port of @clack/prompts).
mod interactive_ui {
    use super::{Check, Choice, TextOptions};
    use crate::error::Result;

    pub fn intro(_title: &str) {
        todo!("interactive prompts")
    }
    pub fn cancel(_message: &str) {
        todo!("interactive prompts")
    }
    pub fn outro(_message: &str) {
        todo!("interactive prompts")
    }
    pub fn info(_message: &str) {
        todo!("interactive prompts")
    }
    pub fn success(_message: &str) {
        todo!("interactive prompts")
    }
    pub fn warn(_message: &str) {
        todo!("interactive prompts")
    }
    pub fn summary(_title: &str, _rows: &[(String, String)]) {
        todo!("interactive prompts")
    }
    pub fn text(_message: &str, _options: &TextOptions) -> Result<String> {
        todo!("interactive prompts")
    }
    pub fn password(_message: &str, _check: Option<Check>) -> Result<String> {
        todo!("interactive prompts")
    }
    pub fn confirm(_message: &str) -> Result<bool> {
        todo!("interactive prompts")
    }
    pub fn select(_message: &str, _options: &[Choice]) -> Result<String> {
        todo!("interactive prompts")
    }
    pub fn multiselect(_message: &str, _options: &[Choice], _initial: &[String]) -> Result<Vec<String>> {
        todo!("interactive prompts")
    }
    pub fn task<T>(_working: &str, _finished: impl FnOnce(&T) -> String, _failed: &str, _work: impl FnOnce() -> Result<T>) -> Result<T> {
        todo!("interactive prompts")
    }
}
