//! A command-line parser that behaves like commander 13, which the Node CLI
//! used: the same option syntax, help layout, error messages and exit codes.
//! Agents, scripts and tests read that text, so this follows commander's
//! `parseOptions`, `_parseCommand` and `Help` closely rather than using clap.
//!
//! Commands are built with a commander-like builder:
//!
//! ```ignore
//! Command::new("get <ids...>")
//!     .description("Retrieve reservations by ID")
//!     .option("--fields <fields>", "Fields to return")
//!     .action(|c| { ... })
//! ```

use std::collections::HashMap;
use std::panic::Location;

use crate::error::{CliError, Result};
use crate::json::{self, Json};

/// A parsed option value, as commander stores it.
#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Str(String),
    Bool(bool),
    List(Vec<String>),
}

impl Value {
    fn to_json(&self) -> Json {
        match self {
            Value::Str(s) => Json::String(s.clone()),
            Value::Bool(b) => Json::Bool(*b),
            Value::List(items) => Json::Array(items.iter().cloned().map(Json::String).collect()),
        }
    }
}

/// A custom option parser: `(value, previous) -> new value`, like commander's
/// `argParser`. An error is an ordinary error (printed as `Error: ...`).
pub type Parser = fn(&str, Option<&Value>) -> Result<Value>;

pub type Action = Box<dyn Fn(&Call) -> Result<()>>;

#[derive(Clone, Debug)]
pub struct Opt {
    pub flags: String,
    pub description: String,
    pub short: Option<String>,
    pub long: Option<String>,
    /// `<value>`: a value must follow.
    pub required: bool,
    /// `[value]`: a value may follow.
    pub optional: bool,
    pub negate: bool,
    /// `requiredOption` / `makeOptionMandatory`.
    pub mandatory: bool,
    pub default: Option<Value>,
    pub choices: Option<Vec<String>>,
    pub parser: Option<Parser>,
    pub hidden: bool,
    pub line: u32,
}

impl Opt {
    /// `new Option(flags, description)`.
    #[track_caller]
    pub fn new(flags: &str, description: &str) -> Opt {
        let (short, long) = split_flags(flags);
        let negate = long.as_deref().is_some_and(|l| l.starts_with("--no-"));
        Opt {
            flags: flags.to_string(),
            description: description.to_string(),
            short,
            long,
            required: flags.contains('<'),
            optional: flags.contains('['),
            negate,
            mandatory: false,
            default: None,
            choices: None,
            parser: None,
            hidden: false,
            line: Location::caller().line(),
        }
    }

    pub fn choices(mut self, values: &[&str]) -> Opt {
        self.choices = Some(values.iter().map(|v| v.to_string()).collect());
        self
    }

    pub fn default(mut self, value: &str) -> Opt {
        self.default = Some(Value::Str(value.to_string()));
        self
    }

    pub fn mandatory(mut self) -> Opt {
        self.mandatory = true;
        self
    }

    pub fn parser(mut self, parser: Parser) -> Opt {
        self.parser = Some(parser);
        self
    }

    /// commander's `name()`: the long flag without dashes, or the short one.
    pub fn name(&self) -> String {
        match &self.long {
            Some(l) => l.trim_start_matches("--").to_string(),
            None => self.short.as_deref().unwrap_or("").trim_start_matches('-').to_string(),
        }
    }

    /// commander's `attributeName()`: camelCase, without `no-`.
    pub fn attribute(&self) -> String {
        let name = self.name();
        let name = if self.negate { name.trim_start_matches("no-").to_string() } else { name };
        camelcase(&name)
    }

    fn is(&self, arg: &str) -> bool {
        self.short.as_deref() == Some(arg) || self.long.as_deref() == Some(arg)
    }

    fn is_boolean(&self) -> bool {
        !self.required && !self.optional && !self.negate
    }

    /// The description with choices and default, as commander's help shows it.
    fn help_description(&self) -> String {
        let mut extra = Vec::new();
        if let Some(choices) = &self.choices {
            extra.push(format!("choices: {}", choices.iter().map(|c| json::quote(c)).collect::<Vec<_>>().join(", ")));
        }
        if let Some(default) = &self.default {
            let show = self.required || self.optional || (self.is_boolean() && matches!(default, Value::Bool(_)));
            if show {
                extra.push(format!("default: {}", json::compact(&default.to_json())));
            }
        }
        if extra.is_empty() { self.description.clone() } else { format!("{} ({})", self.description, extra.join(", ")) }
    }
}

fn camelcase(name: &str) -> String {
    let mut out = String::new();
    for (i, word) in name.split('-').enumerate() {
        if i == 0 {
            out.push_str(word);
        } else {
            let mut chars = word.chars();
            if let Some(first) = chars.next() {
                out.extend(first.to_uppercase());
                out.push_str(chars.as_str());
            }
        }
    }
    out
}

