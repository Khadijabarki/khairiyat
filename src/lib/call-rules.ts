// When a call stops ringing, when it is tried again and when the family is told.
// Pure rules (no database), used by the server scheduler, the dashboard and the talk screen.
//
// How long a call rings is chosen for each family member: 5 minutes (normal) or 2 minutes.
//
//                      rings 5 min    rings 2 min
//   first call              0              0
//   it stops                5              2       the parent sees a "missed call"
//   second call            15             15
//   it stops               20             17       "missed call", and the family is told
//
// "Later" works like no answer: the second call comes at the same time, without a "missed
// call" notification. The family is only told once the second call is over, so they never
// get wrong news while the parent could still answer. An answered call ends it all.

export const RING_MINUTES = 5; // how long one call rings, unless 2 minutes was chosen
export const SHORT_RING_MINUTES = 2;
export type RingMinutes = typeof RING_MINUTES | typeof SHORT_RING_MINUTES;
export const RETRY_MINUTES = 15; // the second call, counted from the first one
export const MAX_ATTEMPTS = 2; // first call + one retry
// An old call is left alone (e.g. if the scheduler was off), so nobody is rung hours later.
export const GIVE_UP_MINUTES = 60;

// The scheduler runs every minute, a few seconds early or late; without this allowance a
// call could wait for the next run. Kept small so that ringing is not cut short.
export const SCHEDULER_GRACE_SECONDS = 15;

const minutesToMs = (m: number) => m * 60 * 1000 - SCHEDULER_GRACE_SECONDS * 1000;

// The family member's choice, as stored or sent by the form. Anything else means 5 minutes.
export function ringMinutesFrom(value: unknown): RingMinutes {
  return Number(value) === SHORT_RING_MINUTES ? SHORT_RING_MINUTES : RING_MINUTES;
}

// "stop": end the ringing. "stop-and-alert": end it and tell the family.
export type CallStep = "wait" | "stop" | "stop-and-alert" | "retry" | "alert" | "done";

// What the scheduler should do now with a call that nobody has answered.
export function nextStep(
  call: { status: string; attempt: number; created_at: string },
  nowMs: number,
  ringMinutes: RingMinutes,
): CallStep {
  const age = nowMs - Date.parse(call.created_at);
  const canRetry = call.attempt < MAX_ATTEMPTS;
  const old = age > GIVE_UP_MINUTES * 60 * 1000;
  if (call.status === "ringing") {
    if (age < minutesToMs(ringMinutes)) return "wait";
    return canRetry || old ? "stop" : "stop-and-alert";
  }
  if (old) return "done";
  if (call.status !== "missed" && call.status !== "declined") return "done";
  if (canRetry) return age >= minutesToMs(RETRY_MINUTES) ? "retry" : "wait";
  // "Later" on the second call: tell the family once its ringing time is over.
  if (call.status === "declined") return age >= minutesToMs(ringMinutes) ? "alert" : "wait";
  return "done";
}

// The moment a call made at `createdAt` stops ringing (milliseconds).
export function ringsUntil(createdAt: string, ringMinutes: RingMinutes): number {
  return Date.parse(createdAt) + ringMinutes * 60 * 1000;
}

// True once a call has stopped ringing on the parent's phone.
export function stoppedRinging(createdAt: string, nowMs: number, ringMinutes: RingMinutes): boolean {
  return nowMs >= ringsUntil(createdAt, ringMinutes);
}

// The talk screen ends a conversation by itself after this long.
export const MAX_TALK_MINUTES = 6;

// What is going on with the latest call, as the family's dashboard shows it. "Call now" is
// only blocked while the call is "ringing" or the parent is "talking".
export type LiveCall =
  | { state: "idle" }
  | { state: "ringing" }
  | { state: "talking" }
  | { state: "calling-again"; after: "missed" | "declined"; at: number }
  | { state: "gave-up" };

export function liveCall(
  call: { status: string; attempt: number; created_at: string; answered_at?: string | null; ended_at?: string | null } | null,
  talkedAt: string | null | undefined, // when the latest conversation was saved
  nowMs: number,
  ringMinutes: RingMinutes,
): LiveCall {
  const idle: LiveCall = { state: "idle" };
  if (!call || call.status === "failed") return idle;
  const talked = talkedAt ? Date.parse(talkedAt) : 0;

  if (call.status === "answered") {
    const since = Date.parse(call.answered_at ?? call.created_at);
    // ended_at comes from the talk screen. If that message was lost, a saved conversation
    // or the time limit (plus a margin for connecting) ends it.
    const over = Boolean(call.ended_at) || talked > since || nowMs - since >= (MAX_TALK_MINUTES + 2) * 60 * 1000;
    return over ? idle : { state: "talking" };
  }
  if (call.status === "ringing" && !stoppedRinging(call.created_at, nowMs, ringMinutes)) return { state: "ringing" };

  // Not answered, or put off.
  const made = Date.parse(call.created_at);
  if (talked > made || nowMs - made > GIVE_UP_MINUTES * 60 * 1000) return idle;
  if (call.attempt >= MAX_ATTEMPTS) return { state: "gave-up" };
  const at = made + RETRY_MINUTES * 60 * 1000;
  // A couple of minutes' grace for the scheduler; after that no second call is coming.
  if (nowMs > at + 2 * 60 * 1000) return idle;
  return { state: "calling-again", after: call.status === "declined" ? "declined" : "missed", at };
}
