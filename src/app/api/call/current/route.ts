// Called by the parent's talk screen when it opens or comes back to the front:
// is a call ringing right now?
import { ringingCall } from "@/lib/calls";
import { getParentByTalkToken } from "@/lib/data";
import { clientIp, isSameOrigin, isValidTalkToken, jsonError, rateLimit, readJson } from "@/lib/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Forbidden", 403);
  if (!rateLimit(`currentcall:${clientIp(request)}`, 120, 10 * 60 * 1000)) return jsonError("Too many requests", 429);

  const body = await readJson(request, 1024);
  // The secret talk link proves this request comes from the parent's own talk screen.
  if (!body || !isValidTalkToken(body.talkToken)) return jsonError("Invalid request", 400);
  const parent = await getParentByTalkToken(body.talkToken);
  if (!parent) return jsonError("Not found", 404);

  return Response.json({ call: await ringingCall(parent) }, { headers: { "Cache-Control": "no-store" } });
}
