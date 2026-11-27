// Khairiyat's calls: ringing a parent's phone, answering, and the daily schedule.
//
// How a call works:
// 1. A call row is created ("ringing") and a Web Push message is sent to every phone the
//    parent allowed. The phone vibrates and shows "Khairiyat is calling" with Answer / Later.
// 2. Answer opens the talk screen and the conversation starts. Later = "declined".
// 3. The scheduler (src/app/api/cron/tick) runs every few minutes:
//    - rings each parent at their daily call time and at each medicine time
//    - no answer after 15 minutes -> rings again once; still no answer -> alerts the family.
//
// Prototype note: this rings the parent's installed Khairiyat app over the internet.
// Production adds ordinary phone-line calls for parents without a smartphone.
import "server-only";
import { getParentById, type Parent } from "./data";
import { db } from "./db";
import { notifyFamily } from "./notify";
import { sendPush, setupPush, type StoredDevice } from "./push";
import type { PushSubscriptionInput } from "./push-endpoint";
import { readMedicines } from "./medicines";
import { callSlots, callTimeIso, dueSlot, pakistanToday } from "./time";

export const RING_MINUTES = 15; // how long a call rings before it counts as not answered
const RETRY_AFTER_DECLINE_MINUTES = 30; // "Later" -> ring again after this long
const MAX_ATTEMPTS = 2; // first call + one retry
const MAX_DEVICES_PER_PARENT = 5;
const TALKED_BEFORE_MINUTES = 30; // a conversation this close before a medicine time covers it

export type CallKind = "scheduled" | "manual" | "retry";
export type CallStatus = "ringing" | "answered" | "declined" | "missed" | "failed";
export type Call = {
  id: string;
  parent_id: string;
  created_at: string;
  kind: CallKind;
  attempt: number;
  status: CallStatus;
  answered_at: string | null;
  devices: number;
};

// ---------- Devices ----------
// Saves (or moves) a phone's push subscription for this parent. Keeps at most 5 phones per parent.
export async function savePushSubscription(parent: Parent, sub: PushSubscriptionInput): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ parent_id: parent.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: "endpoint" });
  if (error) {
    console.error("savePushSubscription: database error", error.code);
    return false;
  }
  // Remove the oldest phones beyond the limit.
  const { data } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("parent_id", parent.id)
    .order("created_at", { ascending: false });
  const extra = (data ?? []).slice(MAX_DEVICES_PER_PARENT).map((r) => r.id);
  if (extra.length) await supabase.from("push_subscriptions").delete().in("id", extra);
  return true;
}

export async function deviceCount(parentId: string): Promise<number> {
  const supabase = db();
  if (!supabase) return 0;
  const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("parent_id", parentId);
  return count ?? 0;
}

// ---------- Ringing ----------
// Rings all of the parent's phones. Returns the new call (status "failed" if no phone was reached).
export async function ringParent(parent: Parent, kind: CallKind, attempt = 1): Promise<Call | null> {
  const supabase = db();
  if (!supabase || !setupPush()) return null;

  const { data: call, error } = await supabase
    .from("calls")
    .insert({ parent_id: parent.id, kind, attempt })
    .select("*")
    .single();
  if (error || !call) {
    console.error("ringParent: database error", error?.code ?? "");
    return null;
  }

  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("parent_id", parent.id);
  // What the phone shows. The talk link is opened when they answer (?call= tells the screen which call).
  const payload = {
    type: "call",
    callId: call.id,
    url: `/talk/${parent.talkToken}?call=${call.id}`,
    title: "📞 خیریت کال کر رہی ہے",
    body: `${parent.childNameUr} نے آپ کا حال پوچھا ہے۔ بات کرنے کے لیے دبائیں۔`,
  };

  const { reached, gone } = await sendPush((subs ?? []) as StoredDevice[], payload, {
    ttlSeconds: RING_MINUTES * 60,
    topic: "khairiyat-call",
  });
  if (gone.length) await supabase.from("push_subscriptions").delete().in("id", gone);

  const update = reached > 0 ? { devices: reached } : { devices: 0, status: "failed" };
  await supabase.from("calls").update(update).eq("id", call.id);
  return { ...(call as Call), ...update } as Call;
}

