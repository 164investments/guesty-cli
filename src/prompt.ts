import { createInterface } from "node:readline";
import { styleText } from "node:util";
import * as clack from "@clack/prompts";
import { printable } from "./output.js";

// A person at a terminal gets interactive prompts. Piped input (scripts and
// tests) gets plain prompts and is read one line per question. Both write to
// stderr, so stdout stays clean for results.
const output = process.stderr;
let pipedLines: AsyncIterator<string> | undefined;
let framed = false;

export function interactive(): boolean {
  return !!process.stdin.isTTY;
}

// Thrown after the interactive view has shown why a command stopped, so the
// CLI exits without printing the message again.
export class ShownError extends Error {}

function view() {
  return { output, withGuide: framed };
}

function answered<T>(value: T): Exclude<T, symbol> {
  if (clack.isCancel(value)) {
    clack.cancel("Stopped. Nothing was changed.", view());
    throw new ShownError("Stopped.");
  }
  return value as Exclude<T, symbol>;
}

async function readLine(question: string): Promise<string> {
  output.write(question);
  pipedLines ??= createInterface({ input: process.stdin, terminal: false })[Symbol.asyncIterator]();
  const next = await pipedLines.next();
  if (next.done) throw new Error("Setup needs an answer, but input ended.");
  output.write("\n");
  return next.value.trim();
}

function plain(message: string): void {
  output.write(`${message}\n`);
}

// Clack writes each line as given, so long messages are wrapped here to fit
// beside the frame's left bar.
function wrap(message: string, indent = ""): string {
  const width = Math.min(output.columns || 80, 88) - 4;
  const visible = (value: string) => value.replace(/\x1b\[[0-9;]*m/g, "").length;
  return message.split("\n").map((paragraph) => {
    const lines: string[] = [];
    let line = "";
    for (const word of paragraph.split(" ")) {
      if (line && visible(line) + 1 + visible(word) > width) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    lines.push(line);
    return lines.join(`\n${indent}`);
  }).join(`\n${indent}`);
}

// Highlights a command the person can run next.
export function command(value: string): string {
  return interactive() ? styleText("cyan", value) : value;
}

// Runs a command's steps inside one titled frame and shows a failure there,
// next to the step that failed.
export async function frame(title: string, run: () => Promise<void>): Promise<void> {
  if (!interactive()) return run();
  framed = true;
  clack.intro(`${styleText("bgCyan", styleText("black", " Guesty CLI "))}  ${title}`, view());
  try {
    await run();
  } catch (err) {
    if (err instanceof ShownError) throw err;
    const message = printable(err instanceof Error ? err.message : String(err));
    clack.cancel(wrap(message, "   "), view());
    throw new ShownError(message);
  } finally {
    framed = false;
  }
}

export function info(message: string): void {
  if (interactive()) clack.log.info(wrap(message), view());
  else plain(message);
}

export function success(message: string): void {
  if (interactive()) clack.log.success(wrap(message), view());
  else plain(message);
}

export function warn(message: string): void {
  if (interactive()) clack.log.warn(wrap(message), view());
  else plain(message);
}

export function done(message: string): void {
  if (interactive() && framed) clack.outro(wrap(message, "   "), view());
  else if (interactive()) clack.log.success(wrap(message), view());
  else plain(message);
}

// Rows of label and value, aligned in a box at a terminal.
export function summary(title: string, rows: [string, string][]): void {
  if (!interactive()) {
    plain(title);
    for (const [label, value] of rows) plain(`  ${label}: ${value}`);
    return;
  }
  const width = Math.max(...rows.map(([label]) => label.length));
  const body = rows.map(([label, value]) => `${styleText("dim", label.padEnd(width))}  ${value}`).join("\n");
  clack.note(body, title, view());
}

// Returns undefined when the answer is acceptable, or the reason it is not.
export type Check = (value: string) => string | undefined;

export function required(reason: string): Check {
  return (value) => value ? undefined : reason;
}

// Turns a parser that throws on bad input into a check that explains why.
export function parses(parse: (value: string) => unknown): Check {
  return (value) => {
    try {
      parse(value);
      return undefined;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  };
}

export async function text(message: string, options: { placeholder?: string; fallback?: string; check?: Check } = {}): Promise<string> {
  const settle = (value: string | undefined) => value?.trim() || options.fallback || "";
  if (!interactive()) {
    const answer = settle(await readLine(`${message}: `));
    const problem = options.check?.(answer);
    if (problem) throw new Error(problem);
    return answer;
  }
  return settle(answered(await clack.text({
    message,
    placeholder: options.placeholder,
    defaultValue: options.fallback,
    validate: options.check && ((value) => options.check!(settle(value))),
    ...view(),
  })));
}

export async function secret(message: string, check?: Check): Promise<string> {
  if (!interactive()) {
    const answer = await readLine(`${message}: `);
    const problem = check?.(answer);
    if (problem) throw new Error(problem);
    return answer;
  }
  return answered(await clack.password({
    message,
    validate: check && ((value) => check((value ?? "").trim())),
    ...view(),
  })).trim();
}

export async function confirm(message: string): Promise<boolean> {
  if (!interactive()) return /^y(es)?$/i.test(await readLine(`${message} (y/N) `));
  return answered(await clack.confirm({ message, initialValue: false, ...view() }));
}

export async function choose<T extends string>(message: string, options: { value: T; label: string; hint?: string }[]): Promise<T> {
  if (!interactive()) {
    plain(options.map((option, index) => `  ${index + 1}. ${option.label}`).join("\n"));
    const numbers = options.map((_, index) => String(index + 1));
    const listed = `${numbers.slice(0, -1).join(", ")} or ${numbers.at(-1)}`;
    const picked = options[Number(await readLine(`${message} Choose ${listed}: `)) - 1];
    if (!picked) throw new Error(`Setup stopped: choose ${listed}.`);
    return picked.value;
  }
  // Clack's option type is conditional on T, which a generic T cannot satisfy.
  return answered(await clack.select<T>({ message, options: options as clack.Option<T>[], ...view() }));
}

// Shows a spinner while the work runs, then what happened.
export async function task<T>(working: string, finished: (result: T) => string, failed: string, work: () => Promise<T>): Promise<T> {
  if (!interactive()) {
    plain(`${working}...`);
    return work();
  }
  const spinner = clack.spinner(view());
  spinner.start(working);
  try {
    const result = await work();
    spinner.stop(finished(result));
    return result;
  } catch (err) {
    spinner.error(failed);
    throw err;
  }
}
