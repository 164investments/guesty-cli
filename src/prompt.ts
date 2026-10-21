import { createInterface } from "node:readline";
import { Writable } from "node:stream";

let pipedLines: AsyncIterator<string> | undefined;

// Prompts go to stderr so stdout stays clean for results. Piped input (scripts
// and tests) is read one line per question.
export async function ask(question: string, options: { hidden?: boolean; fallback?: string } = {}): Promise<string> {
  process.stderr.write(question);
  let answer: string;
  if (!process.stdin.isTTY) {
    pipedLines ??= createInterface({ input: process.stdin, terminal: false })[Symbol.asyncIterator]();
    const next = await pipedLines.next();
    if (next.done) throw new Error("Setup needs an answer, but input ended.");
    answer = next.value;
    process.stderr.write("\n");
  } else {
    let muted = false;
    // Readline echoes what is typed through this stream; muting it hides secrets.
    const output = new Writable({
      write(chunk, encoding, done) {
        if (!muted) process.stderr.write(chunk, encoding);
        done();
      },
    });
    const terminal = createInterface({ input: process.stdin, output, terminal: true });
    muted = !!options.hidden;
    answer = await new Promise<string>((resolve) => terminal.question("", resolve));
    terminal.close();
    if (options.hidden) process.stderr.write("\n");
  }
  answer = answer.trim();
  return answer || options.fallback || "";
}

export async function askRequired(question: string, options: { hidden?: boolean } = {}): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const answer = await ask(question, options);
    if (answer) return answer;
  }
  throw new Error("Setup stopped: no answer was given.");
}

export async function confirm(question: string): Promise<boolean> {
  return /^y(es)?$/i.test(await ask(`${question} (y/N) `));
}
