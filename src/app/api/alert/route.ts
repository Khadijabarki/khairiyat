// Called by the talk screen the moment an emergency or worry is noticed DURING a call,
// so the family hears about it right away instead of after the call ends.
import { getParent } from "@/lib/data";
import { db } from "@/lib/db";
import { notifyFamily } from "@/lib/notify";
import { getRule } from "@/lib/safety";
import { clientIp, isSameOrigin, isValidId, jsonError, rateLimit, readJson } from "@/lib/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Forbidden", 403);
  if (!rateLimit(`alert:${clientIp(request)}`, 30, 10 * 60 * 1000)) {
    return jsonError("Too many requests, please try again later", 429);
  }

  const body = await readJson(request, 2048);
  if (!body || !isValidId(body.parentId)) return jsonError("Invalid request", 400);
  const parent = await getParent(body.parentId);
  const rule = getRule(String(body.category ?? ""));
  if (!parent || !rule) return jsonError("Invalid request", 400);

  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
  const source = body.source === "keywords" ? "keywords" : "ai";

  const supabase = db();
  if (supabase) {
    const { error } = await supabase
      .from("live_alerts")
      .insert({ parent_id: parent.id, category: rule.id, level: rule.level, reason, source });
    if (error) console.error("alert: database error", error.code);
  }

  // Urgent: message the family immediately. Worries go into the end-of-call summary instead.
  if (rule.level === "urgent") {
    await notifyFamily(`🚨 ${parent.nickname}: ${rule.title}`, reason || `${parent.nickname} ne abhi ${rule.title} ka bataya. Foran call karein.`);
  }

  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
