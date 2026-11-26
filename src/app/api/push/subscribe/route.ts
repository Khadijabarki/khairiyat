// The parent's phone allowed calls: save its Web Push subscription.
import { savePushSubscription } from "@/lib/calls";
import { getParentByTalkToken } from "@/lib/data";
import { clientIp, isSameOrigin, isValidTalkToken, jsonError, rateLimit, readJson } from "@/lib/security";

// Browsers' push services all use https URLs; keys are short base64url strings.
const BASE64URL = /^[A-Za-z0-9_-]{10,200}$/;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Forbidden", 403);
  if (!rateLimit(`subscribe:${clientIp(request)}`, 10, 10 * 60 * 1000)) return jsonError("Too many requests", 429);

  const body = await readJson(request, 4096);
  if (!body || !isValidTalkToken(body.talkToken)) return jsonError("Invalid request", 400);
  const parent = await getParentByTalkToken(body.talkToken);
  if (!parent) return jsonError("Not found", 404);

  const sub = body.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth : "";
  let validEndpoint = false;
  try {
    validEndpoint = new URL(endpoint).protocol === "https:" && endpoint.length <= 1000;
  } catch {}
  if (!validEndpoint || !BASE64URL.test(p256dh) || !BASE64URL.test(auth)) return jsonError("Invalid subscription", 400);

  const saved = await savePushSubscription(parent, { endpoint, keys: { p256dh, auth } });
  return saved ? Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }) : jsonError("Could not save", 500);
}
