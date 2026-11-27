// The monthly report for the doctor: pure calculations over saved check-ins (no database,
// no AI), so the numbers are exact and can be unit-tested. Months and days are Pakistan time.
import type { Checkin } from "./db";

const PK_OFFSET_MS = 5 * 60 * 60 * 1000; // Pakistan is UTC+5 all year

export type Month = {
  key: string; // "2026-11"
  label: string; // "November 2026"
  startIso: string; // first moment of the month in Pakistan
  endIso: string; // first moment of the next month
  previousKey: string;
  nextKey: string | null; // null for the current month (no reports from the future)
};

function keyOf(year: number, monthIndex: number): string {
  return new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 7);
}

// The requested month ("YYYY-MM"), or the current one if it is missing, invalid or in the future.
export function reportMonth(requested: unknown, now = new Date()): Month {
  const current = new Date(now.getTime() + PK_OFFSET_MS).toISOString().slice(0, 7);
  const valid = typeof requested === "string" && /^20\d{2}-(0[1-9]|1[0-2])$/.test(requested) && requested <= current;
  const key = valid ? requested : current;
  const year = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7)) - 1;
  const start = Date.UTC(year, m, 1);
  return {
    key,
    label: new Date(start).toLocaleDateString("en-GB", { timeZone: "UTC", month: "long", year: "numeric" }),
    startIso: new Date(start - PK_OFFSET_MS).toISOString(),
    endIso: new Date(Date.UTC(year, m + 1, 1) - PK_OFFSET_MS).toISOString(),
    previousKey: keyOf(year, m - 1),
    nextKey: key < current ? keyOf(year, m + 1) : null,
  };
}

export type ReportDay = {
  day: string; // "2026-11-27"
  calls: number;
  mood: number | null; // average of the day
  sleep: number | null;
  pain: number | null; // highest of the day
  medicineTaken: boolean | null; // false if any conversation that day reported a missed medicine
  ate: boolean | null;
  summaries: string[]; // oldest first
};

export type Measure = { average: number | null; lowest: number | null; highest: number | null; days: number };
export type YesNoDays = { yes: number; no: number }; // days it was discussed

export type Report = {
  checkins: number;
  sampleCheckins: number;
  days: ReportDay[]; // oldest first
  mood: Measure;
  sleep: Measure;
  pain: Measure;
  medicine: YesNoDays;
  food: YesNoDays;
  alerts: { category: string; days: string[] }[]; // most frequent first
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const dayOf = (iso: string) => new Date(Date.parse(iso) + PK_OFFSET_MS).toISOString().slice(0, 10);
const present = <T>(values: (T | null)[]): T[] => values.filter((v): v is T => v !== null);
const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

function measure(values: (number | null)[]): Measure {
  const list = present(values);
  const avg = average(list);
  return {
    average: avg === null ? null : round1(avg),
    lowest: list.length ? Math.min(...list) : null,
    highest: list.length ? Math.max(...list) : null,
    days: list.length,
  };
}

// "No" wins: a missed medicine must not be hidden by a later "taken".
function combine(values: (boolean | null)[]): boolean | null {
  const list = present(values);
  return list.length ? list.every(Boolean) : null;
}

function count(values: (boolean | null)[]): YesNoDays {
  return { yes: values.filter((v) => v === true).length, no: values.filter((v) => v === false).length };
}

export function buildReport(checkins: Checkin[]): Report {
  const sorted = [...checkins].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const byDay = new Map<string, Checkin[]>();
  for (const c of sorted) {
    const day = dayOf(c.created_at);
    byDay.set(day, [...(byDay.get(day) ?? []), c]);
  }

  const days: ReportDay[] = [...byDay].map(([day, list]) => {
    const mood = average(present(list.map((c) => c.mood)));
    const sleep = average(present(list.map((c) => c.sleep)));
    const pains = present(list.map((c) => c.pain));
    return {
      day,
      calls: list.length,
      mood: mood === null ? null : round1(mood),
      sleep: sleep === null ? null : round1(sleep),
      pain: pains.length ? Math.max(...pains) : null,
      medicineTaken: combine(list.map((c) => c.medicine_taken)),
      ate: combine(list.map((c) => c.ate)),
      summaries: list.map((c) => c.summary),
    };
  });

  const alertDays = new Map<string, Set<string>>();
  for (const c of sorted) {
    for (const alert of c.alerts ?? []) {
      alertDays.set(alert.category, (alertDays.get(alert.category) ?? new Set()).add(dayOf(c.created_at)));
    }
  }

  return {
    checkins: sorted.length,
    sampleCheckins: sorted.filter((c) => c.is_sample).length,
    days,
    mood: measure(days.map((d) => d.mood)),
    sleep: measure(days.map((d) => d.sleep)),
    pain: measure(days.map((d) => d.pain)),
    medicine: count(days.map((d) => d.medicineTaken)),
    food: count(days.map((d) => d.ate)),
    alerts: [...alertDays]
      .map(([category, set]) => ({ category, days: [...set] }))
      .sort((a, b) => b.days.length - a.days.length || a.category.localeCompare(b.category)),
  };
}
