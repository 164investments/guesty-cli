import { writeFileSync } from "node:fs";
import { Command } from "commander";
import { guestyFetch, paginateAll } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

function deprecated(name: string, replacement: string) {
  process.stderr.write(
    `\x1b[33m[deprecated]\x1b[0m "guesty res ${name}" uses the legacy v1 API. Use "guesty res ${replacement}" instead.\n`
  );
}

export const reservations = new Command("reservations")
  .alias("res")
  .description("Manage reservations");

// ─── list / search (v1 — no v3 equivalent) ─────────────────────────────────

reservations
  .command("list")
  .description("List reservations with optional filters")
  .option("--from <date>", "Check-in from date (YYYY-MM-DD)")
  .option("--to <date>", "Check-in to date (YYYY-MM-DD)")
  .option("--status <status>", "Filter by status (confirmed, canceled, inquiry, etc.)")
  .option("--listing <id>", "Filter by listing ID")
  .option("--guest <name>", "Filter by guest name")
  .option("--source <source>", "Filter by source (Airbnb, Booking.com, etc.)")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .option("--sort <field>", "Sort field", "checkIn")
  .option("--fields <fields>", "Comma-separated fields to return")
  .option("--all", "Fetch all pages (up to 10k)")
  .action(async (opts) => {
    const params: Record<string, string | number> = {
      limit: parseInt(opts.limit),
      skip: parseInt(opts.skip),
      sort: opts.sort,
    };
    if (opts.fields) params.fields = opts.fields;
    if (opts.status) params.status = opts.status;
    if (opts.listing) params.listingId = opts.listing;
    if (opts.source) params.source = opts.source;

    const filters: string[] = [];
    if (opts.from) filters.push(`checkIn>=${opts.from}`);
    if (opts.to) filters.push(`checkIn<=${opts.to}`);
    if (opts.guest) filters.push(`guestName=${opts.guest}`);
    if (filters.length > 0) params.filters = filters.join(",");

    if (opts.all) {
      const results = await paginateAll("/v1/reservations", params, "results");
      print(results);
    } else {
      const data = await guestyFetch("/v1/reservations", { params });
      print(data);
    }
  });

reservations
  .command("search <query>")
  .description("Search reservations by guest name or confirmation code")
  .option("--limit <n>", "Max results", "25")
  .action(async (query: string, opts) => {
    const data = await guestyFetch("/v1/reservations", {
      params: {
        q: query,
        limit: parseInt(opts.limit),
      },
    });
    print(data);
  });

// ─── get / create (v3) ──────────────────────────────────────────────────────

reservations
  .command("get <ids...>")
  .description("Retrieve reservations by ID (up to 10 IDs)")
  .option("--fields <fields>", "Comma-separated fields to return")
  .action(async (ids: string[], opts) => {
    const idParams: Record<string, string> = {};
    ids.forEach((id, i) => { idParams[`reservationIds[${i}]`] = id; });
    if (opts.fields) idParams.fields = opts.fields;
    const data = await guestyFetch("/v1/reservations-v3", { params: idParams });
    print(data);
  });

reservations
  .command("create")
  .description("Create reservation without quote (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/reservations-v3", {
      method: "POST",
      body,
    });
    print(data);
  });

reservations
  .command("create-from-quote")
  .description("Create reservation from quote (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/reservations-v3/quote", {
      method: "POST",
      body,
    });
    print(data);
  });

// ─── reservation actions (v3) ───────────────────────────────────────────────

reservations
  .command("approve <reservationId>")
  .description("Approve channel reservation")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/approve`, {
      method: "POST",
    });
    print(data);
  });

reservations
  .command("decline <reservationId>")
  .description("Decline channel reservation")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/decline`, {
      method: "POST",
    });
    print(data);
  });

reservations
  .command("pre-approve <reservationId>")
  .description("Pre-approve channel reservation")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/pre-approve`, {
      method: "POST",
    });
    print(data);
  });

reservations
  .command("request-cancellation <reservationId>")
  .description("Request cancellation for a reservation")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/request-cancellation`, {
      method: "POST",
    });
    print(data);
  });

reservations
  .command("mid-stay")
  .description("Create a mid-stay (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/reservations-v3/mid-stay", {
      method: "POST",
      body,
    });
    print(data);
  });

reservations
  .command("guest-stay")
  .description("Change guest stay status (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/reservations-v3/guest-stay", {
      method: "PUT",
      body,
    });
    print(data);
  });