fn split_flags(flags: &str) -> (Option<String>, Option<String>) {
    let is_short = |s: &str| s.len() == 2 && s.starts_with('-') && !s[1..].starts_with('-');
    let is_long = |s: &str| s.starts_with("--") && s.len() > 2 && !s[2..].starts_with('-');
    let mut parts: Vec<&str> = flags.split([' ', '|', ',']).filter(|p| !p.is_empty()).collect();
    parts.push("guard");
    let mut short = None;
    let mut long = None;
    if is_short(parts[0]) {
        short = Some(parts.remove(0).to_string());
    }
    if is_long(parts[0]) {
        long = Some(parts.remove(0).to_string());
    }
    if short.is_none() && is_short(parts[0]) {
        short = Some(parts.remove(0).to_string());
    }
    if short.is_none() && is_long(parts[0]) {
        short = long.take();
        long = Some(parts.remove(0).to_string());
    }
    assert!(!parts[0].starts_with('-'), "option creation failed due to '{}' in option flags '{flags}'", parts[0]);
    assert!(short.is_some() || long.is_some(), "option creation failed due to no flags found in '{flags}'.");
    (short, long)
}

#[derive(Clone, Debug)]
pub struct Arg {
    pub name: String,
    pub description: String,
    pub required: bool,
    pub variadic: bool,
    /// Declared in the command's name string rather than with `.argument()`.
    pub inline: bool,
}

impl Arg {
    fn parse(token: &str, description: &str) -> Arg {
        let required = token.starts_with('<');
        let inner = &token[1..token.len() - 1];
        let variadic = inner.ends_with("...");
        Arg {
            name: inner.trim_end_matches("...").to_string(),
            description: description.to_string(),
            required,
            variadic,
            inline: false,
        }
    }

    fn human(&self) -> String {
        let name = format!("{}{}", self.name, if self.variadic { "..." } else { "" });
        if self.required { format!("<{name}>") } else { format!("[{name}]") }
    }
}

pub struct Command {
    pub name: String,
    pub aliases: Vec<String>,
    pub description: String,
    pub args: Vec<Arg>,
    pub options: Vec<Opt>,
    pub commands: Vec<Command>,
    pub action: Option<Action>,
    pub version: Option<String>,
    pub hidden: bool,
    pub file: &'static str,
    pub line: u32,
}

impl Command {
    /// `new Command("name <arg> [opt]")` / `program.command(...)`.
    #[track_caller]
    pub fn new(name_and_args: &str) -> Command {
        let mut parts = name_and_args.split_whitespace();
        let name = parts.next().unwrap_or("").to_string();
        let args = parts.map(|token| Arg { inline: true, ..Arg::parse(token, "") }).collect();
        let at = Location::caller();
        Command {
            name,
            aliases: Vec::new(),
            description: String::new(),
            args,
            options: Vec::new(),
            commands: Vec::new(),
            action: None,
            version: None,
            hidden: false,
            file: at.file(),
            line: at.line(),
        }
    }

    pub fn alias(mut self, alias: &str) -> Command {
        self.aliases.push(alias.to_string());
        self
    }

    pub fn description(mut self, text: &str) -> Command {
        self.description = text.to_string();
        self
    }

    /// `.argument("<name>", "description")`.
    pub fn argument(mut self, token: &str, description: &str) -> Command {
        self.args.push(Arg::parse(token, description));
        self
    }

    /// `.option(flags, description)`.
    #[track_caller]
    pub fn option(self, flags: &str, description: &str) -> Command {
        let opt = Opt::new(flags, description);
        self.add_option(opt)
    }

    /// `.option(flags, description, default)`.
    #[track_caller]
    pub fn option_default(self, flags: &str, description: &str, default: &str) -> Command {
        let opt = Opt::new(flags, description).default(default);
        self.add_option(opt)
    }

    /// `.option(flags, description, parser, default)`.
    #[track_caller]
    pub fn option_parsed(self, flags: &str, description: &str, parser: Parser, default: Option<Value>) -> Command {
        let mut opt = Opt::new(flags, description).parser(parser);
        opt.default = default;
        self.add_option(opt)
    }

    /// `.requiredOption(flags, description)`.
    #[track_caller]
    pub fn required_option(self, flags: &str, description: &str) -> Command {
        let opt = Opt::new(flags, description).mandatory();
        self.add_option(opt)
    }

    /// `.requiredOption(flags, description, parser, default)`.
    #[track_caller]
    pub fn required_option_parsed(
        self,
        flags: &str,
        description: &str,
        parser: Parser,
        default: Option<Value>,
    ) -> Command {
        let mut opt = Opt::new(flags, description).mandatory().parser(parser);
        opt.default = default;
        self.add_option(opt)
    }

