// When a call stops ringing, when it is tried again and when the family is told.
// Pure rules (no database), used by the server scheduler, the dashboard and the talk screen.
//
//   0 min   first call rings
//   5 min   it stops; the parent sees a "missed call"
//   10 min  second call (5 minutes after the first stopped)
//   15 min  it stops; the family is told

export const RING_MINUTES = 5; // how long one call rings
export const RETRY_MINUTES = 10; // the second call, counted from the first one
export const RETRY_AFTER_DECLINE_MINUTES = 10; // "Later" -> ring again this long after the call
export const MAX_ATTEMPTS = 2; // first call + one retry
// An old call is left alone (e.g. if the scheduler was off), so nobody is rung hours later.
export const GIVE_UP_MINUTES = 60;

// The scheduler runs every 5 minutes, a few seconds early or late; without this allowance
// a call could wait for the next run and be 5 minutes late.
export const SCHEDULER_GRACE_SECONDS = 30;

const minutesToMs = (m: number) => m * 60 * 1000 - SCHEDULER_GRACE_SECONDS * 1000;

// "stop": end the ringing. "stop-and-alert": end it and tell the family.
export type CallStep = "wait" | "stop" | "stop-and-alert" | "retry" | "alert" | "done";

// What the scheduler should do now with a call that nobody has answered.
export function nextStep(call: { status: string; attempt: number; created_at: string }, nowMs: number): CallStep {
  const age = nowMs - Date.parse(call.created_at);
  const canRetry = call.attempt < MAX_ATTEMPTS;
  const old = age > GIVE_UP_MINUTES * 60 * 1000;
  if (call.status === "ringing") {
    if (age < minutesToMs(RING_MINUTES)) return "wait";
    return canRetry || old ? "stop" : "stop-and-alert";
  }
  if (old) return "done";
  if (call.status === "missed" && canRetry) return age >= minutesToMs(RETRY_MINUTES) ? "retry" : "wait";
  if (call.status === "declined") {
    if (age < minutesToMs(RETRY_AFTER_DECLINE_MINUTES)) return "wait";
    return canRetry ? "retry" : "alert"; // "Later" twice: the family should know
  }
  return "done";
}

// The moment a call made at `createdAt` stops ringing (milliseconds).
export function ringsUntil(createdAt: string): number {
  return Date.parse(createdAt) + RING_MINUTES * 60 * 1000;
}

// True once a call has stopped ringing on the parent's phone.
export function stoppedRinging(createdAt: string, nowMs: number): boolean {
  return nowMs >= ringsUntil(createdAt);
}
