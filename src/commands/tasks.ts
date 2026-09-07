import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { fields, integer, jsonObject } from "./query-options.js";

export const tasks = new Command("tasks")
  .description("Manage tasks");

tasks
  .command("list")
  .description("List tasks")
  .option("--status <status>", "Filter by status")
  .option("--listing <id>", "Unsupported shorthand; use the API's --filters object")
  .option("--filters <json>", "JSON object of task report filters")
  .option("--columns <cols>", "Columns to return (space- or comma-separated)", "id status taskTitle listing assignee scheduledFor")
  .option("--limit <n>", "Max results (minimum 25)", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    if (opts.listing !== undefined) throw new Error("Guesty's tasks API does not document a --listing shorthand. Use --filters with the task report's filter fields instead.");
    const params: Record<string, string | number> = {
      columns: fields(opts.columns),
      limit: integer(opts.limit, "--limit", 25),
      skip: integer(opts.skip, "--skip"),
    };
    const filters = opts.filters ? jsonObject(opts.filters, "--filters") : {};
    if (opts.status) filters.status = { "@in": [opts.status] };
    if (Object.keys(filters).length) params.filters = JSON.stringify(filters);
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
