import { writeFileSync } from "node:fs";
import { Command, Option } from "commander";
import { guestyFetch, paginateAll } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { date, dateRange, dateTime, fields, integer, jsonObject } from "./query-options.js";

async function readObject(data?: string): Promise<Record<string, unknown>> {
  return jsonObject(data ?? await readStdin(), "--data or stdin");
}

function financialParams(opts: { mergeAccommodationFarePriceComponents?: boolean }): Record<string, boolean> {
  return opts.mergeAccommodationFarePriceComponents === undefined
    ? {}
    : { mergeAccommodationFarePriceComponents: opts.mergeAccommodationFarePriceComponents };
}

function validateComment(body: Record<string, unknown>): void {
  if (typeof body.body !== "string" || [...body.body].length < 1 || [...body.body].length > 4095) {
    throw new Error("Comment body must be a string between 1 and 4095 characters.");
  }
  if (body.mentions !== undefined && (!Array.isArray(body.mentions) ||
    body.mentions.some((id) => typeof id !== "string" || !id.trim()))) {
    throw new Error("Comment mentions must be an array of user ID strings.");
  }
  if (body.parentCommentId !== undefined &&
    (typeof body.parentCommentId !== "string" || !body.parentCommentId.trim())) {
    throw new Error("parentCommentId must be a non-empty comment ID string.");
  }
}

function deprecated(name: string, replacement: string) {
  process.stderr.write(
    `\x1b[33m[deprecated]\x1b[0m "guesty res ${name}" uses the legacy v1 API. Use "guesty res ${replacement}" instead.\n`
  );
}

export const reservations = new Command("reservations")
  .alias("res")
  .description("Manage reservations");

// ─── legacy list / search (v1 response shape) ──────────────────────────────

