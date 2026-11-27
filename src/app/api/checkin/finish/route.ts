// Called by the talk screen when a conversation ends.
// Makes the family summary, saves it (summary and scores only, never the transcript)
// and sends the family a short message. The logic is in src/lib/checkin.ts.
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { recordCheckin, type CheckinRow } from "@/lib/checkin";
import { getParentByTalkToken } from "@/lib/data";
import { db, type StoredAlert } from "@/lib/db";
import { notifyFamily } from "@/lib/notify";
import { getRule } from "@/lib/safety";
import { clientIp, isSameOrigin, isValidTalkToken, jsonError, rateLimit, readJson } from "@/lib/security";
import { summarizeCheckin, type Turn } from "@/lib/summary";

// Enough for a first summary attempt plus one background retry.
export const maxDuration = 60;

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

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Saves a check-in, trying up to 3 times if the database can't be reached.
async function saveCheckin(row: CheckinRow): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await supabase.from("checkins").insert(row);
    // 23505 = this id already exists, so an earlier try did save it.
    if (!error || error.code === "23505") return true;
    console.error("checkin/finish: database error", error.code || "network", "attempt", attempt);
    if (attempt < 3) await wait(attempt * 700);
  }
  return false;
}

async function removeCheckin(id: string): Promise<void> {
  const { error } = (await db()?.from("checkins").delete().eq("id", id)) ?? {};
  if (error) console.error("checkin/finish: could not remove the basic check-in", error.code || "network");
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

  const outcome = await recordCheckin(parent, turns, callAlerts, {
    summarize: (budgetMs) => summarizeCheckin(parent, turns, budgetMs),
    save: saveCheckin,
    remove: removeCheckin,
    notify: notifyFamily,
    later: (task) => after(task), // keeps running after the reply is sent
    wait,
    newId: randomUUID,
    now: () => new Date(),
  });

  if (!outcome.saved) return jsonError("Could not save the check-in", 503);
  return Response.json(outcome, { headers: { "Cache-Control": "no-store" } });
}