    /// `.addOption(new Option(...))`.
    pub fn add_option(mut self, opt: Opt) -> Command {
        let clash =
            |o: &Opt| opt.short.as_deref().is_some_and(|s| o.is(s)) || opt.long.as_deref().is_some_and(|l| o.is(l));
        assert!(
            !self.options.iter().any(clash),
            "Cannot add option '{}' to command '{}' due to a conflicting flag",
            opt.flags,
            self.name
        );
        self.options.push(opt);
        self
    }

    /// `.addCommand(cmd)` / `.command(...)`.
    pub fn command(mut self, cmd: Command) -> Command {
        let names: Vec<&String> = std::iter::once(&cmd.name).chain(cmd.aliases.iter()).collect();
        assert!(
            !names.iter().any(|n| self.find_command(n).is_some()),
            "cannot add command '{}' as already have it",
            cmd.name
        );
        self.commands.push(cmd);
        self
    }

    pub fn version(mut self, version: &str) -> Command {
        self.version = Some(version.to_string());
        let opt = Opt::new("-V, --version", "output the version number");
        self.add_option(opt)
    }

    pub fn hidden(mut self) -> Command {
        self.hidden = true;
        self
    }

    pub fn action(mut self, action: impl Fn(&Call) -> Result<()> + 'static) -> Command {
        self.action = Some(Box::new(action));
        self
    }

    pub fn find_command(&self, name: &str) -> Option<&Command> {
        if name.is_empty() {
            return None;
        }
        self.commands.iter().find(|c| c.name == name || c.aliases.iter().any(|a| a == name))
    }

    fn find_option(&self, arg: &str) -> Option<&Opt> {
        self.options.iter().find(|o| o.is(arg))
    }

    fn has_help_command(&self) -> bool {
        !self.commands.is_empty() && self.action.is_none() && self.find_command("help").is_none()
    }
}

/// Everything an action gets: its arguments and option values.
pub struct Call<'a> {
    pub command: &'a Command,
    pub args: Vec<ArgValue>,
    pub opts: Opts,
}

#[derive(Clone, Debug)]
pub enum ArgValue {
    One(Option<String>),
    Many(Vec<String>),
}

impl<'a> Call<'a> {
    /// A required or optional single argument.
    pub fn arg(&self, index: usize) -> &str {
        match self.args.get(index) {
            Some(ArgValue::One(Some(v))) => v,
            _ => "",
        }
    }

    pub fn arg_opt(&self, index: usize) -> Option<&str> {
        match self.args.get(index) {
            Some(ArgValue::One(v)) => v.as_deref(),
            _ => None,
        }
    }

    /// A variadic argument.
    pub fn args_many(&self, index: usize) -> &[String] {
        match self.args.get(index) {
            Some(ArgValue::Many(v)) => v,
            _ => &[],
        }
    }
}

/// Option values by commander attribute name (`--check-out-from` →
/// `checkOutFrom`). Like commander's `opts()`, an option that was neither
/// given nor defaulted is absent.
#[derive(Clone, Debug, Default)]
pub struct Opts {
    values: HashMap<String, Value>,
    sources: HashMap<String, &'static str>,
}

impl Opts {
    /// A string value (`opts.x` for a `<value>` option).
    pub fn str(&self, key: &str) -> Option<&str> {
        match self.values.get(key) {
            Some(Value::Str(s)) => Some(s),
            _ => None,
        }
    }

    /// JavaScript truthiness of `opts.x`.
    pub fn flag(&self, key: &str) -> bool {
        match self.values.get(key) {
            Some(Value::Bool(b)) => *b,
            Some(Value::Str(s)) => !s.is_empty(),
            Some(Value::List(_)) => true,
            None => false,
        }
    }

    /// `opts.x` for a boolean or negatable option: `None` when undefined.
    pub fn bool(&self, key: &str) -> Option<bool> {
        match self.values.get(key) {
            Some(Value::Bool(b)) => Some(*b),
            _ => None,
        }
    }

    /// A repeated (collected) option's values.
    pub fn list(&self, key: &str) -> &[String] {
        match self.values.get(key) {
            Some(Value::List(v)) => v,
            _ => &[],
        }
    }

    pub fn get(&self, key: &str) -> Option<&Value> {
        self.values.get(key)
    }

    /// `opts.x !== undefined`.
    pub fn has(&self, key: &str) -> bool {
        self.values.contains_key(key)
    }

    fn set(&mut self, key: String, value: Value, source: &'static str) {
        self.sources.insert(key.clone(), source);
        self.values.insert(key, value);
    }
}

/// How parsing ended without running an action.
#[derive(Debug)]
pub struct Exit {
    pub stdout: String,
    pub stderr: String,
    pub code: i32,
}