// The parent answered or pressed "Later" (only for their own call that is still ringing).
export async function respondToCall(parent: Parent, callId: string, action: "answer" | "decline"): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  const update = action === "answer" ? { status: "answered", answered_at: new Date().toISOString() } : { status: "declined" };
  const { data, error } = await supabase
    .from("calls")
    .update(update)
    .eq("id", callId)
    .eq("parent_id", parent.id)
    .in("status", ["ringing", "declined"])
    .select("id");
  if (error) console.error("respondToCall: database error", error.code);
  return Boolean(data?.length);
}

// The most recent call, for the dashboard.
export async function latestCall(parentId: string): Promise<Call | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data } = await supabase.from("calls").select("*").eq("parent_id", parentId).order("created_at", { ascending: false }).limit(1);
  return (data?.[0] as Call) ?? null;
}

// ---------- The scheduler ----------
export type SchedulerReport = { dueCalls: number; retries: number; missed: number };

export async function runScheduler(now = new Date()): Promise<SchedulerReport> {
  const report: SchedulerReport = { dueCalls: 0, retries: 0, missed: 0 };
  const supabase = db();
  if (!supabase || !setupPush()) return report;
  const { startIso, minutesNow } = pakistanToday(now);

  // 1. Unanswered calls: ringing too long, or "Later" a while ago.
  const ringCutoff = new Date(now.getTime() - RING_MINUTES * 60 * 1000).toISOString();
  const declineCutoff = new Date(now.getTime() - RETRY_AFTER_DECLINE_MINUTES * 60 * 1000).toISOString();
  const { data: stale } = await supabase
    .from("calls")
    .select("*")
    .or(`and(status.eq.ringing,created_at.lt.${ringCutoff}),and(status.eq.declined,created_at.lt.${declineCutoff})`)
    .gte("created_at", startIso)
    .limit(100);

  for (const call of (stale as Call[]) ?? []) {
    // Is there already a newer call for this parent today? Then this one is settled.
    const { count: newer } = await supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", call.parent_id)
      .gt("created_at", call.created_at);
    if (call.status === "ringing") await supabase.from("calls").update({ status: "missed" }).eq("id", call.id);
    if (newer) continue;

    const parent = await getParentById(call.parent_id);
    if (!parent) continue;
    if (call.attempt < MAX_ATTEMPTS) {
      await ringParent(parent, "retry", call.attempt + 1);
      report.retries++;
    } else if (call.status === "ringing") {
      // Still no answer after the retry: tell the family.
      report.missed++;
      await supabase.from("live_alerts").insert({
        parent_id: parent.id,
        category: "no_answer",
        level: "concern",
        reason: `${parent.nickname} ne aaj ki call ka jawab nahi diya. Please unhein khud call kar lein.`,
        source: "ai",
      });
      await notifyFamily(parent, {
        title: `📵 ${parent.nickname} ne jawab nahi diya`,
        body: `Aaj ki Khairiyat call ka jawab nahi mila. Please ${parent.nickname} ko khud call kar lein.`,
        urgent: true,
      });
    }
  }

  // 2. Calls that are due now: the daily check-in and the medicine times.
  const { data: parents } = await supabase.from("parents").select("id, checkin_time, medicines").eq("consent_given", true);
  for (const row of parents ?? []) {
    const slots = callSlots(String(row.checkin_time).slice(0, 5), readMedicines(row.medicines));
    const slot = dueSlot(slots, minutesNow);
    if (!slot) continue;

    // Once for each call time: only calls made since that time count, so a family that
    // moves a time to later in the day still gets that call.
    // No call if the parent already talked: for the plain daily check-in any conversation
    // today counts; a medicine call only skips a conversation from shortly before.
    const slotIso = callTimeIso(startIso, slot.time);
    const talkedSince = slot.medicines.length
      ? new Date(Date.parse(slotIso) - TALKED_BEFORE_MINUTES * 60 * 1000).toISOString()
      : startIso;
    const [{ count: callsSince }, { count: checkins }] = await Promise.all([
      supabase.from("calls").select("id", { count: "exact", head: true }).eq("parent_id", row.id).in("kind", ["scheduled", "retry"]).gte("created_at", slotIso),
      supabase.from("checkins").select("id", { count: "exact", head: true }).eq("parent_id", row.id).eq("is_sample", false).gte("created_at", talkedSince),
    ]);
    if (callsSince || checkins) continue;
    if ((await deviceCount(row.id)) === 0) continue; // no phone set up yet

    const parent = await getParentById(row.id);
    if (parent) {
      await ringParent(parent, "scheduled");
      report.dueCalls++;
    }
  }
  return report;
}
