const MAX_BODY_BYTES = 16_384;

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly retryAt?: number) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

export function errorResponse(error: HttpError): Response {
  const headers: Record<string, string> = {};
  if (error.retryAt) headers["Retry-After"] = String(Math.max(1, Math.ceil((error.retryAt - Date.now()) / 1000)));
  return json({ error: error.code, message: error.message, ...(error.retryAt ? { retry_at: error.retryAt } : {}) }, error.status, headers);
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY_BYTES) {
    throw new HttpError(413, "too_large", "The request body is too large.");
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "too_large", "The request body is too large.");
  if (!text) return {};
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json", "The request body must be JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "invalid_json", "The request body must be a JSON object.");
  }
  return body as Record<string, unknown>;
}

// Trims, because pasted credentials often end in a newline Guesty would refuse.
export function requiredText(body: Record<string, unknown>, name: string, max = 200): string {
  const value = body[name];
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, "invalid_request", `${name} is required.`);
  if (value.trim().length > max) throw new HttpError(400, "invalid_request", `${name} is too long.`);
  return value.trim();
}
