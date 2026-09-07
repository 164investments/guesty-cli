import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { Command, Option } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { collect, date, dateRange } from "./query-options.js";
import { ownerStatementParams } from "./owner-statement-options.js";

export const owners = new Command("owners")
  .description("Manage owners and ownerships");

owners
  .command("statements")
  .description("List owner statement metadata and PDF download URLs (valid for one hour)")
  .option("--owner <id>", "Filter by owner ID")
  .option("--listing <id>", "Filter by listing ID (repeat for multiple)", collect, [])
  .option("--business-model <id>", "Filter by business model ID (repeat for multiple)", collect, [])
  .addOption(new Option("--period-mode <mode>", "Period filter mode").choices(["month", "year", "monthRange", "yearRange", "fiscalYear", "fiscalYearRange"]))
  .option("--year <n>", "Period filter year")
  .option("--month <n>", "Period filter month")
  .option("--from-year <n>", "Period filter fromYear")
  .option("--from-month <n>", "Period filter fromMonth")
  .option("--to-year <n>", "Period filter toYear")
  .option("--to-month <n>", "Period filter toMonth")
  .option("--fiscal-year <n>", "Period filter fiscalYear")
  .option("--from-fiscal-year <n>", "Period filter fromFiscalYear")
  .option("--to-fiscal-year <n>", "Period filter toFiscalYear")
  .option("--updated-since <date-time>", "Incremental sync timestamp (ISO 8601 with timezone)")
  .option("--generated-from <date-time>", "Generation timestamp range start")
  .option("--generated-to <date-time>", "Generation timestamp range end")
  .addOption(new Option("--statement-type <type>", "Statement type").choices(["MONTHLY", "ANNUAL", "ANNUAL_SUMMARY", "ANNUAL_SUMMARY_BY_MONTH"]))
  .option("--status <status>", "Lifecycle status (repeat for multiple)", collect, [])
  .option("--shared-via <channel>", "Sharing channel (repeat for multiple)", collect, [])
  .option("--limit <n>", "Max results (1-100)", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    print(await guestyFetch("/v1/owner-statement-api/owner-statements", { params: ownerStatementParams(opts) }));
  });

owners
  .command("bulk-create")
  .description("Create multiple owners with assigned listings (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/owners/bulk", { method: "POST", body });
    print(data);
  });

owners
  .command("list")
  .description("List all owners")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/owners", {
      params: { limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });

owners
  .command("get <ownerId>")
  .description("Get a single owner")
  .action(async (ownerId: string) => {
    const data = await guestyFetch(`/v1/owners/${ownerId}`);
    print(data);
  });

owners
  .command("create")
  .description("Create an owner (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/owners", { method: "POST", body });
    print(data);
  });

owners
  .command("update <ownerId>")
  .description("Update an owner (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (ownerId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/owners/${ownerId}`, { method: "PUT", body });
    print(data);
  });

owners
  .command("delete <ownerId>")
  .description("Delete an owner")
  .action(async (ownerId: string) => {
    const data = await guestyFetch(`/v1/owners/${ownerId}`, { method: "DELETE" });
    print(data);
  });

owners
  .command("ownerships <listingId>")
  .description("Get ownerships for a listing")
  .action(async (listingId: string) => {
    const data = await guestyFetch(`/v1/owners/listings/${listingId}/ownerships`);
    print(data);
  });

owners
  .command("set-ownerships <listingId>")
  .description("Set ownerships for a listing (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (listingId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/owners/listings/${listingId}/ownerships`, { method: "PUT", body });
    print(data);
  });

owners
  .command("owner-ownerships <ownerId>")
  .description("Get listing ownerships for an owner")
  .action(async (ownerId: string) => {
    const data = await guestyFetch(`/v1/owners/${ownerId}/ownerships`);
    print(data);
  });

owners
  .command("reservations")
  .description("List owner reservations")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .action(async (opts) => {
    const data = await guestyFetch("/v1/owners-reservations", {
      params: { limit: parseInt(opts.limit), skip: parseInt(opts.skip) },
    });
    print(data);
  });

