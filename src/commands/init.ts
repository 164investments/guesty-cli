import { Command } from "commander";
import { createInterface } from "node:readline";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONFIG_DIR = join(homedir(), ".guesty-cli");
const ENV_FILE = join(CONFIG_DIR, ".env");

function prompt(question: string, mask = false): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    if (mask && process.stdin.isTTY) {
      process.stdout.write(question);
      let value = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      const onData = (ch: string) => {
        if (ch === "\r" || ch === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          rl.close();
          process.stdout.write("\n");
          resolve(value);
        } else if (ch === "\u0003") {
          process.exit(1);
        } else if (ch === "\u007F" || ch === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else {
          value += ch;
          process.stdout.write("*");
        }
      };

      process.stdin.on("data", onData);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function testCredentials(clientId: string, clientSecret: string): Promise<boolean> {
  try {
    const res = await fetch("https://open-api.guesty.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "open-api",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const init = new Command("init")
  .description("Set up Guesty CLI with your API credentials")
  .option("--force", "Overwrite existing configuration")
  .action(async (opts) => {
    process.stdout.write("\n  Guesty CLI Setup\n");
    process.stdout.write("  ================\n\n");

    if (existsSync(ENV_FILE) && !opts.force) {
      const existing = readFileSync(ENV_FILE, "utf8");
      if (existing.includes("GUESTY_CLIENT_ID")) {
        process.stdout.write("  Already configured. Run 'guesty init --force' to reconfigure.\n\n");
        return;
      }
    }

    process.stdout.write("  You'll need your Guesty Open API credentials.\n");
    process.stdout.write("  Get them from: Guesty Dashboard > Marketplace > Open API\n\n");

    const clientId = await prompt("  Client ID: ");
    if (!clientId) {
      process.stderr.write("\n  Error: Client ID is required.\n\n");
      process.exit(1);
    }

    const clientSecret = await prompt("  Client Secret: ", true);
    if (!clientSecret) {
      process.stderr.write("\n  Error: Client Secret is required.\n\n");
      process.exit(1);
    }

    process.stdout.write("\n  Verifying credentials...");

    const valid = await testCredentials(clientId, clientSecret);
    if (!valid) {
      process.stdout.write(" failed.\n\n");
      process.stderr.write("  Error: Invalid credentials. Check your Client ID and Secret.\n");
      process.stderr.write("  Note: This uses 1 of your 5 daily token requests for verification.\n\n");
      process.exit(1);
    }

    process.stdout.write(" verified.\n");

    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    const envContent = `GUESTY_CLIENT_ID=${clientId}\nGUESTY_CLIENT_SECRET=${clientSecret}\n`;
    writeFileSync(ENV_FILE, envContent);

    process.stdout.write(`\n  Configuration saved to ${ENV_FILE}\n`);
    process.stdout.write("  You're all set! Try: guesty res list --limit 1\n\n");
  });