impl Exit {
    fn error(message: String) -> Exit {
        Exit { stdout: String::new(), stderr: format!("{message}\n"), code: 1 }
    }
}

pub enum Parsed<'a> {
    Run(Call<'a>),
    Exit(Exit),
    /// A custom option parser failed: an ordinary error.
    Failed(CliError),
}

struct Frame<'a> {
    cmd: &'a Command,
    opts: Opts,
}

/// Parses `argv` (without the program name) against `root`.
pub fn parse<'a>(root: &'a Command, argv: Vec<String>) -> Parsed<'a> {
    let mut chain: Vec<Frame<'a>> = Vec::new();
    match parse_command(root, &mut chain, Vec::new(), argv) {
        Ok(call) => Parsed::Run(call),
        Err(Stop::Exit(exit)) => Parsed::Exit(exit),
        Err(Stop::Failed(e)) => Parsed::Failed(e),
    }
}

enum Stop {
    Exit(Exit),
    Failed(CliError),
}

fn defaults(cmd: &Command) -> Opts {
    let mut opts = Opts::default();
    for opt in &cmd.options {
        let key = opt.attribute();
        if opt.negate {
            let positive = opt.long.as_deref().unwrap_or("").replacen("--no-", "--", 1);
            if cmd.find_option(&positive).is_none() {
                opts.set(key, opt.default.clone().unwrap_or(Value::Bool(true)), "default");
            }
        } else if let Some(default) = &opt.default {
            opts.set(key, default.clone(), "default");
        }
    }
    opts
}

fn parse_command<'a>(
    cmd: &'a Command,
    chain: &mut Vec<Frame<'a>>,
    operands: Vec<String>,
    unknown: Vec<String>,
) -> std::result::Result<Call<'a>, Stop> {
    chain.push(Frame { cmd, opts: defaults(cmd) });
    let (parsed_operands, parsed_unknown) = parse_options(chain, unknown)?;
    let mut operands = operands;
    operands.extend(parsed_operands);
    let unknown = parsed_unknown;
    let mut args: Vec<String> = operands.clone();
    args.extend(unknown.iter().cloned());

    if let Some(first) = operands.first() {
        if let Some(sub) = cmd.find_command(first) {
            return parse_command(sub, chain, operands[1..].to_vec(), unknown);
        }
    }
    if cmd.has_help_command() && operands.first().map(String::as_str) == Some("help") {
        return Err(dispatch_help(cmd, chain, operands.get(1).cloned()));
    }
    if !cmd.commands.is_empty() && args.is_empty() && cmd.action.is_none() {
        return Err(Stop::Exit(help_exit(chain, true)));
    }
    output_help_if_requested(chain, &unknown)?;
    // Mandatory options, walking up the chain.
    for frame in chain.iter() {
        for opt in &frame.cmd.options {
            if opt.mandatory && !frame.opts.has(&opt.attribute()) {
                return Err(Stop::Exit(Exit::error(format!("error: required option '{}' not specified", opt.flags))));
            }
        }
    }
    let check_unknown = |unknown: &[String], chain: &[Frame]| -> std::result::Result<(), Stop> {
        if let Some(flag) = unknown.first() {
            return Err(Stop::Exit(Exit::error(unknown_option(chain, flag))));
        }
        Ok(())
    };

    if cmd.action.is_some() {
        check_unknown(&unknown, chain)?;
        let processed = process_arguments(cmd, &args)?;
        let frame = chain.pop().expect("frame");
        return Ok(Call { command: cmd, args: processed, opts: frame.opts });
    }
    if !operands.is_empty() {
        if !cmd.commands.is_empty() {
            return Err(Stop::Exit(Exit::error(unknown_command(cmd, &args[0]))));
        }
        check_unknown(&unknown, chain)?;
        process_arguments(cmd, &args)?;
    } else if !cmd.commands.is_empty() {
        check_unknown(&unknown, chain)?;
        return Err(Stop::Exit(help_exit(chain, true)));
    } else {
        check_unknown(&unknown, chain)?;
        process_arguments(cmd, &args)?;
    }
    // A command with no action and no subcommands: commander does nothing.
    Err(Stop::Exit(Exit { stdout: String::new(), stderr: String::new(), code: 0 }))
}

fn dispatch_help<'a>(cmd: &'a Command, chain: &mut Vec<Frame<'a>>, name: Option<String>) -> Stop {
    let Some(name) = name else {
        return Stop::Exit(help_exit(chain, false));
    };
    match cmd.find_command(&name) {
        Some(sub) => {
            chain.push(Frame { cmd: sub, opts: Opts::default() });
            Stop::Exit(help_exit(chain, false))
        }
        None => Stop::Exit(help_exit(chain, true)),
    }
}

