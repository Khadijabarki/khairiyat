// Khairiyat's calls: ringing a parent's phone, answering, and the daily schedule.
//
// How a call works:
// 1. A call row is created ("ringing") and a Web Push message is sent to every phone the
//    parent allowed. The phone vibrates and shows "Khairiyat is calling" with Answer / Later.
// 2. Answer opens the talk screen and the conversation starts. Later = "declined".
// 3. The scheduler (src/app/api/cron/tick) runs every few minutes:
//    - rings each parent at their daily call time and at each medicine time
//    - a call rings for 5 or 2 minutes (chosen per family member), then becomes a "missed
//      call"; after no answer or "Later" it rings again 15 minutes after the first call;
//      if that one isn't answered either, the family is told (see call-rules.ts).
//
// Prototype note: this rings the parent's installed Khairiyat app over the internet.
// Production adds ordinary phone-line calls for parents without a smartphone.
import "server-only";
import { getParentById, type Parent } from "./data";
import { db } from "./db";
import { notifyFamily } from "./notify";
import { sendPush, setupPush, type StoredDevice } from "./push";
import type { PushSubscriptionInput } from "./push-endpoint";
import {
  GIVE_UP_MINUTES,
  RETRY_MINUTES,
  SCHEDULER_GRACE_SECONDS,
  SHORT_RING_MINUTES,
  liveCall,
  type LiveCall,
  nextStep,
  ringsUntil,
  stoppedRinging,
} from "./call-rules";
import { readMedicines } from "./medicines";
import { callSlots, callTimeIso, dueSlot, pakistanToday } from "./time";
import { isolate } from "./urdu-names";

const MAX_DEVICES_PER_PARENT = 5;

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
  ended_at?: string | null; // missing until supabase/schema.sql has added the column
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
  // `until` lets the phone stop ringing exactly when this call ends, however late it is opened.
  const until = ringsUntil(call.created_at, parent.ringMinutes);
  const payload = {
    type: "call",
    callId: call.id,
    until,
    url: `/talk/${parent.talkToken}?call=${call.id}&until=${until}`,
    title: "📞 خیریت کال کر رہی ہے",
    body: `${isolate(parent.childNameUr)} نے آپ کا حال پوچھا ہے۔ بات کرنے کے لیے دبائیں۔`,
  };

  const { reached, gone } = await sendPush((subs ?? []) as StoredDevice[], payload, {
    ttlSeconds: parent.ringMinutes * 60,
    topic: "khairiyat-call",
  });
  if (gone.length) await supabase.from("push_subscriptions").delete().in("id", gone);

  const update = reached > 0 ? { devices: reached } : { devices: 0, status: "failed" };
  await supabase.from("calls").update(update).eq("id", call.id);
  return { ...(call as Call), ...update } as Call;
}

// Replaces the ringing notification with a "missed call" and closes an open ringing screen.
async function showMissedCall(parent: Parent, callId: string): Promise<void> {
  const supabase = db();
  if (!supabase) return;
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("parent_id", parent.id);
  const { gone } = await sendPush(
    (subs ?? []) as StoredDevice[],
    {
      type: "missed",
      callId,
      url: `/talk/${parent.talkToken}`,
      title: "📵 خیریت کی مس کال",
      body: `${isolate(parent.childNameUr)} نے آپ کا حال پوچھا تھا۔ بات کرنے کے لیے دبائیں۔`,
    },
    { ttlSeconds: GIVE_UP_MINUTES * 60, topic: "khairiyat-call" },
  );
  if (gone.length) await supabase.from("push_subscriptions").delete().in("id", gone);
}

// After an answer or "Later" on one phone or computer, the others must stop ringing too.
// The quiet notification takes the place of the ringing one.
export async function endCallEverywhere(parent: Parent, callId: string, action: "answer" | "decline"): Promise<void> {
  const supabase = db();
  if (!supabase || !setupPush()) return;
  const { data: subs } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("parent_id", parent.id);
  const { gone } = await sendPush(
    (subs ?? []) as StoredDevice[],
    {
      type: "ended",
      callId,
      url: `/talk/${parent.talkToken}`,
      title: action === "answer" ? "✓ کال اٹھا لی گئی" : "⏰ ٹھیک ہے، خیریت بعد میں کال کرے گی",
    },
    { ttlSeconds: parent.ringMinutes * 60, topic: "khairiyat-call" },
  );
  if (gone.length) await supabase.from("push_subscriptions").delete().in("id", gone);
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

// The conversation of an answered call has finished (or could not start).
export async function markCallEnded(parent: Parent, callId: string): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("calls")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", callId)
    .eq("parent_id", parent.id)
    .is("ended_at", null)
    .select("id");
  if (error) console.error("markCallEnded: database error", error.code);
  return Boolean(data?.length);
}

