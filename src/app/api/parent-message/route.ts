// Called by the parent's talk screen to send a voice message to the family.
import { after } from "next/server";
import { getParentByTalkToken } from "@/lib/data";
import { notifyFamily } from "@/lib/notify";
import { saveParentMessage } from "@/lib/parent-messages";
import { clientIp, isSameOrigin, isValidTalkToken, jsonError, rateLimit } from "@/lib/security";
import { MAX_VOICE_BYTES, looksLikeAudio, voiceSeconds, voiceType } from "@/lib/voice-rules";

const MAX_BODY_BYTES = MAX_VOICE_BYTES + 8 * 1024; // the recording plus the form's other fields

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Forbidden", 403);
  if (!rateLimit(`parentmessage:${clientIp(request)}`, 10, 10 * 60 * 1000)) return jsonError("Too many requests", 429);
  // Refuse anything too large before reading it.
  const length = Number(request.headers.get("content-length"));
  if (!length || length > MAX_BODY_BYTES) return jsonError("Invalid request", 413);

  const form = await request.formData().catch(() => null);
  const talkToken = form?.get("talkToken");
  // The secret talk link proves this request comes from the parent's own talk screen.
  if (!form || !isValidTalkToken(talkToken)) return jsonError("Invalid request", 400);
  const parent = await getParentByTalkToken(talkToken);
  if (!parent) return jsonError("Not found", 404);
  // The demo is shared by everyone: strangers must not leave recordings for each other.
  if (parent.isDemo) return jsonError("Not available in the demo", 403);

  const file = form.get("audio");
  const seconds = voiceSeconds(form.get("seconds"));
  if (!(file instanceof File) || !seconds || file.size === 0 || file.size > MAX_VOICE_BYTES) {
    return jsonError("Invalid recording", 400);
  }
  const type = voiceType(file.type);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!type || !looksLikeAudio(bytes, type)) return jsonError("Invalid recording", 400);

  if (!(await saveParentMessage(parent.id, type, bytes, seconds))) return jsonError("Could not save the message", 503);
  // Tell the family after replying, so the parent isn't kept waiting.
  after(() =>
    notifyFamily(parent, {
      title: `💌 ${parent.nickname} ka paigham aaya hai`,
      body: `${parent.nickname} ne aap ko voice message bheja hai. Sunne ke liye kholein.`,
    }),
  );
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
