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
    if interactive() { interactive_ui::styled("36", "39", value) } else { value.to_string() }
}

fn set_framed(value: bool) {
    *FRAMED.lock().unwrap_or_else(|e| e.into_inner()) = value;
}

/// Runs a command's steps inside one titled frame and shows a failure there,
/// next to the step that failed.
pub fn frame(title: &str, run: impl FnOnce() -> Result<()>) -> Result<()> {
    if !interactive() {
        return run();
    }
    set_framed(true);
    interactive_ui::intro(title);
    let result = match run() {
        Ok(()) => Ok(()),
        Err(CliError::Shown) => Err(CliError::Shown),
        Err(CliError::Exit(code)) => Err(CliError::Exit(code)),
        Err(e) => {
            interactive_ui::cancel(&wrap(&crate::output::printable(&e.message()), "   "));
            Err(CliError::Shown)
        }
    };
    set_framed(false);
    result
}

/// The frame draws each line as given, so long messages are wrapped here to
/// fit beside its left bar.
fn wrap(message: &str, indent: &str) -> String {
    let width = interactive_ui::columns().min(88).saturating_sub(4);
    let visible = |value: &str| crate::json::js_len(&interactive_ui::strip_sgr(value));
    message
        .split('\n')
        .map(|paragraph| {
            let mut lines: Vec<String> = Vec::new();
            let mut line = String::new();
            for word in paragraph.split(' ') {
                if !line.is_empty() && visible(&line) + 1 + visible(word) > width {
                    lines.push(std::mem::replace(&mut line, word.to_string()));
                } else if line.is_empty() {
                    line = word.to_string();
                } else {
                    line = format!("{line} {word}");
                }
            }
            lines.push(line);
            lines.join(&format!("\n{indent}"))
        })
        .collect::<Vec<_>>()
        .join(&format!("\n{indent}"))
}

pub fn info(message: &str) {
    if interactive() { interactive_ui::info(&wrap(message, ""), framed()) } else { plain(message) }
}

pub fn success(message: &str) {
    if interactive() { interactive_ui::success(&wrap(message, ""), framed()) } else { plain(message) }
}

pub fn warn(message: &str) {
    if interactive() { interactive_ui::warn(&wrap(message, ""), framed()) } else { plain(message) }
}

pub fn done(message: &str) {
    if interactive() && framed() {
        interactive_ui::outro(&wrap(message, "   "))
    } else if interactive() {
        interactive_ui::success(&wrap(message, ""), false)
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
    interactive_ui::summary(title, rows, framed());
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
    let answer = interactive_ui::text(message, options)?;
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
        plain(
            &options
                .iter()
                .enumerate()
                .map(|(i, o)| format!("  {}. {}", i + 1, o.label))
                .collect::<Vec<_>>()
                .join("\n"),
        );
        let numbers: Vec<String> = (1..=options.len()).map(|n| n.to_string()).collect();
        let listed = format!("{} or {}", numbers[..numbers.len() - 1].join(", "), numbers[numbers.len() - 1]);
        let line = read_line(&format!("{message} Choose {listed}: "))?;
        // Number(line) - 1: "" is 0, so it picks nothing.
        let picked =
            js_number(&line).filter(|n| n.fract() == 0.0 && *n >= 1.0).and_then(|n| options.get(n as usize - 1));
        return match picked {
            Some(choice) => Ok(choice.value.clone()),
            None => Err(CliError::new(format!("Setup stopped: choose {listed}."))),
        };
    }
    interactive_ui::select(message, options)
}

/// Only asked at a terminal; scripts name their choices with options instead.
#[allow(dead_code)] // For `mcp install`.
pub fn choose_many(message: &str, options: &[Choice], initial: &[String]) -> Result<Vec<String>> {
    interactive_ui::multiselect(message, options, initial)
}

/// Shows a spinner while the work runs, then what happened.
pub fn task<T>(
    working: &str,
    finished: impl FnOnce(&T) -> String,
    failed: &str,
    work: impl FnOnce() -> Result<T>,
) -> Result<T> {
    if !interactive() {
        plain(&format!("{working}..."));
        return work();
    }
    interactive_ui::task(working, finished, failed, work)
}

