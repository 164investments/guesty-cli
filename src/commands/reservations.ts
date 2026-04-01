import { Command } from "commander";
import { guestyFetch, paginateAll } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";

export const reservations = new Command("reservations")
  .alias("res")
  .description("Manage reservations");

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
  .command("get <id>")
  .description("Get a single reservation by ID")
  .option("--fields <fields>", "Comma-separated fields to return")
  .action(async (id: string, opts) => {
    const params: Record<string, string> = {};
    if (opts.fields) params.fields = opts.fields;
    const data = await guestyFetch(`/v1/reservations/${id}`, { params });
    print(data);
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

reservations
  .command("create")
  .description("Create a reservation (pass JSON body via stdin or --data)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
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
  .command("approve <id>")
  .description("Approve a pending booking request")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/reservations/${id}/approve`, {
      method: "POST",
    });
    print(data);
  });

reservations
  .command("decline <id>")
  .description("Decline a pending booking request")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/reservations/${id}/decline`, {
      method: "POST",
    });
    print(data);
  });

reservations
  .command("custom-fields <id>")
  .description("Get custom fields for a reservation")
  .action(async (id: string) => {
    const data = await guestyFetch(`/v1/reservations/${id}/custom-fields`);
    print(data);
  });

reservations
  .command("set-custom-fields <id>")
  .description("Update reservation custom fields (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (id: string, opts) => {
    const body = opts.data ? JSON.parse(opts.data) : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations/${id}/custom-fields`, {
      method: "PUT",
      body,
    });
    print(data);
  });

reservations
  .command("custom-field <id> <fieldId>")
  .description("Get a single reservation custom field")
  .action(async (id: string, fieldId: string) => {
    const data = await guestyFetch(`/v1/reservations/${id}/custom-fields/${fieldId}`);
    print(data);
  });

reservations
  .command("delete-custom-field <id> <fieldId>")
  .description("Delete a reservation custom field")
  .action(async (id: string, fieldId: string) => {
    const data = await guestyFetch(`/v1/reservations/${id}/custom-fields/${fieldId}`, {
      method: "DELETE",
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

// ─── reservations-v3 endpoints ───────────────────────────────────────────────

reservations
  .command("v3-list")
  .description("Retrieve reservations (v3)")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .option("--fields <fields>", "Comma-separated fields to return")
  .option("--sort <field>", "Sort field")
  .option("--filters <filters>", "Comma-separated filters")
  .action(async (opts) => {
    const params: Record<string, string | number> = {
      limit: parseInt(opts.limit),
      skip: parseInt(opts.skip),
    };
    if (opts.fields) params.fields = opts.fields;
    if (opts.sort) params.sort = opts.sort;
    if (opts.filters) params.filters = opts.filters;
    const data = await guestyFetch("/v1/reservations-v3", { params });
    print(data);
  });

reservations
  .command("v3-create")
  .description("Create reservation without quote (v3, --data or stdin)")
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
  .command("v3-create-from-quote")
  .description("Create reservation from quote (v3, --data or stdin)")
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

reservations
  .command("v3-group-get <groupId>")
  .description("Get group reservation (v3)")
  .action(async (groupId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/group/${groupId}`);
    print(data);
  });

reservations
  .command("v3-group-create")
  .description("Create a group reservation (v3, --data or stdin)")
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
  .command("v3-owner-reservation")
  .description("Create confirmed owner reservation (v3, --data or stdin)")
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

reservations
  .command("v3-guest-stay")
  .description("Change guest stay status (v3, --data or stdin)")
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

reservations
  .command("v3-update-source <reservationId>")
  .description("Change reservation source (v3, --data or stdin)")
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
  .command("v3-update-notes <reservationId>")
  .description("Update reservation notes (v3, --data or stdin)")
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
  .command("v3-update-dates <reservationId>")
  .description("Update reservation dates (v3, --data or stdin)")
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
  .command("v3-relocate <reservationId>")
  .description("Update reservation listing (v3, --data or stdin)")
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
  .command("v3-update-status <reservationId>")
  .description("Update reservation status (v3, --data or stdin)")
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
  .command("v3-update-confirmation-code <reservationId>")
  .description("Update confirmation code (v3, --data or stdin)")
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
  .command("v3-update-guests <reservationId>")
  .description("Update guests breakdown (v3, --data or stdin)")
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

reservations
  .command("v3-update-custom-fields <reservationId>")
  .description("Update custom fields (v3, --data or stdin)")
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
  .command("v3-custom-fields <reservationId>")
  .description("Get custom fields for a reservation (v3)")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/custom-fields`);
    print(data);
  });

reservations
  .command("v3-custom-field <reservationId> <fieldId>")
  .description("Get a specific custom field (v3)")
  .action(async (reservationId: string, fieldId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/custom-fields/${fieldId}`);
    print(data);
  });

reservations
  .command("v3-delete-custom-field <reservationId> <fieldId>")
  .description("Delete a custom field (v3)")
  .action(async (reservationId: string, fieldId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/custom-fields/${fieldId}`, {
      method: "DELETE",
    });
    print(data);
  });

reservations
  .command("v3-mid-stay")
  .description("Create a mid-stay (v3, --data or stdin)")
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
  .command("v3-approve <reservationId>")
  .description("Approve channel reservation (v3)")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/approve`, {
      method: "POST",
    });
    print(data);
  });

reservations
  .command("v3-decline <reservationId>")
  .description("Decline channel reservation (v3)")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/decline`, {
      method: "POST",
    });
    print(data);
  });

reservations
  .command("v3-pre-approve <reservationId>")
  .description("Pre-approve channel reservation (v3)")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/pre-approve`, {
      method: "POST",
    });
    print(data);
  });

reservations
  .command("v3-request-cancellation <reservationId>")
  .description("Request cancellation for a reservation (v3)")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/request-cancellation`, {
      method: "POST",
    });
    print(data);
  });

// ─── reservations-api endpoints ──────────────────────────────────────────────

reservations
  .command("airbnb-pre-approve <reservationId>")
  .description("Pre-approve inquiry for Airbnb")
  .action(async (reservationId: string) => {
    const data = await guestyFetch(`/v1/reservations-api/reservations/${reservationId}/pre-approve`, {
      method: "POST",
    });
    print(data);
  });

// ─── export / report endpoints ───────────────────────────────────────────────

reservations
  .command("export-csv")
  .description("Export reservations as CSV (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch("/v1/reservations.csv", {
      method: "POST",
      body,
    });
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
