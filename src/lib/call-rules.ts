// When a call stops ringing, when it is tried again and when the family is told.
// Pure rules (no database), used by the server scheduler, the dashboard and the talk screen.

export const RING_MINUTES = 5; // how long one call rings
export const RETRY_MINUTES = 15; // the second call, counted from the first one
export const RETRY_AFTER_DECLINE_MINUTES = 30; // "Later" -> ring again after this long
export const MAX_ATTEMPTS = 2; // first call + one retry

// The scheduler runs every 5 minutes, a few seconds early or late; without this allowance
// a call could wait for the next run and be 5 minutes late.
export const SCHEDULER_GRACE_SECONDS = 30;

const minutesToMs = (m: number) => m * 60 * 1000 - SCHEDULER_GRACE_SECONDS * 1000;

export type CallStep = "wait" | "retry" | "alert" | "done";

// What the scheduler should do with a call that nobody has answered.
export function nextStep(call: { status: string; attempt: number; created_at: string }, nowMs: number): CallStep {
  const age = nowMs - Date.parse(call.created_at);
  const canRetry = call.attempt < MAX_ATTEMPTS;
  if (call.status === "ringing") {
    if (canRetry) return age >= minutesToMs(RETRY_MINUTES) ? "retry" : "wait";
    return age >= minutesToMs(RING_MINUTES) ? "alert" : "wait";
  }
  if (call.status === "declined" && canRetry) return age >= minutesToMs(RETRY_AFTER_DECLINE_MINUTES) ? "retry" : "wait";
  return "done";
}

// True once a call that is still open has stopped ringing on the parent's phone.
export function stoppedRinging(createdAt: string, nowMs: number): boolean {
  return nowMs - Date.parse(createdAt) >= RING_MINUTES * 60 * 1000;
}