/// JavaScript's `Number(string)`: `None` is NaN.
pub(crate) fn js_number(value: &str) -> Option<f64> {
    let t = crate::commands::query_options::js_trim(value);
    if t.is_empty() {
        return Some(0.0);
    }
    let radix = |digits: &str, radix: u32| -> Option<f64> {
        if digits.is_empty() || !digits.chars().all(|c| c.is_digit(radix)) {
            return None;
        }
        Some(digits.chars().fold(0.0, |n, c| n * radix as f64 + c.to_digit(radix).unwrap_or(0) as f64))
    };
    let lower = t.get(..2).map(str::to_ascii_lowercase);
    match lower.as_deref() {
        Some("0x") => return radix(&t[2..], 16),
        Some("0o") => return radix(&t[2..], 8),
        Some("0b") => return radix(&t[2..], 2),
        _ => {}
    }
    let (sign, rest) = match t.as_bytes()[0] {
        b'+' => (1.0, &t[1..]),
        b'-' => (-1.0, &t[1..]),
        _ => (1.0, t),
    };
    if rest == "Infinity" {
        return Some(sign * f64::INFINITY);
    }
    // StrDecimalLiteral: digits with an optional point and exponent, nothing else.
    let bytes = rest.as_bytes();
    let mut i = 0;
    let int_start = i;
    while i < bytes.len() && bytes[i].is_ascii_digit() {
        i += 1;
    }
    let mut digits = i - int_start;
    if i < bytes.len() && bytes[i] == b'.' {
        i += 1;
        let frac_start = i;
        while i < bytes.len() && bytes[i].is_ascii_digit() {
            i += 1;
        }
        digits += i - frac_start;
    }
    if digits == 0 {
        return None;
    }
    if i < bytes.len() && (bytes[i] == b'e' || bytes[i] == b'E') {
        i += 1;
        if i < bytes.len() && (bytes[i] == b'+' || bytes[i] == b'-') {
            i += 1;
        }
        let exp_start = i;
        while i < bytes.len() && bytes[i].is_ascii_digit() {
            i += 1;
        }
        if i == exp_start {
            return None;
        }
    }
    if i != bytes.len() {
        return None;
    }
    rest.parse::<f64>().ok().map(|n| sign * n)
}

/// The terminal side. Messages, notes and the frame are drawn here exactly
/// as @clack/prompts draws them; the questions and the spinner are cliclack's
/// (a port of @clack/prompts).
mod interactive_ui {
    use std::io::{self, IsTerminal};

    use super::{Check, Choice, TextOptions};
    use crate::error::{CliError, Result};
    use crate::output::write_err;

    /// Whether Node's `styleText` would color: it checks stdout and the environment.
    fn colors() -> bool {
        if let Some(force) = std::env::var_os("FORCE_COLOR") {
            let force = force.to_string_lossy();
            return !(force == "0" || force == "false");
        }
        if std::env::var_os("NO_COLOR").is_some() || std::env::var_os("NODE_DISABLE_COLORS").is_some() {
            return false;
        }
        std::io::stdout().is_terminal() && std::env::var("TERM").as_deref() != Ok("dumb")
    }

    /// `styleText` with one SGR pair.
    pub fn styled(open: &str, close: &str, text: &str) -> String {
        if colors() { format!("\x1b[{open}m{text}\x1b[{close}m") } else { text.to_string() }
    }

    fn gray(text: &str) -> String {
        styled("90", "39", text)
    }

    /// Removes color codes, as `wrap()` measures text.
    pub fn strip_sgr(value: &str) -> String {
        let mut out = String::with_capacity(value.len());
        let mut rest = value;
        while let Some(at) = rest.find("\x1b[") {
            out.push_str(&rest[..at]);
            let after = &rest[at + 2..];
            let end = after.find(|c: char| !(c.is_ascii_digit() || c == ';')).unwrap_or(after.len());
            if after[end..].starts_with('m') {
                rest = &after[end + 1..];
            } else {
                out.push_str("\x1b[");
                rest = after;
            }
        }
        out.push_str(rest);
        out
    }

    /// The terminal's width, as `process.stderr.columns` gives it.
    pub fn columns() -> usize {
        terminal_size::terminal_size_of(std::io::stderr()).map(|(w, _)| w.0 as usize).filter(|w| *w > 0).unwrap_or(80)
    }

    fn width(text: &str) -> usize {
        strip_sgr(text).chars().count()
    }

    const BAR: &str = "│";
    /// Moves up a line and clears it.
    const ERASE_LINE_ABOVE: &str = "\x1b[1A\x1b[2K";