// What is happening with this person's latest call right now.
export async function currentLiveCall(parent: Parent): Promise<LiveCall> {
  const supabase = db();
  if (!supabase) return { state: "idle" };
  const [call, { data: talks }] = await Promise.all([
    latestCall(parent.id),
    supabase.from("checkins").select("created_at").eq("parent_id", parent.id).eq("is_sample", false).order("created_at", { ascending: false }).limit(1),
  ]);
  return liveCall(call, talks?.[0]?.created_at, Date.now(), parent.ringMinutes);
}

// The most recent call, for the dashboard.
export async function latestCall(parentId: string): Promise<Call | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data } = await supabase.from("calls").select("*").eq("parent_id", parentId).order("created_at", { ascending: false }).limit(1);
  return (data?.[0] as Call) ?? null;
}

// A call that is ringing right now, so a talk screen that was closed and opened again
// can show it. null if there is none.
export async function ringingCall(parent: Parent): Promise<{ callId: string; until: number } | null> {
  const call = await latestCall(parent.id);
  if (!call || call.status !== "ringing" || stoppedRinging(call.created_at, Date.now(), parent.ringMinutes)) return null;
  return { callId: call.id, until: ringsUntil(call.created_at, parent.ringMinutes) };
}

// ---------- The scheduler ----------
export type SchedulerReport = { dueCalls: number; retries: number; missed: number };

export async function runScheduler(now = new Date()): Promise<SchedulerReport> {
  const report: SchedulerReport = { dueCalls: 0, retries: 0, missed: 0 };
  const supabase = db();
  if (!supabase || !setupPush()) return report;
  const { startIso, minutesNow } = pakistanToday(now);

  // 1. Unanswered calls: stop the ringing, ring again, or tell the family.
  const before = (minutes: number) => new Date(now.getTime() - (minutes * 60 - SCHEDULER_GRACE_SECONDS) * 1000).toISOString();
  const { data: open } = await supabase
    .from("calls")
    .select("*")
    .or(
      // The shortest ringing time here; nextStep then waits for each person's own.
      `and(status.eq.ringing,created_at.lt.${before(SHORT_RING_MINUTES)}),` +
        `and(status.eq.missed,attempt.eq.1,created_at.lt.${before(RETRY_MINUTES)}),` +
        `and(status.eq.declined,created_at.lt.${before(SHORT_RING_MINUTES)})`,
    )
    .gte("created_at", startIso)
    .order("created_at", { ascending: false })
    .limit(200);

  for (const call of (open as Call[]) ?? []) {
    // Long settled: nothing to do, so don't look the person up every minute.
    if (call.status !== "ringing" && now.getTime() - Date.parse(call.created_at) > GIVE_UP_MINUTES * 60 * 1000) continue;
    // How long this call rings is chosen for each family member.
    const parent = await getParentById(call.parent_id);
    if (!parent) continue;
    const step = nextStep(call, now.getTime(), parent.ringMinutes);
    if (step === "wait" || step === "done") continue;

    // Settled already if there is a newer call, or the parent has talked since this one.
    const [{ count: newer }, { count: talked }] = await Promise.all([
      supabase.from("calls").select("id", { count: "exact", head: true }).eq("parent_id", call.parent_id).gt("created_at", call.created_at),
      supabase.from("checkins").select("id", { count: "exact", head: true }).eq("parent_id", call.parent_id).eq("is_sample", false).gt("created_at", call.created_at),
    ]);
    // Close the call first, so the next run can't tell the family a second time.
    if (call.status === "ringing" || step === "alert") {
      // Only if nothing changed meanwhile: an answer given at this very moment must win.
      const { data: closed } = await supabase.from("calls").update({ status: "missed" }).eq("id", call.id).eq("status", call.status).select("id");
      if (!closed?.length) continue;
    }
    if (newer || talked) continue;

    if (step === "retry") {
      await ringParent(parent, "retry", call.attempt + 1);
      report.retries++;
      continue;
    }
    if (call.status === "ringing") await showMissedCall(parent, call.id);
    if (step === "stop") continue;

    // Still no answer after the second call: tell the family.
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

  // 2. Calls that are due now: the daily check-in and the medicine times.
  const { data: parents } = await supabase.from("parents").select("id, checkin_time, medicines").eq("consent_given", true);
  for (const row of parents ?? []) {
    const slots = callSlots(String(row.checkin_time).slice(0, 5), readMedicines(row.medicines));
    const slot = dueSlot(slots, minutesNow);
    if (!slot) continue;

    // Every set time rings, once: only a set-time call made since that time counts (not a
    // second try of an earlier call, and not an earlier conversation).
    const { count: made } = await supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", row.id)
      .eq("kind", "scheduled")
      .gte("created_at", callTimeIso(startIso, slot.time));
    if (made) continue;
    if ((await deviceCount(row.id)) === 0) continue; // no phone set up yet

    const parent = await getParentById(row.id);
    if (!parent) continue;
    // Never on top of a call that is ringing or being talked on: it rings right after.
    const live = await currentLiveCall(parent);
    if (live.state === "ringing" || live.state === "talking") continue;
    await ringParent(parent, "scheduled");
    report.dueCalls++;
  }
  return report;
}
