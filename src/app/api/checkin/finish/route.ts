// Called by the talk screen when a conversation ends.
// Makes the family summary, saves it (summary and scores only, never the transcript)
// and sends the family a short message.
import { getParentByTalkToken } from "@/lib/data";
import { db, type RiskLevel, type StoredAlert } from "@/lib/db";
import { notifyFamily } from "@/lib/notify";
import { getRule } from "@/lib/safety";
import { clientIp, isSameOrigin, isValidTalkToken, jsonError, rateLimit, readJson } from "@/lib/security";
import { summarizeCheckin, type Turn } from "@/lib/summary";

const MAX_BODY_BYTES = 64 * 1024; // a 6-minute call is far below this
const MAX_TURNS = 300;
const MAX_TURN_CHARS = 4000;
const MAX_ALERTS = 30;

// Checks the conversation sent by the browser and drops anything malformed.
function readTurns(value: unknown): Turn[] | null {
  if (!Array.isArray(value) || value.length > MAX_TURNS) return null;
  const turns: Turn[] = [];
  for (const item of value) {
    const role = (item as Turn)?.role;
    const text = (item as Turn)?.text;
    if ((role !== "ammi" && role !== "khairiyat") || typeof text !== "string") return null;
    const trimmed = text.trim().slice(0, MAX_TURN_CHARS);
    if (trimmed) turns.push({ role, text: trimmed });
  }
  return turns;
}

// Keeps only alerts whose category is one of our known safety rules.
function readAlerts(value: unknown): StoredAlert[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ALERTS).flatMap((item) => {
    const category = String((item as StoredAlert)?.category ?? "");
    if (!getRule(category)) return [];
    const source = (item as StoredAlert)?.source === "keywords" ? "keywords" : "ai";
    const reason = typeof (item as StoredAlert)?.reason === "string" ? (item as StoredAlert).reason.slice(0, 300) : "";
    return [{ category, reason, source }];
  });
}

// The more serious of two risk levels.
function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  const order: RiskLevel[] = ["normal", "concern", "urgent"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Forbidden", 403);
  if (!rateLimit(`finish:${clientIp(request)}`, 20, 10 * 60 * 1000)) {
    return jsonError("Too many requests, please try again later", 429);
  }

  const body = await readJson(request, MAX_BODY_BYTES);
  // The secret talk link proves this request comes from the parent's own talk screen.
  if (!body || !isValidTalkToken(body.talkToken)) return jsonError("Invalid request", 400);
  const parent = await getParentByTalkToken(body.talkToken);
  if (!parent) return jsonError("Not found", 404);
  const turns = readTurns(body.turns);
  if (!turns) return jsonError("Invalid request", 400);
  const callAlerts = readAlerts(body.alerts);

  // Nothing was said by the parent (e.g. ended right away): nothing to save.
  if (!turns.some((t) => t.role === "ammi")) return Response.json({ saved: false, reason: "empty" });

  const result = await summarizeCheckin(parent, turns);
  if (!result) return jsonError("Could not make the summary", 502);

  // Combine what was flagged during the call with what the summary noticed (no duplicates).
  const alerts = [...callAlerts];
  for (const extra of result.extraAlerts) {
    if (!alerts.some((a) => a.category === extra.category)) alerts.push(extra);
  }
  // The risk level is at least as serious as the most serious alert.
  const riskFromAlerts = alerts.reduce<RiskLevel>(
    (level, a) => maxRisk(level, getRule(a.category)?.level ?? "normal"),
    "normal",
  );
  const riskLevel = maxRisk(result.riskLevel, riskFromAlerts);

  const supabase = db();
  if (supabase) {
    const { error } = await supabase.from("checkins").insert({
      parent_id: parent.id,
      summary: result.summary,
      family_message: result.familyMessage,
      mood: result.mood,
      pain: result.pain,
      sleep: result.sleep,
      medicine_taken: result.medicineTaken,
      ate: result.ate,
      risk_level: riskLevel,
      alerts,
    });
    if (error) console.error("checkin/finish: database error", error.code);
  }

  const icon = riskLevel === "urgent" ? "🚨" : riskLevel === "concern" ? "🟠" : "🌿";
  await notifyFamily(`${icon} ${parent.nickname} ki aaj ki khairiyat`, result.familyMessage || result.summary);

  return Response.json({ saved: Boolean(supabase), riskLevel }, { headers: { "Cache-Control": "no-store" } });
}
