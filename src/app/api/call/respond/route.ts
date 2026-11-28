// The parent answered a call, or pressed "Later".
import { after } from "next/server";
import { endCallEverywhere, respondToCall } from "@/lib/calls";
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
  const callId: string = body.callId;
  const action: "answer" | "decline" = body.action === "answer" ? "answer" : "decline";
  const updated = await respondToCall(parent, callId, action);
  // Stop the ringing elsewhere, after replying so the parent isn't kept waiting.
  if (updated) after(() => endCallEverywhere(parent, callId, action));
  return Response.json({ ok: updated }, { headers: { "Cache-Control": "no-store" } });
}