fn output_help_if_requested(chain: &[Frame], unknown: &[String]) -> std::result::Result<(), Stop> {
    if unknown.iter().any(|a| a == "-h" || a == "--help") {
        return Err(Stop::Exit(help_exit(chain, false)));
    }
    Ok(())
}

fn help_exit(chain: &[Frame], error: bool) -> Exit {
    let cmds: Vec<&Command> = chain.iter().map(|f| f.cmd).collect();
    let width = help_width(error);
    let text = format_help(&cmds, width);
    if error {
        Exit { stdout: String::new(), stderr: text, code: 1 }
    } else {
        Exit { stdout: text, stderr: String::new(), code: 0 }
    }
}

fn help_width(error: bool) -> usize {
    use std::io::IsTerminal;
    let tty = if error { std::io::stderr().is_terminal() } else { std::io::stdout().is_terminal() };
    if !tty {
        return 80;
    }
    let size = if error {
        terminal_size::terminal_size_of(std::io::stderr())
    } else {
        terminal_size::terminal_size_of(std::io::stdout())
    };
    size.map(|(w, _)| w.0 as usize).unwrap_or(80)
}

fn maybe_option(arg: &str) -> bool {
    arg.len() > 1 && arg.starts_with('-')
}

/// commander's `parseOptions` for the last command in `chain`.
fn parse_options(chain: &mut [Frame], argv: Vec<String>) -> std::result::Result<(Vec<String>, Vec<String>), Stop> {
    let mut operands = Vec::new();
    let mut unknown: Vec<String> = Vec::new();
    let mut to_unknown = false;
    let mut args: std::collections::VecDeque<String> = argv.into();
    let frame = chain.last_mut().expect("frame");
    let cmd = frame.cmd;

    while let Some(arg) = args.pop_front() {
        if arg == "--" {
            if to_unknown {
                unknown.push(arg);
                unknown.extend(args.drain(..));
            } else {
                operands.extend(args.drain(..));
            }
            break;
        }
        if maybe_option(&arg) {
            if let Some(opt) = cmd.find_option(&arg) {
                if opt.required {
                    let Some(value) = args.pop_front() else {
                        return Err(Stop::Exit(Exit::error(format!("error: option '{}' argument missing", opt.flags))));
                    };
                    emit(cmd, &mut frame.opts, opt, Some(value))?;
                } else if opt.optional {
                    let value =
                        if args.front().is_some_and(|next| !maybe_option(next)) { args.pop_front() } else { None };
                    emit(cmd, &mut frame.opts, opt, value)?;
                } else {
                    emit(cmd, &mut frame.opts, opt, None)?;
                }
                continue;
            }
        }
        let bytes = arg.as_bytes();
        if arg.len() > 2 && bytes[0] == b'-' && bytes[1] != b'-' {
            let first: String = arg.chars().take(2).collect();
            if let Some(opt) = cmd.find_option(&first) {
                let rest = arg[first.len()..].to_string();
                // commander combines a flag and its optional value by default.
                if opt.required || opt.optional {
                    emit(cmd, &mut frame.opts, opt, Some(rest))?;
                } else {
                    emit(cmd, &mut frame.opts, opt, None)?;
                    args.push_front(format!("-{rest}"));
                }
                continue;
            }
        }
        if arg.starts_with("--") {
            if let Some(index) = arg.find('=') {
                if index > 2 {
                    if let Some(opt) = cmd.find_option(&arg[..index]) {
                        if opt.required || opt.optional {
                            emit(cmd, &mut frame.opts, opt, Some(arg[index + 1..].to_string()))?;
                            continue;
                        }
                    }
                }
            }
        }
        if maybe_option(&arg) {
            to_unknown = true;
        }
        if to_unknown { unknown.push(arg) } else { operands.push(arg) }
    }
    Ok((operands, unknown))
}

/// Stores an option's value: commander's `option:<name>` listener.
fn emit(cmd: &Command, opts: &mut Opts, opt: &Opt, value: Option<String>) -> std::result::Result<(), Stop> {
    if cmd.version.is_some() && opt.long.as_deref() == Some("--version") {
        let version = cmd.version.clone().unwrap_or_default();
        return Err(Stop::Exit(Exit { stdout: format!("{version}\n"), stderr: String::new(), code: 0 }));
    }
    let key = opt.attribute();
    let new = match value {
        Some(v) => {
            if let Some(choices) = &opt.choices {
                if !choices.iter().any(|c| c == &v) {
                    return Err(Stop::Exit(Exit::error(format!(
                        "error: option '{}' argument '{}' is invalid. Allowed choices are {}.",
                        opt.flags,
                        v,
                        choices.join(", ")
                    ))));
                }
                Value::Str(v)
            } else if let Some(parser) = opt.parser {
                parser(&v, opts.get(&key)).map_err(Stop::Failed)?
            } else {
                Value::Str(v)
            }
        }
        None => {
            if opt.negate {
                Value::Bool(false)
            } else {
                Value::Bool(true)
            }
        }
    };
    opts.set(key, new, "cli");
    Ok(())
}