owners
  .command("reservation <id>")
  .description("Get an owner reservation by ID")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/owners-reservations/${id}`);
    print(data);
  });

owners
  .command("update-reservation <id>")
  .description("Update an owner reservation (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/owners-reservations/${id}`, {
      method: "PUT",
      body,
    });
    print(data);
  });

owners
  .command("create-guest <ownerId>")
  .description("Create a guest for an owner")
  .option("--data <json>", "JSON body")
  .action(async (ownerId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/owners/${ownerId}/guest`, { method: "POST", body });
    print(data);
  });

owners
  .command("list-documents <ownerId>")
  .description("List documents for an owner")
  .action(async (ownerId: string) => {
    const data = await guestyFetch(`/v1/owners/${ownerId}/documents`);
    print(data);
  });

owners
  .command("create-document <ownerId>")
  .description("Upload a PDF document for an owner (maximum 5 MB)")
  .requiredOption("--data-file <path>", "Path to the PDF document")
  .requiredOption("--name <name>", "Document name")
  .option("--description <text>", "Document description")
  .addOption(new Option("--type <type>", "Document type").choices(["DOCUMENT", "CONTRACT", "OWNER1099_COPYB", "OWNER1099_COPY2"]).default("DOCUMENT"))
  .option("--shared", "Make the document visible in the Owners Portal")
  .option("--start-date <date>", "Effective date (YYYY-MM-DD)")
  .option("--end-date <date>", "Expiration date (YYYY-MM-DD)")
  .action(async (ownerId: string, opts) => {
    if (opts.startDate) date(opts.startDate, "--start-date");
    if (opts.endDate) date(opts.endDate, "--end-date");
    dateRange(opts.startDate, opts.endDate, "--start-date", "--end-date");
    const bytes = readFileSync(opts.dataFile);
    if (bytes.length > 5 * 1024 * 1024) throw new Error("Owner documents must not exceed 5 MB.");
    const body = new FormData();
    body.append("file", new Blob([bytes], { type: "application/pdf" }), basename(opts.dataFile));
    body.append("name", opts.name);
    body.append("type", opts.type);
    body.append("isShared", String(Boolean(opts.shared)));
    if (opts.description !== undefined) body.append("description", opts.description);
    if (opts.startDate) body.append("startDate", opts.startDate);
    if (opts.endDate) body.append("endDate", opts.endDate);
    const data = await guestyFetch(`/v1/owners/${ownerId}/documents`, { method: "POST", body });
    print(data);
  });

owners
  .command("get-document <ownerId> <documentId>")
  .description("Get a document for an owner")
  .action(async (ownerId: string, documentId: string) => {
    const data = await guestyFetch(`/v1/owners/${ownerId}/documents/${documentId}`);
    print(data);
  });

owners
  .command("update-document <ownerId> <documentId>")
  .description("Update a document for an owner (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (ownerId: string, documentId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/owners/${ownerId}/documents/${documentId}`, { method: "PATCH", body });
    print(data);
  });

owners
  .command("delete-document <ownerId> <documentId>")
  .description("Delete a document for an owner")
  .action(async (ownerId: string, documentId: string) => {
    const data = await guestyFetch(`/v1/owners/${ownerId}/documents/${documentId}`, { method: "DELETE" });
    print(data);
  });

owners
  .command("download-document <ownerId> <documentId>")
  .description("Download a document for an owner")
  .option("--output <path>", "Write the downloaded document to a file")
  .action(async (ownerId: string, documentId: string, opts) => {
    const data = await guestyFetch<Buffer>(`/v1/owners/${ownerId}/documents/${documentId}/download`, {
      responseType: "buffer",
    });
    if (opts.output) {
      writeFileSync(opts.output, data);
      process.stderr.write(`Saved document to ${opts.output}\n`);
      return;
    }
    print(data);
  });
