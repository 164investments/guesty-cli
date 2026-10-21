import { Command, Option } from "commander";
import { guestyFetch } from "../client.js";
import { print } from "../output.js";
import { readStdin } from "../stdin.js";
import { dateTime, decimal, jsonObject } from "./query-options.js";

// Guesty's Payments API: processor payments, offline (recorded) payments and
// vaulted payment methods. It replaces the deprecated reservation payment
// endpoints behind "guesty res add-payment" and related commands.

const RECORDED_METHODS = ["RECORDED_CASH", "ECHECK", "DEBIT", "CREDIT", "BANK_TRANSFER", "CREDIT_NOTE", "VOUCHER", "CHECK", "OTHER"];
const RECORDED_REFUND_METHODS = [...RECORDED_METHODS, "BCOM"];

async function readObject(data?: string): Promise<Record<string, unknown>> {
  return jsonObject(data ?? await readStdin(), "--data or stdin");
}

function requireString(body: Record<string, unknown>, key: string): void {
  if (typeof body[key] !== "string" || !(body[key] as string).trim()) {
    throw new Error(`The request body needs ${key} as a nonempty string.`);
  }
}

// Shared rules from the Payments API reference: amounts are at least 1 in the
// reservation currency, notes at most 500 characters, timestamps ISO 8601.
function validatePaymentFields(body: Record<string, unknown>, dateKeys: string[] = []): void {
  if (body.amount !== undefined && (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount < 1)) {
    throw new Error("amount must be a number of at least 1, in the reservation currency.");
  }
  if (body.note !== undefined && (typeof body.note !== "string" || [...body.note].length > 500)) {
    throw new Error("note must be a string of at most 500 characters.");
  }
  for (const key of dateKeys) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "string") throw new Error(`${key} must be an ISO 8601 date-time string.`);
      dateTime(body[key] as string, key);
    }
  }
}

function validateRecordedMethod(body: Record<string, unknown>, methods: string[]): void {
  if (body.paymentMethod === undefined) return;
  const method = (body.paymentMethod as Record<string, unknown> | null)?.method;
  if (typeof method !== "string" || !methods.includes(method)) {
    throw new Error(`paymentMethod.method must be one of ${methods.join(", ")}.`);
  }
}

function amountAndNote(opts: { amount?: string; note?: string }): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (opts.amount !== undefined) body.amount = decimal(opts.amount, "--amount", 1);
  if (opts.note !== undefined) body.note = opts.note;
  validatePaymentFields(body);
  return body;
}

export const payments = new Command("payments")
  .alias("pay")
  .description("Reservation payments, recorded offline payments, refunds, chargebacks, and guest payment methods");

// ─── Processor payments ──────────────────────────────────────────────────────

payments
  .command("list")
  .description("List a reservation's payments, authorization holds, and payment summary")
  .requiredOption("--reservation <id>", "Reservation ID")
  .action(async (opts) => {
    print(await guestyFetch("/v1/payments", { params: { reservationId: opts.reservation } }));
  });

payments
  .command("get <paymentId>")
  .description("Get a payment")
  .action(async (paymentId: string) => {
    print(await guestyFetch(`/v1/payments/${paymentId}`));
  });

payments
  .command("create")
  .description("Charge, schedule, or hold a payment on a reservation (--data or stdin: reservationId, paymentMethodId, amount)")
  .option("--data <json>", "JSON body; add isAuthorizationHold, or isSecurityDeposit with releaseAuthorizationHold.shouldTriggerAt")
  .action(async (opts) => {
    const body = await readObject(opts.data);
    for (const key of ["reservationId", "paymentMethodId"]) requireString(body, key);
    if (body.amount === undefined) throw new Error("The request body needs amount.");
    validatePaymentFields(body, ["shouldBePaidAt"]);
    if (body.isAuthorizationHold === true && body.isSecurityDeposit === true) {
      throw new Error("isAuthorizationHold and isSecurityDeposit cannot both be true.");
    }
    if (body.isSecurityDeposit === true) {
      const release = body.releaseAuthorizationHold as Record<string, unknown> | undefined;
      if (typeof release?.shouldTriggerAt !== "string") {
        throw new Error("A security deposit needs releaseAuthorizationHold.shouldTriggerAt.");
      }
      dateTime(release.shouldTriggerAt, "releaseAuthorizationHold.shouldTriggerAt");
    }
    print(await guestyFetch("/v1/payments", { method: "POST", body }));
  });