fn process_arguments(cmd: &Command, args: &[String]) -> std::result::Result<Vec<ArgValue>, Stop> {
    for (i, arg) in cmd.args.iter().enumerate() {
        if arg.required && args.get(i).is_none() {
            return Err(Stop::Exit(Exit::error(format!("error: missing required argument '{}'", arg.name))));
        }
    }
    let variadic_last = cmd.args.last().is_some_and(|a| a.variadic);
    if !variadic_last && args.len() > cmd.args.len() {
        let expected = cmd.args.len();
        // Only the root lacks a parent; it has subcommands, so never gets here.
        return Err(Stop::Exit(Exit::error(format!(
            "error: too many arguments for '{}'. Expected {} argument{} but got {}.",
            cmd.name,
            expected,
            if expected == 1 { "" } else { "s" },
            args.len()
        ))));
    }
    Ok(cmd
        .args
        .iter()
        .enumerate()
        .map(|(i, arg)| {
            if arg.variadic {
                ArgValue::Many(args.get(i..).map(|s| s.to_vec()).unwrap_or_default())
            } else {
                ArgValue::One(args.get(i).cloned())
            }
        })
        .collect())
}

fn unknown_option(chain: &[Frame], flag: &str) -> String {
    let mut suggestion = String::new();
    if flag.starts_with("--") {
        let mut candidates = Vec::new();
        for frame in chain.iter().rev() {
            for opt in visible_options(frame.cmd) {
                if let Some(long) = opt.long {
                    candidates.push(long);
                }
            }
        }
        suggestion = suggest_similar(flag, &candidates);
    }
    format!("error: unknown option '{flag}'{suggestion}")
}

fn unknown_command(cmd: &Command, name: &str) -> String {
    let mut candidates = Vec::new();
    for sub in visible_commands(cmd) {
        candidates.push(sub.name.clone());
        if let Some(alias) = sub.aliases.first() {
            candidates.push(alias.clone());
        }
    }
    format!("error: unknown command '{name}'{}", suggest_similar(name, &candidates))
}

fn edit_distance(a: &[u16], b: &[u16]) -> usize {
    if a.len().abs_diff(b.len()) > 3 {
        return a.len().max(b.len());
    }
    let mut d = vec![vec![0usize; b.len() + 1]; a.len() + 1];
    for (i, row) in d.iter_mut().enumerate() {
        row[0] = i;
    }
    for j in 0..=b.len() {
        d[0][j] = j;
    }
    for j in 1..=b.len() {
        for i in 1..=a.len() {
            let cost = usize::from(a[i - 1] != b[j - 1]);
            d[i][j] = (d[i - 1][j] + 1).min(d[i][j - 1] + 1).min(d[i - 1][j - 1] + cost);
            if i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1] {
                d[i][j] = d[i][j].min(d[i - 2][j - 2] + 1);
            }
        }
    }
    d[a.len()][b.len()]
}

/// commander's `suggestSimilar`.
fn suggest_similar(word: &str, candidates: &[String]) -> String {
    let mut unique: Vec<String> = Vec::new();
    for c in candidates {
        if !unique.contains(c) {
            unique.push(c.clone());
        }
    }
    let options = word.starts_with("--");
    let word = if options { &word[2..] } else { word };
    let word16: Vec<u16> = word.encode_utf16().collect();
    let mut similar: Vec<String> = Vec::new();
    let mut best = 3;
    for candidate in unique {
        let candidate = if options { candidate[2..].to_string() } else { candidate };
        let c16: Vec<u16> = candidate.encode_utf16().collect();
        if c16.len() <= 1 {
            continue;
        }
        let distance = edit_distance(&word16, &c16);
        let length = word16.len().max(c16.len());
        let similarity = (length as f64 - distance as f64) / length as f64;
        if similarity > 0.4 {
            if distance < best {
                best = distance;
                similar = vec![candidate];
            } else if distance == best {
                similar.push(candidate);
            }
        }
    }
    similar.sort_by(|a, b| locale_compare(a, b));
    if options {
        similar = similar.into_iter().map(|c| format!("--{c}")).collect();
    }
    match similar.len() {
        0 => String::new(),
        1 => format!("\n(Did you mean {}?)", similar[0]),
        _ => format!("\n(Did you mean one of {}?)", similar.join(", ")),
    }
}

