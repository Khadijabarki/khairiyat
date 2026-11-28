// Pakistan-time helpers for the daily call schedule. Pure functions (no database),
// so they can be unit-tested. Pakistan is UTC+5 all year (no daylight saving).

const PK_OFFSET_MS = 5 * 60 * 60 * 1000;

// The start of today (midnight) in Pakistan, as an ISO time, and the minutes since then.
export function pakistanToday(now = new Date()): { startIso: string; minutesNow: number } {
  const pk = new Date(now.getTime() + PK_OFFSET_MS);
  const minutesNow = pk.getUTCHours() * 60 + pk.getUTCMinutes();
  const midnightPk = Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate()) - PK_OFFSET_MS;
  return { startIso: new Date(midnightPk).toISOString(), minutesNow };
}

// "10:30" -> 630
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// The moment today's call time happens, as an ISO time. startIso is midnight in Pakistan.
export function callTimeIso(startIso: string, checkinTime: string): string {
  return new Date(Date.parse(startIso) + toMinutes(checkinTime) * 60 * 1000).toISOString();
}

// Is a daily call at `checkinTime` due now? From that time until `windowMinutes` later
// (so a phone that was off for a while still gets today's call), but never the day before.
export function isCallDue(checkinTime: string, minutesNow: number, windowMinutes = 180): boolean {
  const due = toMinutes(checkinTime);
  return minutesNow >= due && minutesNow <= due + windowMinutes;
}

// ---------- Call times: the daily check-in plus each medicine's time ----------

// Times closer together than this are one call, so the parent isn't rung again and again
// (it also leaves room for the retry and the "no answer" alert before the next call).
export const MERGE_MINUTES = 60;

export type CallSlot = {
  time: string; // "HH:MM" in Pakistan time
  daily: boolean; // includes the daily check-in
  medicines: string[]; // names of the medicines due at this call
};

export function isClockTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

// All of a parent's call times for one day, earliest first.
export function callSlots(checkinTime: string, medicines: { name: string; time?: string }[]): CallSlot[] {
  const entries = [
    { time: checkinTime, daily: true, medicines: [] as string[] },
    ...medicines.filter((m) => isClockTime(m.time)).map((m) => ({ time: m.time as string, daily: false, medicines: [m.name] })),
  ].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

  const slots: CallSlot[] = [];
  for (const entry of entries) {
    const last = slots[slots.length - 1];
    if (last && toMinutes(entry.time) - toMinutes(last.time) < MERGE_MINUTES) {
      last.daily ||= entry.daily;
      last.medicines.push(...entry.medicines);
    } else {
      slots.push(entry);
    }
  }
  return slots;
}

// The call that should ring now: the latest call time that has passed, if it is still due.
export function dueSlot(slots: CallSlot[], minutesNow: number): CallSlot | null {
  const latest = [...slots].reverse().find((s) => toMinutes(s.time) <= minutesNow);
  return latest && isCallDue(latest.time, minutesNow) ? latest : null;
}

// The call time a conversation happening now belongs to (it may start a little early).
export function currentSlot(slots: CallSlot[], minutesNow: number, earlyMinutes = 30): CallSlot | null {
  const latest = [...slots].reverse().find((s) => toMinutes(s.time) <= minutesNow + earlyMinutes);
  return latest && isCallDue(latest.time, minutesNow + earlyMinutes, 180 + earlyMinutes) ? latest : null;
}

// ---------- Saying the time in Urdu ----------
// Written out in words so the voice says every number correctly (58 = اٹھاون).
const URDU_NUMBERS = (
  "صفر ایک دو تین چار پانچ چھ سات آٹھ نو دس گیارہ بارہ تیرہ چودہ پندرہ سولہ سترہ اٹھارہ انیس بیس " +
  "اکیس بائیس تئیس چوبیس پچیس چھبیس ستائیس اٹھائیس انتیس تیس " +
  "اکتیس بتیس تینتیس چونتیس پینتیس چھتیس سینتیس اڑتیس انتالیس چالیس " +
  "اکتالیس بیالیس تینتالیس چوالیس پینتالیس چھیالیس سینتالیس اڑتالیس انچاس پچاس " +
  "اکیاون باون ترپن چون پچپن چھپن ستاون اٹھاون انسٹھ"
).split(" ");

// The time in Pakistan (Islamabad), e.g. "دن کے ایک بج کر اٹھاون منٹ".
export function urduClock(now = new Date()): string {
  const { minutesNow } = pakistanToday(now);
  const hour = Math.floor(minutesNow / 60);
  const minute = minutesNow % 60;
  const part = hour >= 4 && hour < 12 ? "صبح" : hour >= 12 && hour < 16 ? "دن" : hour >= 16 && hour < 20 ? "شام" : "رات";
  const hourWord = URDU_NUMBERS[hour % 12 || 12];
  return minute === 0 ? `${part} کے ${hourWord} بجے` : `${part} کے ${hourWord} بج کر ${URDU_NUMBERS[minute]} منٹ`;
}
