// The parent's phone allowed calls: save its Web Push subscription.
import { savePushSubscription } from "@/lib/calls";
import { getParentByTalkToken } from "@/lib/data";
import { readSubscription } from "@/lib/push-endpoint";
import { clientIp, isSameOrigin, isValidTalkToken, jsonError, rateLimit, readJson } from "@/lib/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Forbidden", 403);
  if (!rateLimit(`subscribe:${clientIp(request)}`, 10, 10 * 60 * 1000)) return jsonError("Too many requests", 429);

  const body = await readJson(request, 4096);
  if (!body || !isValidTalkToken(body.talkToken)) return jsonError("Invalid request", 400);
  const parent = await getParentByTalkToken(body.talkToken);
  if (!parent) return jsonError("Not found", 404);

  // Only real browser push services are accepted (see push-endpoint.ts).
  const subscription = readSubscription(body.subscription);
  if (!subscription) return jsonError("Invalid subscription", 400);

  const saved = await savePushSubscription(parent, subscription);
  return saved ? Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } }) : jsonError("Could not save", 500);
}