    pub fn intro(title: &str) {
        let badge = styled("46", "49", &styled("30", "39", " Guesty CLI "));
        write_err(&format!("{}  {badge}  {title}\n", gray("┌")));
    }

    pub fn cancel(message: &str) {
        let guide = if super::framed() { format!("{}  ", gray("└")) } else { String::new() };
        write_err(&format!("{guide}{}\n\n", styled("31", "39", message)));
    }

    pub fn outro(message: &str) {
        write_err(&format!("{}\n{}  {message}\n\n", gray(BAR), gray("└")));
    }

    /// `log.message` with one line of spacing.
    fn log(message: &str, symbol: &str, guide: bool) {
        let bar = gray(BAR);
        let mut lines = vec![if guide { bar.clone() } else { String::new() }];
        for (index, line) in message.split('\n').enumerate() {
            lines.push(match (line.is_empty(), guide) {
                (_, false) => line.to_string(),
                (true, true) => {
                    if index == 0 {
                        symbol.to_string()
                    } else {
                        bar.clone()
                    }
                }
                (false, true) => format!("{}  {line}", if index == 0 { symbol } else { &bar }),
            });
        }
        write_err(&format!("{}\n", lines.join("\n")));
    }

    pub fn info(message: &str, guide: bool) {
        log(message, &styled("34", "39", "●"), guide)
    }

    pub fn success(message: &str, guide: bool) {
        log(message, &styled("32", "39", "◆"), guide)
    }

    pub fn warn(message: &str, guide: bool) {
        log(message, &styled("33", "39", "▲"), guide)
    }

    /// A hard wrap at `width` columns, breaking at spaces where it can
    /// (wrap-ansi with `hard: true, trim: false`).
    fn hard_wrap(text: &str, columns: usize) -> Vec<String> {
        let max = columns.max(1);
        let mut out = Vec::new();
        for paragraph in text.split('\n') {
            let mut line = String::new();
            for (index, word) in paragraph.split(' ').enumerate() {
                let candidate = if index == 0 { word.to_string() } else { format!("{line} {word}") };
                if index > 0 && width(&candidate) > max && !line.is_empty() {
                    out.push(std::mem::take(&mut line));
                    line = word.to_string();
                } else {
                    line = candidate;
                }
                while width(&line) > max {
                    let cut: String = line.chars().take(max).collect();
                    line = line.chars().skip(max).collect();
                    out.push(cut);
                }
            }
            out.push(line);
        }
        out
    }

    pub fn summary(title: &str, rows: &[(String, String)], guide: bool) {
        let label_width = rows.iter().map(|(label, _)| crate::json::js_len(label)).max().unwrap_or(0);
        let body = rows
            .iter()
            .map(|(label, value)| {
                let padded = format!("{label}{}", " ".repeat(label_width - crate::json::js_len(label)));
                format!("{}  {value}", styled("2", "22", &padded))
            })
            .collect::<Vec<_>>()
            .join("\n");
        let mut lines = vec![String::new()];
        lines.extend(hard_wrap(&body, columns().saturating_sub(6)));
        lines.push(String::new());
        let title_width = width(title);
        let inner = lines.iter().map(|l| width(l)).max().unwrap_or(0).max(title_width) + 2;
        let bar = gray(BAR);
        let body = lines
            .iter()
            .map(|line| format!("{bar}  {line}{}{bar}", " ".repeat(inner - width(line))))
            .collect::<Vec<_>>()
            .join("\n");
        let top = if guide { format!("{bar}\n") } else { String::new() };
        let corner = if guide { "├" } else { "╰" };
        write_err(&format!(
            "{top}{}  {} {}\n{body}\n{}\n",
            styled("32", "39", "◇"),
            styled("0", "0", title),
            gray(&format!("{}╮", "─".repeat(inner.saturating_sub(title_width + 1).max(1)))),
            gray(&format!("{corner}{}╯", "─".repeat(inner + 2))),
        ));
    }

