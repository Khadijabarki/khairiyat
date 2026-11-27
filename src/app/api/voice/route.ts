// Called by the parent's talk screen:
//   { talkToken }                -> the family's voice message that hasn't been heard yet
//   { talkToken, heardId: "…" }  -> that message was played to the end
import { getParentByTalkToken } from "@/lib/data";
import { clientIp, isSameOrigin, isValidTalkToken, jsonError, rateLimit, readJson } from "@/lib/security";
import { markVoiceHeard, pendingVoice } from "@/lib/voice";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Forbidden", 403);
  if (!rateLimit(`voice:${clientIp(request)}`, 40, 10 * 60 * 1000)) return jsonError("Too many requests", 429);

  const body = await readJson(request, 1024);
  // The secret talk link proves this request comes from the parent's own talk screen.
  if (!body || !isValidTalkToken(body.talkToken)) return jsonError("Invalid request", 400);
  const heardId = body.heardId;
  if (heardId !== undefined && (typeof heardId !== "string" || !UUID.test(heardId))) return jsonError("Invalid request", 400);
  const parent = await getParentByTalkToken(body.talkToken);
  if (!parent) return jsonError("Not found", 404);

  const headers = { "Cache-Control": "no-store" };
  if (typeof heardId === "string") {
    return Response.json({ ok: await markVoiceHeard(parent.id, heardId) }, { headers });
  }
  return Response.json({ message: await pendingVoice(parent.id) }, { headers });
}
