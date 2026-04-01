import { Command } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const icalendar = new Command("icalendar")
  .alias("ical")
  .description("Manage iCalendar exported and imported calendars");

// --- Exported calendars ---

icalendar
  .command("list-exported")
  .description("List exported calendars")
  .requiredOption("--listing <id>", "Listing ID")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/icalendar-api/exported-calendars", {
      params: { listingId: opts.listing },
    });
    print(data);
  });

icalendar
  .command("get-exported <id>")
  .description("Get an exported calendar by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/icalendar-api/exported-calendars/${id}`);
    print(data);
  });

icalendar
  .command("create-exported")
  .description("Create an exported calendar (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/icalendar-api/exported-calendars", { method: "POST", body });
    print(data);
  });

icalendar
  .command("update-exported <id>")
  .description("Update an exported calendar (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/icalendar-api/exported-calendars/${id}`, { method: "PUT", body });
    print(data);
  });

icalendar
  .command("delete-exported <id>")
  .description("Delete an exported calendar")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/icalendar-api/exported-calendars/${id}`, { method: "DELETE" });
    print(data);
  });

// --- Imported calendars ---

icalendar
  .command("list-imported")
  .description("List imported calendars")
  .requiredOption("--listing <id>", "Listing ID")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/icalendar-api/imported-calendars", {
      params: { listingId: opts.listing },
    });
    print(data);
  });

icalendar
  .command("get-imported <id>")
  .description("Get an imported calendar by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/icalendar-api/imported-calendars/${id}`);
    print(data);
  });

icalendar
  .command("import")
  .description("Import a calendar (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/icalendar-api/imported-calendars", { method: "POST", body });
    print(data);
  });

icalendar
  .command("update-imported <id>")
  .description("Update an imported calendar (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/icalendar-api/imported-calendars/${id}`, { method: "PUT", body });
    print(data);
  });

icalendar
  .command("delete-imported <id>")
  .description("Delete an imported calendar")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/icalendar-api/imported-calendars/${id}`, { method: "DELETE" });
    print(data);
  });

icalendar
  .command("pause <id>")
  .description("Pause an imported calendar")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/icalendar-api/imported-calendars/${id}/pause`, { method: "POST" });
    print(data);
  });

icalendar
  .command("resume <id>")
  .description("Resume an imported calendar")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/icalendar-api/imported-calendars/${id}/resume`, { method: "POST" });
    print(data);
  });