/// An approximation of `String#localeCompare` for command and option names
/// (ASCII letters, digits and dashes): case-insensitive first, then
/// lowercase before uppercase, with punctuation before digits before letters.
fn locale_compare(a: &str, b: &str) -> std::cmp::Ordering {
    let key = |s: &str| -> Vec<(u8, u8, u8)> {
        s.bytes()
            .map(|c| {
                let class = if c.is_ascii_alphabetic() {
                    2
                } else if c.is_ascii_digit() {
                    1
                } else {
                    0
                };
                (class, c.to_ascii_lowercase(), u8::from(c.is_ascii_uppercase()))
            })
            .collect()
    };
    let (ka, kb) = (key(a), key(b));
    let primary = |k: &[(u8, u8, u8)]| k.iter().map(|x| (x.0, x.1)).collect::<Vec<_>>();
    primary(&ka).cmp(&primary(&kb)).then_with(|| ka.cmp(&kb))
}

// ─── Help ─────────────────────────────────────────────────────────────────────

struct HelpOpt {
    flags: String,
    description: String,
    long: Option<String>,
}

fn visible_options(cmd: &Command) -> Vec<HelpOpt> {
    let mut out: Vec<HelpOpt> = cmd
        .options
        .iter()
        .filter(|o| !o.hidden)
        .map(|o| HelpOpt { flags: o.flags.clone(), description: o.help_description(), long: o.long.clone() })
        .collect();
    let has_short = cmd.find_option("-h").is_some();
    let has_long = cmd.find_option("--help").is_some();
    let description = "display help for command".to_string();
    if !has_short && !has_long {
        out.push(HelpOpt { flags: "-h, --help".into(), description, long: Some("--help".into()) });
    } else if !has_long {
        out.push(HelpOpt { flags: "--help".into(), description, long: Some("--help".into()) });
    } else if !has_short {
        out.push(HelpOpt { flags: "-h".into(), description, long: None });
    }
    out
}

struct HelpCmd {
    term: String,
    description: String,
}

fn visible_commands(cmd: &Command) -> Vec<&Command> {
    cmd.commands.iter().filter(|c| !c.hidden).collect()
}

fn subcommand_term(cmd: &Command) -> String {
    let args: Vec<String> = cmd.args.iter().map(Arg::human).collect();
    let mut term = cmd.name.clone();
    if let Some(alias) = cmd.aliases.first() {
        term.push('|');
        term.push_str(alias);
    }
    if !cmd.options.is_empty() {
        term.push_str(" [options]");
    }
    if !args.is_empty() {
        term.push(' ');
        term.push_str(&args.join(" "));
    }
    term
}

fn command_usage(chain: &[&Command]) -> String {
    let cmd = chain[chain.len() - 1];
    let mut name = cmd.name.clone();
    if let Some(alias) = cmd.aliases.first() {
        name = format!("{name}|{alias}");
    }
    let ancestors: String = chain[..chain.len() - 1].iter().map(|c| format!("{} ", c.name)).collect();
    let mut usage = vec!["[options]".to_string()];
    if !cmd.commands.is_empty() {
        usage.push("[command]".into());
    }
    usage.extend(cmd.args.iter().map(Arg::human));
    format!("{ancestors}{name} {}", usage.join(" "))
}

/// commander's `Help.formatHelp` for the last command in `chain`.
pub fn format_help(chain: &[&Command], help_width: usize) -> String {
    let cmd = chain[chain.len() - 1];
    let options = visible_options(cmd);
    let mut commands: Vec<HelpCmd> = visible_commands(cmd)
        .into_iter()
        .map(|c| HelpCmd { term: subcommand_term(c), description: c.description.clone() })
        .collect();
    if cmd.has_help_command() {
        commands.push(HelpCmd { term: "help [command]".into(), description: "display help for command".into() });
    }
    let arguments: Vec<(String, String)> = if cmd.args.iter().any(|a| !a.description.is_empty()) {
        cmd.args.iter().map(|a| (a.name.clone(), a.description.clone())).collect()
    } else {
        Vec::new()
    };

    let term_width = options
        .iter()
        .map(|o| json::js_len(&o.flags))
        .chain(commands.iter().map(|c| json::js_len(&c.term)))
        .chain(arguments.iter().map(|a| json::js_len(&a.0)))
        .max()
        .unwrap_or(0);

    let item = |term: &str, description: &str| format_item(term, term_width, description, help_width);

    let mut out: Vec<String> = vec![format!("Usage: {}", command_usage(chain)), String::new()];
    if !cmd.description.is_empty() {
        out.push(box_wrap(&cmd.description, help_width));
        out.push(String::new());
    }
    if !arguments.is_empty() {
        out.push("Arguments:".into());
        out.extend(arguments.iter().map(|(t, d)| item(t, d)));
        out.push(String::new());
    }
    if !options.is_empty() {
        out.push("Options:".into());
        out.extend(options.iter().map(|o| item(&o.flags, &o.description)));
        out.push(String::new());
    }
    if !commands.is_empty() {
        out.push("Commands:".into());
        out.extend(commands.iter().map(|c| item(&c.term, &c.description)));
        out.push(String::new());
    }
    out.join("\n")
}