// ─── reservation updates (v3) ───────────────────────────────────────────────

reservations
  .command("update-source <reservationId>")
  .description("Change reservation source (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (reservationId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/source`, {
      method: "PUT",
      body,
    });
    print(data);
  });

reservations
  .command("update-notes <reservationId>")
  .description("Update reservation notes (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (reservationId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/notes`, {
      method: "PUT",
      body,
    });
    print(data);
  });

reservations
  .command("update-dates <reservationId>")
  .description("Update reservation dates (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (reservationId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/dates`, {
      method: "PUT",
      body,
    });
    print(data);
  });

reservations
  .command("relocate <reservationId>")
  .description("Update reservation listing (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (reservationId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/relocate`, {
      method: "PUT",
      body,
    });
    print(data);
  });

reservations
  .command("update-status <reservationId>")
  .description("Update reservation status (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (reservationId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/status`, {
      method: "PUT",
      body,
    });
    print(data);
  });

reservations
  .command("update-confirmation-code <reservationId>")
  .description("Update confirmation code (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (reservationId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/confirmation-code`, {
      method: "PUT",
      body,
    });
    print(data);
  });

reservations
  .command("update-guests <reservationId>")
  .description("Update guests breakdown (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (reservationId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/guests`, {
      method: "PUT",
      body,
    });
    print(data);
  });

// ─── custom fields (v3) ─────────────────────────────────────────────────────

reservations
  .command("update-custom-fields <reservationId>")
  .description("Update custom fields (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (reservationId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/custom-fields`, {
      method: "PUT",
      body,
    });
    print(data);
  });

reservations
  .command("custom-fields <reservationId>")
  .description("Get custom fields for a reservation")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/custom-fields`);
    print(data);
  });

reservations
  .command("custom-field <reservationId> <fieldId>")
  .description("Get a specific custom field")
  .action(async (reservationId: string, fieldId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/custom-fields/${fieldId}`);
    print(data);
  });

reservations
  .command("delete-custom-field <reservationId> <fieldId>")
  .description("Delete a custom field")
  .action(async (reservationId: string, fieldId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/custom-fields/${fieldId}`, {
      method: "DELETE",
    });
    print(data);
  });

// ─── groups & owner reservations (v3) ───────────────────────────────────────

reservations
  .command("group-get <groupId>")
  .description("Get group reservation")
  .action(async (groupId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/group/${groupId}`);
    print(data);
  });

reservations
  .command("group-create")
  .description("Create a group reservation (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/reservations-v3/group", {
      method: "POST",
      body,
    });
    print(data);
  });

reservations
  .command("owner-reservation")
  .description("Create confirmed owner reservation (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/reservations-v3/owner/confirmed", {
      method: "POST",
      body,
    });
    print(data);
  });

// ─── payments & invoices (v1 — no v3 equivalent) ───────────────────────────

reservations
  .command("balance <id>")
  .description("Get the folio/balance for a reservation")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/accounting-api/reservations/${id}/balance`);
    print(data);
  });

reservations
  .command("add-payment <id>")
  .description("Add a payment to a reservation (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations/${id}/payments`, {
      method: "POST",
      body,
    });
    print(data);
  });

reservations
  .command("update-payment <id> <paymentId>")
  .description("Update or cancel a payment on a reservation (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, paymentId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations/${id}/payments/${paymentId}`, {
      method: "PUT",
      body,
    });
    print(data);
  });

reservations
  .command("refund-payment <id> <paymentId>")
  .description("Refund a payment on a reservation (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, paymentId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations/${id}/payments/${paymentId}/refund`, {
      method: "POST",
      body,
    });
    print(data);
  });

reservations
  .command("cancel-payment <id> <paymentId>")
  .description("Cancel a pending or recorded payment (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, paymentId: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations/${id}/payments/${paymentId}/cancel`, {
      method: "PATCH",
      body,
    });
    print(data);
  });

reservations
  .command("add-invoice-item <id>")
  .description("Create an invoice item on a reservation (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations/${id}/invoiceItems`, {
      method: "POST",
      body,
    });
    print(data);
  });

// ─── update (v1 — use granular v3 updates instead) ─────────────────────────

reservations
  .command("update <id>")
  .description("Update a reservation (pass JSON body via stdin or --data)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations/${id}`, {
      method: "PUT",
      body,
    });
    print(data);
  });

