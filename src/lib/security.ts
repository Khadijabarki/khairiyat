// Small security helpers shared by the API routes.
//
// What they protect against:
// - Other websites calling our API from a visitor's browser (origin check).
// - Scripts calling our API over and over to use up our free Gemini quota (rate limit).
// - Odd or oversized input reaching our code (input checks).

// ---------- Same-origin check ----------

// True only if the request came from a page on our own site.
// Browsers always send an Origin header with POST requests and a script on another
// website can't fake it. (A script outside a browser can, which is why the
// rate limit below exists too.)
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// ---------- Rate limit ----------

// The visitor's IP address. Vercel puts the real address first in x-forwarded-for.
export function clientIp(request: Request): string {
  return ipFromHeaders(request.headers);
}

// Same, from a headers object (Server Actions get headers, not a Request).
export function ipFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || headers.get("x-real-ip") || "unknown";
}

// Remembers recent request times per key (for example per IP address).
// Kept in memory: simple and free. On Vercel each server instance keeps its own
// memory, so this is a best-effort limit, which is enough to stop casual abuse
// in a prototype. A shared store (e.g. Redis) would make it exact in production.
const hits = new Map<string, number[]>();

// Returns true if this key is still under `limit` requests in the last `windowMs`.
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);

  // Forget old keys now and then so memory doesn't grow forever.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return true;
}

// ---------- Input checks ----------

// Parent ids are short and made of lowercase letters, numbers, "-" and "_".
export function isValidId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_-]{1,64}$/.test(value);
}

// Talk tokens (the secret part of a parent's talk link) are URL-safe letters and numbers.
export function isValidTalkToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(value);
}

// Reads a JSON body, refusing anything larger than maxBytes.
// Returns null for a missing, too large or invalid body.
export async function readJson(request: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (!text || text.length > maxBytes) return null;
  try {
    const data = JSON.parse(text);
    return data && typeof data === "object" && !Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// A safe description of an error for the server logs.
// Error messages from libraries can contain secrets (for example a bad API key
// copied into an "invalid header value" message), so we never log the message
// itself: only the error's type and HTTP status code, if it has one.
export function safeErrorInfo(err: unknown): string {
  if (!(err instanceof Error)) return "unknown error";
  const status = (err as { status?: unknown }).status;
  return typeof status === "number" ? `${err.name} (HTTP ${status})` : err.name;
}

// A JSON error response that browsers and proxies must never cache.
export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
