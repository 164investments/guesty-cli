export function print(data: unknown): void {
  if (data === undefined || data === null) {
    process.stdout.write("null\n");
    return;
  }

  if (typeof data === "string") {
    process.stdout.write(data.endsWith("\n") ? data : `${data}\n`);
    return;
  }

  if (Buffer.isBuffer(data)) {
    process.stdout.write(data);
    return;
  }

  if (data instanceof Uint8Array) {
    process.stdout.write(Buffer.from(data));
    return;
  }

  if (data instanceof ArrayBuffer) {
    process.stdout.write(Buffer.from(data));
    return;
  }

  printJson(data);
}

export function printTable(rows: Record<string, unknown>[], columns?: string[]): void {
  if (rows.length === 0) {
    process.stdout.write("[]\n");
    return;
  }
  const cols = columns ?? Object.keys(rows[0]);
  const widths = cols.map((col) =>
    rows.reduce((width, row) => Math.max(width, String(row[col] ?? "").length), col.length)
  );

  const header = cols.map((c, i) => c.padEnd(widths[i])).join("  ");
  const sep = widths.map((w) => "-".repeat(w)).join("  ");
  process.stdout.write(`${header}\n${sep}\n`);

  for (const row of rows) {
    const line = cols.map((c, i) => String(row[c] ?? "").padEnd(widths[i])).join("  ");
    process.stdout.write(`${line}\n`);
  }
}

export function printJson(data: unknown): void {
  const json = JSON.stringify(data === undefined ? null : data, null, 2);
  if (json === undefined) throw new Error("The response cannot be represented as JSON.");
  process.stdout.write(json + "\n");
}