// ─── export / report ────────────────────────────────────────────────────────

reservations
  .command("export-csv")
  .description("Export reservations as CSV (--data or stdin)")
  .option("--data <json>", "JSON body")
  .option("--output <path>", "Write CSV output to a file")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch<string>("/v1/reservations.csv", {
      method: "POST",
      body,
      responseType: "text",
    });
    if (opts.output) {
      writeFileSync(opts.output, data);
      process.stderr.write(`Saved CSV to ${opts.output}\n`);
      return;
    }
    print(data);
  });

reservations
  .command("export-email")
  .description("Send reservations results in email (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/reservations.email", {
      method: "POST",
      body,
    });
    print(data);
  });

reservations
  .command("report <viewId>")
  .description("Get reservations report by view ID")
  .action(async (viewId: string) => {
    const data = await guestyFetch(`/v1/reservations-reports/${viewId}`);
    print(data);
  });

// ─── airbnb-specific ────────────────────────────────────────────────────────

reservations
  .command("airbnb-pre-approve <reservationId>")
  .description("Pre-approve inquiry for Airbnb")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/reservations-api/reservations/${reservationId}/pre-approve`, {
      method: "POST",
    });
    print(data);
  });

reservations
  .command("request-cancellation-sync <id>")
  .description("Request Airbnb reservation cancellation sync")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/reservations/${id}/request-cancellation-sync`, {
      method: "POST",
    });
    print(data);
  });

// ─── legacy v1 commands (deprecated) ────────────────────────────────────────

reservations
  .command("legacy-get <id>")
  .description("[deprecated] Get reservation via v1 API — use 'get' instead")
  .option("--fields <fields>", "Comma-separated fields to return")
  .action(async (id: string, opts) => {
    deprecated("legacy-get", "get");
    const params: Record<string, string> = {};
    if (opts.fields) params.fields = opts.fields;
    const data = await guestyFetch(`/v1/reservations/${id}`, { params });
    print(data);
  });

reservations
  .command("legacy-create")
  .description("[deprecated] Create reservation via v1 API — use 'create' instead")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    deprecated("legacy-create", "create");
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/reservations", {
      method: "POST",
      body,
    });
    print(data);
  });

reservations
  .command("legacy-approve <id>")
  .description("[deprecated] Approve via v1 API — use 'approve' instead")
  .action(async (id: string) => {
    deprecated("legacy-approve", "approve");
    const data = await guestyFetch(`/v1/reservations/${id}/approve`, {
      method: "POST",
    });
    print(data);
  });

reservations
  .command("legacy-decline <id>")
  .description("[deprecated] Decline via v1 API — use 'decline' instead")
  .action(async (id: string) => {
    deprecated("legacy-decline", "decline");
    const data = await guestyFetch(`/v1/reservations/${id}/decline`, {
      method: "POST",
    });
    print(data);
  });

reservations
  .command("legacy-custom-fields <id>")
  .description("[deprecated] Get custom fields via v1 API — use 'custom-fields' instead")
  .action(async (id: string) => {
    deprecated("legacy-custom-fields", "custom-fields");
    const data = await guestyFetch(`/v1/reservations/${id}/custom-fields`);
    print(data);
  });

reservations
  .command("legacy-set-custom-fields <id>")
  .description("[deprecated] Update custom fields via v1 API — use 'update-custom-fields' instead")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    deprecated("legacy-set-custom-fields", "update-custom-fields");
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations/${id}/custom-fields`, {
      method: "PUT",
      body,
    });
    print(data);
  });

reservations
  .command("legacy-custom-field <id> <fieldId>")
  .description("[deprecated] Get single custom field via v1 API — use 'custom-field' instead")
  .action(async (id: string, fieldId: string) => {
    deprecated("legacy-custom-field", "custom-field");
    const data = await guestyFetch(`/v1/reservations/${id}/custom-fields/${fieldId}`);
    print(data);
  });

reservations
  .command("legacy-delete-custom-field <id> <fieldId>")
  .description("[deprecated] Delete custom field via v1 API — use 'delete-custom-field' instead")
  .action(async (id: string, fieldId: string) => {
    deprecated("legacy-delete-custom-field", "delete-custom-field");
    const data = await guestyFetch(`/v1/reservations/${id}/custom-fields/${fieldId}`, {
      method: "DELETE",
    });
    print(data);
  });
