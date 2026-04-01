import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const tasks = new Command("tasks")
  .description("Manage tasks");

tasks
  .command("list")
  .description("List tasks")
  .option("--status <status>", "Filter by status")
  .option("--listing <id>", "Filter by listing ID")
  .option("--columns <cols>", "Columns to return (space-separated)", "status title listingId assigneeId dueDate")
  .option("--limit <n>", "Max results (min 25)", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const params: Record<string, string | number> = {
      columns: opts.columns,
      limit: parseInt(opts.limit),
      skip: parseInt(opts.skip),
    };
    if (opts.status) params.status = opts.status;
    if (opts.listing) params.listingId = opts.listing;
    const data = await guestyFetch("/v1/tasks-open-api/tasks", { params });
    print(data);
  });

tasks
  .command("get <id>")
  .description("Get a single task")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/tasks-open-api/${id}`);
    print(data);
  });

tasks
  .command("create")
  .description("Create a task (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/tasks-open-api/create-single-task", {
      method: "POST",
      body,
    });
    print(data);
  });

tasks
  .command("update <id>")
  .description("Update a task (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/tasks-open-api/${id}`, {
      method: "PUT",
      body,
    });
    print(data);
  });

tasks
  .command("delete <id>")
  .description("Delete a task")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/tasks-open-api/${id}`, {
      method: "DELETE",
    });
    print(data);
  });