payments
  .command("update <paymentId>")
  .description("Change a processor payment's amount, payment method, scheduled date, or note (--data or stdin)")
  .option("--data <json>", "JSON body with paymentMethodId, amount, shouldBePaidAt, and/or note")
  .action(async (paymentId: string, opts) => {
    const body = await readObject(opts.data);
    if (!["paymentMethodId", "amount", "shouldBePaidAt", "note"].some((key) => body[key] !== undefined)) {
      throw new Error("The request body needs paymentMethodId, amount, shouldBePaidAt, or note.");
    }
    validatePaymentFields(body, ["shouldBePaidAt"]);
    print(await guestyFetch(`/v1/payments/${paymentId}`, { method: "PATCH", body }));
  });

payments
  .command("charge <paymentId>")
  .description("Charge a PENDING or FAILED payment now")
  .action(async (paymentId: string) => {
    print(await guestyFetch(`/v1/payments/${paymentId}/pay`, { method: "POST" }));
  });

payments
  .command("cancel <paymentId>")
  .description("Cancel a PENDING or PENDING_AUTH payment, or a succeeded recorded payment")
  .action(async (paymentId: string) => {
    print(await guestyFetch(`/v1/payments/${paymentId}/cancel`, { method: "POST" }));
  });

payments
  .command("capture <paymentId>")
  .description("Capture an authorization hold, fully or with --amount")
  .option("--amount <amount>", "Amount to capture (at least 1); omit to capture the full hold")
  .option("--note <text>", "Note stored on the capture (max 500 characters)")
  .action(async (paymentId: string, opts) => {
    print(await guestyFetch(`/v1/payments/${paymentId}/capture`, { method: "POST", body: amountAndNote(opts) }));
  });

payments
  .command("refund <paymentId>")
  .description("Refund a succeeded processor payment, fully or with --amount")
  .option("--amount <amount>", "Amount to refund (at least 1); omit to refund the original amount")
  .option("--note <text>", "Note stored on the refund (max 500 characters)")
  .action(async (paymentId: string, opts) => {
    print(await guestyFetch(`/v1/payments/${paymentId}/refund`, { method: "POST", body: amountAndNote(opts) }));
  });

payments
  .command("chargeback <paymentId>")
  .description("Record a chargeback on a succeeded processor payment")
  .requiredOption("--amount <amount>", "Chargeback amount (at least 1, at most the payment balance)")
  .option("--at <date-time>", "When the chargeback occurred (past ISO 8601 date-time)")
  .option("--reason <text>", "Reason (max 500 characters)")
  .option("--note <text>", "Note (max 500 characters)")
  .option("--case-id <id>", "Processor dispute case ID (max 100 characters)")
  .action(async (paymentId: string, opts) => {
    const body = amountAndNote(opts);
    if (opts.at !== undefined) body.chargebackAt = dateTime(opts.at, "--at");
    if (opts.reason !== undefined) {
      if ([...opts.reason].length > 500) throw new Error("--reason must be at most 500 characters.");
      body.reason = opts.reason;
    }
    if (opts.caseId !== undefined) {
      if ([...opts.caseId].length > 100) throw new Error("--case-id must be at most 100 characters.");
      body.caseId = opts.caseId;
    }
    print(await guestyFetch(`/v1/payments/${paymentId}/chargeback`, { method: "POST", body }));
  });

// ─── Recorded (offline) payments ─────────────────────────────────────────────

payments
  .command("record")
  .description("Record an offline payment without charging a processor (--data or stdin: reservationId, amount, paymentMethod.method)")
  .option("--data <json>", "JSON body")
  .action(async (opts) => {
    const body = await readObject(opts.data);
    requireString(body, "reservationId");
    if (body.amount === undefined) throw new Error("The request body needs amount.");
    if (body.paymentMethod === undefined) throw new Error("The request body needs paymentMethod.method.");
    validatePaymentFields(body, ["shouldBePaidAt"]);
    validateRecordedMethod(body, RECORDED_METHODS);
    print(await guestyFetch("/v1/payments/record", { method: "POST", body }));
  });