    /// The prompts read keys in raw mode, where Ctrl+C makes console raise
    /// SIGINT; ignoring it while a question is open turns it into a cancel.
    struct CtrlCCancels(#[cfg(unix)] libc::sighandler_t);

    impl CtrlCCancels {
        fn new() -> Self {
            // SAFETY: replaces the process's SIGINT disposition; restored on drop.
            #[cfg(unix)]
            return CtrlCCancels(unsafe { libc::signal(libc::SIGINT, libc::SIG_IGN) });
            #[cfg(not(unix))]
            CtrlCCancels()
        }
    }

    impl Drop for CtrlCCancels {
        fn drop(&mut self) {
            // SAFETY: restores the disposition saved in new().
            #[cfg(unix)]
            unsafe {
                libc::signal(libc::SIGINT, self.0);
            }
        }
    }

    /// A cancelled question (Ctrl+C or Escape) stops the command.
    fn answered<T>(result: io::Result<T>) -> Result<T> {
        match result {
            Ok(value) => Ok(value),
            Err(e) if e.kind() == io::ErrorKind::Interrupted => {
                cancel("Stopped. Nothing was changed.");
                Err(CliError::Shown)
            }
            Err(e) => Err(CliError::new(e.to_string())),
        }
    }

    /// Clack starts each question with a bar joining it to what came before;
    /// cliclack ends each with one instead. Draw clack's and remove cliclack's.
    fn ask<T>(question: impl FnOnce() -> io::Result<T>) -> Result<T> {
        if super::framed() {
            write_err(&format!("{}\n", gray(BAR)));
        }
        let guard = CtrlCCancels::new();
        let result = question();
        drop(guard);
        match &result {
            Ok(_) => write_err(ERASE_LINE_ABOVE),
            // Clack ends a stopped question with a bar, not cliclack's "Operation cancelled.".
            Err(e) if e.kind() == io::ErrorKind::Interrupted => {
                write_err(&format!("{ERASE_LINE_ABOVE}{}\n", gray(BAR)))
            }
            Err(_) => {}
        }
        answered(result)
    }

    pub fn text(message: &str, options: TextOptions) -> Result<String> {
        let TextOptions { placeholder, fallback, check } = options;
        let mut input = cliclack::input(message).required(false);
        if let Some(placeholder) = &placeholder {
            input = input.placeholder(placeholder);
        }
        if let Some(fallback) = &fallback {
            input = input.default_input(fallback);
        }
        if let Some(check) = check {
            let fallback = fallback.unwrap_or_default();
            input = input.validate(move |value: &String| {
                let trimmed = crate::commands::query_options::js_trim(value);
                let settled = if trimmed.is_empty() { fallback.as_str() } else { trimmed };
                check(settled).map_or(Ok(()), Err)
            });
        }
        ask(|| input.interact::<String>())
    }

    pub fn password(message: &str, check: Option<Check>) -> Result<String> {
        let mut input = cliclack::password(message).allow_empty();
        if let Some(check) = check {
            input = input.validate(move |value: &String| {
                check(crate::commands::query_options::js_trim(value)).map_or(Ok(()), Err)
            });
        }
        ask(|| input.interact())
    }

    pub fn confirm(message: &str) -> Result<bool> {
        ask(|| cliclack::confirm(message).initial_value(false).interact())
    }

    pub fn select(message: &str, options: &[Choice]) -> Result<String> {
        let mut select = cliclack::select(message);
        for option in options {
            select = select.item(option.value.clone(), &option.label, option.hint.as_deref().unwrap_or(""));
        }
        ask(|| select.interact())
    }

    pub fn multiselect(message: &str, options: &[Choice], initial: &[String]) -> Result<Vec<String>> {
        let mut select = cliclack::multiselect(message).initial_values(initial.to_vec()).required(false);
        for option in options {
            select = select.item(option.value.clone(), &option.label, option.hint.as_deref().unwrap_or(""));
        }
        ask(|| select.interact())
    }

    pub fn task<T>(
        working: &str,
        finished: impl FnOnce(&T) -> String,
        failed: &str,
        work: impl FnOnce() -> Result<T>,
    ) -> Result<T> {
        if super::framed() {
            write_err(&format!("{}\n", gray(BAR)));
        }
        let spinner = cliclack::spinner();
        spinner.start(working);
        // cliclack ends a stopped spinner with a bar; clack doesn't.
        match work() {
            Ok(result) => {
                spinner.stop(finished(&result));
                write_err(ERASE_LINE_ABOVE);
                Ok(result)
            }
            Err(e) => {
                spinner.error(failed);
                write_err(ERASE_LINE_ABOVE);
                Err(e)
            }
        }
    }
}
