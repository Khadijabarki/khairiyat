// The parent answered a call, or pressed "Later".
import { respondToCall } from "@/lib/calls";
import { getParentByTalkToken } from "@/lib/data";
import { clientIp, isSameOrigin, isValidTalkToken, jsonError, rateLimit, readJson } from "@/lib/security";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Forbidden", 403);
  if (!rateLimit(`respond:${clientIp(request)}`, 30, 10 * 60 * 1000)) return jsonError("Too many requests", 429);

  const body = await readJson(request, 1024);
  if (!body || !isValidTalkToken(body.talkToken) || typeof body.callId !== "string" || !UUID.test(body.callId)) {
    return jsonError("Invalid request", 400);
  }
  if (body.action !== "answer" && body.action !== "decline") return jsonError("Invalid request", 400);
  const parent = await getParentByTalkToken(body.talkToken);
  if (!parent) return jsonError("Not found", 404);

  // Only updates a call that belongs to this parent and is still open.
  const updated = await respondToCall(parent, body.callId, body.action);
  return Response.json({ ok: updated }, { headers: { "Cache-Control": "no-store" } });
}