payments
  .command("update-recorded <paymentId>")
  .description("Update a recorded payment (--data or stdin)")
  .option("--data <json>", "JSON body with shouldBePaidAt, amount, paymentMethod, confirmationCode, and/or note")
  .action(async (paymentId: string, opts) => {
    const body = await readObject(opts.data);
    if (!["shouldBePaidAt", "amount", "paymentMethod", "confirmationCode", "note"].some((key) => body[key] !== undefined)) {
      throw new Error("The request body needs shouldBePaidAt, amount, paymentMethod, confirmationCode, or note.");
    }
    validatePaymentFields(body, ["shouldBePaidAt"]);
    validateRecordedMethod(body, RECORDED_METHODS);
    print(await guestyFetch(`/v1/payments/${paymentId}/record`, { method: "PATCH", body }));
  });

payments
  .command("record-refund <paymentId>")
  .description("Record an offline refund on a succeeded recorded payment")
  .option("--amount <amount>", "Refund amount (at least 1); omit to refund the full recorded amount")
  .addOption(new Option("--method <method>", "Refund method").choices(RECORDED_REFUND_METHODS))
  .option("--at <date-time>", "When the refund was made (ISO 8601); omit for now")
  .option("--note <text>", "Note (max 500 characters)")
  .action(async (paymentId: string, opts) => {
    const body = amountAndNote(opts);
    if (opts.method) body.paymentMethod = { method: opts.method };
    if (opts.at !== undefined) body.refundedAt = dateTime(opts.at, "--at");
    print(await guestyFetch(`/v1/payments/${paymentId}/record/refund`, { method: "POST", body }));
  });

payments
  .command("update-recorded-refund <paymentId> <refundId>")
  .description("Update a recorded refund")
  .option("--amount <amount>", "Refund amount (at least 1)")
  .addOption(new Option("--method <method>", "Refund method").choices(RECORDED_REFUND_METHODS))
  .option("--at <date-time>", "When the refund was made (ISO 8601)")
  .option("--note <text>", "Note (max 500 characters)")
  .action(async (paymentId: string, refundId: string, opts) => {
    const body = amountAndNote(opts);
    if (opts.method) body.paymentMethod = { method: opts.method };
    if (opts.at !== undefined) body.refundedAt = dateTime(opts.at, "--at");
    if (!Object.keys(body).length) throw new Error("Use --amount, --method, --at, or --note.");
    print(await guestyFetch(`/v1/payments/${paymentId}/record/refund/${refundId}`, { method: "PATCH", body }));
  });

// ─── Payment methods ─────────────────────────────────────────────────────────

payments
  .command("methods")
  .description("List payment methods for a guest or a reservation")
  .option("--guest <id>", "Guest ID")
  .option("--reservation <id>", "Reservation ID")
  .action(async (opts) => {
    if ((opts.guest === undefined) === (opts.reservation === undefined)) throw new Error("Use exactly one of --guest or --reservation.");
    const params: Record<string, string> = {};
    if (opts.guest) params.guestId = opts.guest;
    if (opts.reservation) params.reservationId = opts.reservation;
    print(await guestyFetch("/v1/payment-methods", { params }));
  });

payments
  .command("method <paymentMethodId>")
  .description("Get a payment method")
  .action(async (paymentMethodId: string) => {
    print(await guestyFetch(`/v1/payment-methods/${paymentMethodId}`));
  });

payments
  .command("create-method")
  .description("Vault a tokenized payment method for a guest (--data or stdin: guestId, paymentProviderId, confirmationCode, and _id or stripeCardToken)")
  .option("--data <json>", "JSON body; card details are never sent")
  .action(async (opts) => {
    const body = await readObject(opts.data);
    for (const key of ["guestId", "paymentProviderId", "confirmationCode"]) requireString(body, key);
    const tokens = ["_id", "stripeCardToken"].filter((key) => body[key] !== undefined);
    if (tokens.length !== 1) throw new Error("The request body needs exactly one of _id (GuestyPay) or stripeCardToken (Stripe).");
    requireString(body, tokens[0]);
    if (body.reuse !== undefined && typeof body.reuse !== "boolean") throw new Error("reuse must be true or false.");
    print(await guestyFetch("/v1/payment-methods", { method: "POST", body }));
  });
