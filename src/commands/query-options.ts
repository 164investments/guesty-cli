export type QueryParams = Record<string, string | number | boolean | string[]>;

export function integer(
  value: string | number,
  option: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const parsed = typeof value === "number" ? value : /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${option} must be an integer between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

export function date(value: string, option: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error(`${option} must be a valid date in YYYY-MM-DD format.`);
  }
  return value;
}

export function dateTime(value: string, option: string): string {
  date(value.slice(0, 10), option);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
      !Number.isFinite(Date.parse(value))) {
    throw new Error(`${option} must be an ISO 8601 date-time including a timezone.`);
  }
  return value;
}

export function dateRange(
  from?: string,
  to?: string,
  fromOption = "--from",
  toOption = "--to",
): void {
  for (const [value, option] of [[from, fromOption], [to, toOption]]) {
    if (value !== undefined) {
      if (value.includes("T")) dateTime(value, option!);
      else date(value, option!);
    }
  }
  if (from !== undefined && to !== undefined && Date.parse(from) > Date.parse(to)) {
    throw new Error(`${fromOption} must be on or before ${toOption}.`);
  }
}

export function jsonObject(value: string, option: string): Record<string, unknown> {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error(`${option} must be a JSON object.`); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${option} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

export function jsonArray(value: string, option: string): unknown[] {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error(`${option} must be a JSON array.`); }
  if (!Array.isArray(parsed)) throw new Error(`${option} must be a JSON array.`);
  return parsed;
}

export function collect(value: string, previous: string[]): string[] {
  if (!value.trim()) throw new Error("Repeated option values must not be empty.");
  return [...previous, value];
}

export function fields(value: string): string {
  const normalized = value.split(/[\s,]+/).filter(Boolean).join(" ");
  if (!normalized) throw new Error("Field selection must not be empty.");
  return normalized;
}