fn pad_end(s: &str, width: usize) -> String {
    let len = json::js_len(s);
    let mut out = s.to_string();
    for _ in len..width {
        out.push(' ');
    }
    out
}

fn format_item(term: &str, term_width: usize, description: &str, help_width: usize) -> String {
    const INDENT: usize = 2;
    const SPACER: usize = 2;
    if description.is_empty() {
        return format!("  {term}");
    }
    let padded = pad_end(term, term_width);
    let remaining = help_width as i64 - term_width as i64 - SPACER as i64 - INDENT as i64;
    let preformatted = description.contains('\n')
        && description.split('\n').skip(1).any(|line| line.starts_with(|c: char| c.is_whitespace() && c != '\r'));
    let formatted = if remaining < 40 || preformatted {
        description.to_string()
    } else {
        box_wrap(description, remaining as usize).replace('\n', &format!("\n{}", " ".repeat(term_width + SPACER)))
    };
    format!("  {padded}  {}", formatted.replace('\n', "\n  "))
}

/// commander's `Help.boxWrap`: wrap at whitespace, keeping line breaks.
fn box_wrap(text: &str, width: usize) -> String {
    if width < 40 {
        return text.to_string();
    }
    let mut wrapped: Vec<String> = Vec::new();
    for line in text.split('\n') {
        let line = line.strip_suffix('\r').unwrap_or(line);
        let chunks = chunks(line);
        if chunks.is_empty() {
            wrapped.push(String::new());
            continue;
        }
        let mut current: Vec<String> = vec![chunks[0].clone()];
        let mut current_width = json::js_len(&chunks[0]);
        for chunk in &chunks[1..] {
            let w = json::js_len(chunk);
            if current_width + w <= width {
                current.push(chunk.clone());
                current_width += w;
                continue;
            }
            wrapped.push(current.concat());
            let next = chunk.trim_start().to_string();
            current_width = json::js_len(&next);
            current = vec![next];
        }
        wrapped.push(current.concat());
    }
    wrapped.join("\n")
}

/// `/[\s]*[^\s]+/g` matches.
fn chunks(line: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut current = String::new();
    let mut in_word = false;
    for c in line.chars() {
        if c.is_whitespace() {
            if in_word {
                out.push(std::mem::take(&mut current));
                in_word = false;
            }
            current.push(c);
        } else {
            in_word = true;
            current.push(c);
        }
    }
    if in_word {
        out.push(current);
    }
    out
}

/// The command tree for the CLI contract (`guesty __contract`).
pub fn contract(cmd: &Command, ancestors: &[&str]) -> Json {
    let full: Vec<&str> = ancestors.iter().copied().chain(std::iter::once(cmd.name.as_str())).collect();
    json::json!({
        "name": cmd.name,
        "path": full.join(" "),
        "syntax": std::iter::once(cmd.name.clone()).chain(cmd.args.iter().filter(|a| a.inline).map(Arg::human)).collect::<Vec<_>>().join(" "),
        "description": cmd.description,
        "aliases": cmd.aliases,
        "hasAction": cmd.action.is_some(),
        "hidden": cmd.hidden,
        "arguments": cmd.args.iter().map(|a| json::json!({
            "name": a.name, "syntax": a.human(), "required": a.required, "variadic": a.variadic,
            "description": a.description, "inline": a.inline,
        })).collect::<Vec<_>>(),
        "options": cmd.options.iter().map(|o| json::json!({
            "flags": o.flags,
            "description": o.description,
            "required": o.mandatory,
            "defaultValue": o.default.as_ref().map(Value::to_json),
            "choices": o.choices,
            "line": o.line,
        })).collect::<Vec<_>>(),
        "sourceFile": cmd.file,
        "line": cmd.line,
        "commands": cmd.commands.iter().map(|c| contract(c, &full)).collect::<Vec<_>>(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn suggestions_match_commander() {
        let names: Vec<String> =
            ["list", "search", "list-v3", "search-v3", "get"].iter().map(|s| s.to_string()).collect();
        assert_eq!(suggest_similar("lst", &names), "\n(Did you mean list?)");
        assert_eq!(suggest_similar("zzzzzz", &names), "");
    }

    #[test]
    fn wraps_like_commander() {
        assert_eq!(box_wrap("aaa bbb ccc", 40), "aaa bbb ccc");
        let long = "word ".repeat(20);
        let wrapped = box_wrap(long.trim_end(), 40);
        assert!(wrapped.lines().all(|l| l.len() <= 40));
    }
}
