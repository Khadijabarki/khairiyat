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