reservations
  .command("list")
  .description("List reservations with legacy v1 fields and filters; use list-v3 for the current API")
  .option("--from <date>", "Check-in from date (YYYY-MM-DD)")
  .option("--to <date>", "Check-in to date (YYYY-MM-DD)")
  .option("--status <status>", "Filter by status (confirmed, canceled, inquiry, etc.)")
  .option("--listing <id>", "Filter by listing ID")
  .option("--guest <name>", "Filter by exact guest full name")
  .option("--source <source>", "Filter by source (Airbnb, Booking.com, etc.)")
  .option("--limit <n>", "Max results", "25")
  .option("--skip <n>", "Offset", "0")
  .option("--sort <field>", "Sort field", "checkIn")
  .option("--fields <fields>", "Comma-separated fields to return")
  .option("--all", "Fetch all pages (up to 10k)")
  .action(async (opts) => {
    dateRange(opts.from, opts.to);
    if (opts.from) date(opts.from, "--from");
    if (opts.to) date(opts.to, "--to");
    const params: Record<string, string | number> = {
      limit: integer(opts.limit, "--limit", 1, 100),
      skip: integer(opts.skip, "--skip"),
      sort: opts.sort,
    };
    if (opts.fields) params.fields = fields(opts.fields);
    const filters: Record<string, unknown>[] = [];
    if (opts.status) filters.push({ field: "status", operator: "$eq", value: opts.status });
    if (opts.listing) filters.push({ field: "listingId", operator: "$eq", value: opts.listing });
    if (opts.source) filters.push({ field: "source", operator: "$eq", value: opts.source });
    if (opts.from) filters.push({ field: "checkInDateLocalized", operator: "$gte", value: opts.from });
    if (opts.to) filters.push({ field: "checkInDateLocalized", operator: "$lte", value: opts.to });
    if (opts.guest) filters.push({ field: "guest.fullName", operator: "$eq", value: opts.guest });
    if (filters.length > 0) params.filters = JSON.stringify(filters);
    deprecated("list", "list-v3");

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
  .description("Search the legacy API by exact confirmation code (or exact name with --guest-name)")
  .option("--guest-name", "Treat the query as an exact guest full name")
  .option("--limit <n>", "Max results", "25")
  .action(async (query: string, opts) => {
    if (!query.trim()) throw new Error("Search query must be a non-empty confirmation code or guest name.");
    const data = await guestyFetch("/v1/reservations", {
      params: {
        filters: JSON.stringify([{ field: opts.guestName ? "guest.fullName" : "confirmationCode", operator: "$eq", value: query }]),
        limit: integer(opts.limit, "--limit", 1, 100),
      },
    });
    print(data);
  });

// ─── filtered search (v3) ──────────────────────────────────────────────────

reservations
  .command("list-v3")
  .alias("search-v3")
  .description("Search reservations using the current v3 API and its response shape")
  .option("--from <date>", "Check-in on/after localized date (YYYY-MM-DD)")
  .option("--to <date>", "Check-in on/before localized date (YYYY-MM-DD)")
  .option("--check-out-from <date>", "Check-out on/after localized date (YYYY-MM-DD)")
  .option("--check-out-to <date>", "Check-out on/before localized date (YYYY-MM-DD)")
  .option("--created-from <timestamp>", "Created on/after ISO datetime with timezone")
  .option("--created-before <timestamp>", "Created strictly before ISO datetime with timezone")
  .option("--status <statuses>", "Status or comma-separated statuses")
  .option("--exclude-status <status>", "Exclude a status")
  .option("--listing <ids>", "Listing ID or comma-separated IDs")
  .option("--confirmation-code <codes>", "Confirmation code or comma-separated codes")
  .option("--source <sources>", "Source or comma-separated sources")
  .option("--limit <n>", "Page size (1-100)", "25")
  .option("--skip <n>", "Initial offset", "0")
  .addOption(new Option("--sort <field>", "Sort field; prefix with - for descending")
    .choices(["_id", "-_id", "checkIn", "-checkIn", "checkOut", "-checkOut", "createdAt", "-createdAt"])
    .default("-_id"))
  .option("--all", "Fetch all pages from --skip (up to 10k)")
  .action(async (opts) => {
    const params: Record<string, string | number> = {
      limit: integer(opts.limit, "--limit", 1, 100),
      skip: integer(opts.skip, "--skip"),
      sort: opts.sort,
    };
    dateRange(opts.from, opts.to);
    dateRange(opts.checkOutFrom, opts.checkOutTo, "--check-out-from", "--check-out-to");
    dateRange(opts.createdFrom, opts.createdBefore, "--created-from", "--created-before");
    if (opts.from) params["filter[checkIn][gte]"] = date(opts.from, "--from");
    if (opts.to) params["filter[checkIn][lte]"] = date(opts.to, "--to");
    if (opts.checkOutFrom) params["filter[checkOut][gte]"] = date(opts.checkOutFrom, "--check-out-from");
    if (opts.checkOutTo) params["filter[checkOut][lte]"] = date(opts.checkOutTo, "--check-out-to");
    if (opts.createdFrom) params["filter[createdAt][gte]"] = dateTime(opts.createdFrom, "--created-from");
    if (opts.createdBefore) params["filter[createdAt][lt]"] = dateTime(opts.createdBefore, "--created-before");
    if (opts.status) params["filter[status]"] = opts.status;
    if (opts.excludeStatus) params["filter[status][ne]"] = opts.excludeStatus;
    if (opts.listing) params["filter[listingId]"] = opts.listing;
    if (opts.confirmationCode) params["filter[confirmationCode]"] = opts.confirmationCode;
    if (opts.source) params["filter[source]"] = opts.source;
    print(opts.all
      ? await paginateAll("/v1/reservations-v3/search", params, "results")
      : await guestyFetch("/v1/reservations-v3/search", { params }));
  });

// ─── get / create (v3) ──────────────────────────────────────────────────────

reservations
  .command("get <ids...>")
  .description("Retrieve reservations by ID (up to 10 IDs)")
  .option("--fields <fields>", "Unsupported by v3; use legacy-get --fields for API field selection")
  .option("--include-payments-template", "Include payment schedule template information")
  .option("--no-include-payments-template", "Exclude payment schedule template information")
  .option("--merge-inclusive-taxes", "Merge inclusive taxes into their line items")
  .option("--no-merge-inclusive-taxes", "Return inclusive taxes separately")
  .option("--merge-accommodation-fare-price-components", "Merge markups, extra-person fees, and discounts into accommodation fare")
  .option("--no-merge-accommodation-fare-price-components", "Return accommodation fare components separately")
  .action(async (ids: string[], opts) => {
    if (opts.fields !== undefined) {
      throw new Error("The v3 get API ignores --fields. Use guesty res legacy-get <id> --fields <fields> for API field selection, or pipe guesty res get <id> to jq for local selection.");
    }
    if (ids.length > 10) throw new Error("The reservations v3 API accepts at most 10 reservation IDs per request.");
    const idParams: Record<string, string | boolean> = financialParams(opts);
    ids.forEach((id, i) => { idParams[`reservationIds[${i}]`] = id; });
    if (opts.includePaymentsTemplate !== undefined) idParams.includePaymentsTemplate = opts.includePaymentsTemplate;
    if (opts.mergeInclusiveTaxes !== undefined) idParams.mergeInclusiveTaxes = opts.mergeInclusiveTaxes;
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
  .description("Decline channel reservation with reason/message (--data or stdin)")
  .option("--data <json>", "JSON body with reason and messageToGuest")
  .action(async (reservationId: string, opts) => {
    const input = opts.data ?? (process.stdin.isTTY ? "" : await readStdin());
    const body = opts.data !== undefined || input.trim() ? jsonObject(input, "--data or stdin") : undefined;
    if (body) {
      for (const key of ["reason", "messageToGuest"]) {
        if (body[key] !== undefined && typeof body[key] !== "string") {
          throw new Error(`${key} must be a string.`);
        }
      }
    }
    const data = await guestyFetch(`/v1/reservations-v3/${encodeURIComponent(reservationId)}/decline`, {
      method: "POST",
      body,
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
  .description("Request cancellation with required channel reason and messages (--data or stdin)")
  .option("--data <json>", "JSON body with reason, subReason, messageToChannel, and messageToGuest")
  .action(async (reservationId: string, opts) => {
    const body = await readObject(opts.data);
    for (const key of ["reason", "subReason", "messageToChannel", "messageToGuest"]) {
      if (typeof body[key] !== "string" || !(body[key] as string).trim()) {
        throw new Error(`Cancellation requires a non-empty ${key} string.`);
      }
    }
    const data = await guestyFetch(`/v1/reservations-v3/${encodeURIComponent(reservationId)}/request-cancellation`, {
      method: "POST",
      body,
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
  .option("--merge-accommodation-fare-price-components", "Merge markups, extra-person fees, and discounts into accommodation fare")
  .option("--no-merge-accommodation-fare-price-components", "Return accommodation fare components separately")
  .action(async (reservationId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/source`, {
      method: "PUT",
      body,
      params: financialParams(opts),
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
  .description("Update localized dates/times; date changes recalculate financials (--data or stdin)")
  .option("--data <json>", "JSON with checkInDateLocalized/checkOutDateLocalized and/or plannedArrival/plannedDeparture")
  .option("--merge-accommodation-fare-price-components", "Merge markups, extra-person fees, and discounts into accommodation fare")
  .option("--no-merge-accommodation-fare-price-components", "Return accommodation fare components separately")
  .action(async (reservationId: string, opts) => {
    const body = await readObject(opts.data);
    if ("checkIn" in body || "checkOut" in body) {
      throw new Error("Use checkInDateLocalized/checkOutDateLocalized (YYYY-MM-DD), and plannedArrival/plannedDeparture (HH:mm), instead of checkIn/checkOut.");
    }
    for (const key of ["checkInDateLocalized", "checkOutDateLocalized"]) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== "string") throw new Error(`${key} must be a YYYY-MM-DD string.`);
        date(body[key] as string, key);
      }
    }
    const checkIn = body.checkInDateLocalized as string | undefined;
    const checkOut = body.checkOutDateLocalized as string | undefined;
    dateRange(checkIn, checkOut, "checkInDateLocalized", "checkOutDateLocalized");
    if (checkIn !== undefined && checkIn === checkOut) {
      throw new Error("checkOutDateLocalized must be after checkInDateLocalized.");
    }
    for (const key of ["plannedArrival", "plannedDeparture"]) {
      if (body[key] !== undefined && (typeof body[key] !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(body[key] as string))) {
        throw new Error(`${key} must be a valid time in HH:mm format.`);
      }
    }
    const data = await guestyFetch(`/v1/reservations-v3/${encodeURIComponent(reservationId)}/dates`, {
      method: "PUT",
      body,
      params: financialParams(opts),
    });
    print(data);
  });

reservations
  .command("relocate <reservationId>")
  .description("Update reservation listing (--data or stdin)")
  .option("--data <json>", "JSON body")
  .option("--merge-accommodation-fare-price-components", "Merge markups, extra-person fees, and discounts into accommodation fare")
  .option("--no-merge-accommodation-fare-price-components", "Return accommodation fare components separately")
  .action(async (reservationId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/relocate`, {
      method: "PUT",
      body,
      params: financialParams(opts),
    });
    print(data);
  });

reservations
  .command("update-booking-date <reservationId>")
  .description("Update the real-world booking date (--data or stdin)")
  .option("--data <json>", "JSON body with bookingDate (ISO datetime with timezone)")
  .action(async (reservationId: string, opts) => {
    const body = await readObject(opts.data);
    if (typeof body.bookingDate !== "string") {
      throw new Error("bookingDate is required and must be an ISO datetime with timezone.");
    }
    dateTime(body.bookingDate, "bookingDate");
    const data = await guestyFetch(`/v1/reservations-v3/${encodeURIComponent(reservationId)}/booking-date`, {
      method: "PUT",
      body,
    });
    print(data);
  });

reservations
  .command("update-travel-information <reservationId>")
  .description("Update transportation, reason for visit, or agent booking (--data or stdin)")
  .option("--data <json>", "JSON body")
  .action(async (reservationId: string, opts) => {
    const body = await readObject(opts.data);
    if (body.reasonForVisit !== undefined && !["business", "leisure", "family", "event", "other"].includes(body.reasonForVisit as string)) {
      throw new Error("reasonForVisit must be business, leisure, family, event, or other.");
    }
    if (body.agentBooking !== undefined && typeof body.agentBooking !== "boolean") {
      throw new Error("agentBooking must be a boolean.");
    }
    if (body.transportation !== undefined && (body.transportation === null || typeof body.transportation !== "object" || Array.isArray(body.transportation))) {
      throw new Error("transportation must be a JSON object.");
    }
    const data = await guestyFetch(`/v1/reservations-v3/${encodeURIComponent(reservationId)}/travel-information`, {
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
  .option("--merge-accommodation-fare-price-components", "Merge markups, extra-person fees, and discounts into accommodation fare")
  .option("--no-merge-accommodation-fare-price-components", "Return accommodation fare components separately")
  .action(async (reservationId: string, opts) => {
    const body = opts.data
      ? JSON.parse(opts.data)
      : JSON.parse(await readStdin());
    const data = await guestyFetch(`/v1/reservations-v3/${reservationId}/guests`, {
      method: "PUT",
      body,
      params: financialParams(opts),
    });
    print(data);
  });

// ─── internal comments (v3) ────────────────────────────────────────────────

reservations
  .command("comments <reservationId>")
  .description("List internal reservation comments and nested replies")
  .option("--limit <n>", "Maximum top-level comments", "20")
  .option("--skip <n>", "Top-level comments to skip", "0")
  .action(async (reservationId: string, opts) => {
    const data = await guestyFetch(`/v1/reservations-v3/${encodeURIComponent(reservationId)}/comments`, {
      params: { limit: integer(opts.limit, "--limit", 1), skip: integer(opts.skip, "--skip") },
    });
    print(data);
  });

reservations
  .command("add-comment <reservationId>")
  .description("Add an internal reservation comment or reply (--data or stdin)")
  .option("--data <json>", "JSON with body, optional mentions, and optional parentCommentId")
  .action(async (reservationId: string, opts) => {
    const body = await readObject(opts.data);
    validateComment(body);
    const data = await guestyFetch(`/v1/reservations-v3/${encodeURIComponent(reservationId)}/comments`, { method: "POST", body });
    print(data);
  });

reservations
  .command("update-comment <reservationId> <commentId>")
  .description("Edit an internal reservation comment as its author (--data or stdin)")
  .option("--data <json>", "JSON with body and optional mentions")
  .action(async (reservationId: string, commentId: string, opts) => {
    const body = await readObject(opts.data);
    validateComment(body);
    const data = await guestyFetch(`/v1/reservations-v3/${encodeURIComponent(reservationId)}/comments/${encodeURIComponent(commentId)}`, { method: "PATCH", body });
    print(data);
  });

reservations
  .command("delete-comment <reservationId> <commentId>")
  .description("Soft-delete an internal reservation comment as its author")
  .action(async (reservationId: string, commentId: string) => {
    const data = await guestyFetch(`/v1/reservations-v3/${encodeURIComponent(reservationId)}/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
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
  .requiredOption("--timezone <tz>", "Timezone (e.g. America/Los_Angeles)")
  .option("--limit <n>", "Max results")
  .option("--skip <n>", "Offset")
  .action(async (viewId: string, opts) => {
    try { new Intl.DateTimeFormat("en-US", { timeZone: opts.timezone }); }
    catch { throw new Error("--timezone must be a valid IANA timezone, such as America/Los_Angeles."); }
    const params: Record<string, string | number> = { timezone: opts.timezone };
    if (opts.limit !== undefined) params.limit = integer(opts.limit, "--limit", 1);
    if (opts.skip !== undefined) params.skip = integer(opts.skip, "--skip");
    const data = await guestyFetch(`/v1/reservations-reports/${encodeURIComponent(viewId)}`, { params });
    print(data);
  });

reservations
  .command("logs <reservationId>")
  .description("Get reservation activity logs with cursor pagination")
  .option("--cursor <logId>", "Last logId from the previous page")
  .option("--limit <n>", "Page size (1-20)", "20")
  .addOption(new Option("--sort <order>", "Log sort order").choices(["asc", "desc"]).default("desc"))
  .action(async (reservationId: string, opts) => {
    const params: Record<string, string | number> = { limit: integer(opts.limit, "--limit", 1, 20), sort: opts.sort };
    if (opts.cursor) params.cursor = opts.cursor;
    const data = await guestyFetch(`/v1/reservation-logs/${encodeURIComponent(reservationId)}`, { params });
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
    if (opts.fields) params.fields = fields(opts.fields);
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
