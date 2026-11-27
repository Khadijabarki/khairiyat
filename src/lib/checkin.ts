// What happens after a call: build the check-in, save it, and tell the family.
//
// A finished call must never be lost just because the AI is busy:
// 1. If the summary works, the full check-in is saved and the family gets the message.
// 2. If it fails, a basic check-in (alerts only, no scores) is saved right away. Urgent
//    news is sent to the family immediately.
// 3. The summary is then tried once more in the background. If that works, the full
//    check-in replaces the basic one.
//
// Privacy: the conversation is only held in memory for the retry. It is never stored.
//
// Database, AI and notifications are passed in ("deps"), so this logic can be unit-tested.
import type { Parent } from "./data";
import type { RiskLevel, StoredAlert } from "./db";
import { detectByKeywords, getRule } from "./safety";
import type { Turn } from "./summary";
import type { CheckinSummary } from "./summary-validate";

export const FIRST_SUMMARY_MS = 25_000; // time allowed for the first summary attempt
export const RETRY_DELAY_MS = 10_000; // pause before trying again
export const RETRY_SUMMARY_MS = 20_000; // time allowed for the second attempt

// A basic check-in's summary always starts with this, so the dashboard can recognise it.
export const FALLBACK_NOTE = "AI khulasa abhi nahi ban saka.";

export function isFallbackSummary(summary: string): boolean {
  return summary.startsWith(FALLBACK_NOTE);
}

// One row of the "checkins" table.
export type CheckinRow = {
  id: string;
  parent_id: string;
  created_at: string;
  summary: string;
  family_message: string;
  mood: number | null;
  pain: number | null;
  sleep: number | null;
  medicine_taken: boolean | null;
  ate: boolean | null;
  risk_level: RiskLevel;
  alerts: StoredAlert[];
};

export type CheckinDeps = {
  summarize: (budgetMs: number) => Promise<CheckinSummary | null>;
  save: (row: CheckinRow) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  notify: (title: string, body: string) => Promise<unknown>;
  later: (task: () => Promise<void>) => void; // runs after the reply has been sent
  wait: (ms: number) => Promise<void>;
  newId: () => string;
  now: () => Date;
};

export type CheckinOutcome = { saved: boolean; riskLevel: RiskLevel; summaryPending: boolean };

// The more serious of two risk levels.
export function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  const order: RiskLevel[] = ["normal", "concern", "urgent"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

// Joins two alert lists, keeping one alert per category (the first one wins).
export function mergeAlerts(first: StoredAlert[], second: StoredAlert[]): StoredAlert[] {
  const merged = [...first];
  for (const alert of second) {
    if (!merged.some((a) => a.category === alert.category)) merged.push(alert);
  }
  return merged;
}

// A risk level is at least as serious as the most serious alert.
function riskOf(alerts: StoredAlert[], atLeast: RiskLevel): RiskLevel {
  return alerts.reduce<RiskLevel>((level, a) => maxRisk(level, getRule(a.category)?.level ?? "normal"), atLeast);
}

// The server's own keyword check on what the parent said (a backup to the alerts from the call).
function keywordAlerts(turns: Turn[]): StoredAlert[] {
  return turns
    .filter((t) => t.role === "ammi")
    .flatMap((t) => detectByKeywords(t.text))
    .map((rule) => ({ category: rule.id, reason: "", source: "keywords" as const }));
}

type Base = { parentId: string; id: string; createdAt: string };

export function fullRow(base: Base, result: CheckinSummary, alerts: StoredAlert[]): CheckinRow {
  const allAlerts = mergeAlerts(alerts, result.extraAlerts);
  return {
    id: base.id,
    parent_id: base.parentId,
    created_at: base.createdAt,
    summary: result.summary,
    family_message: result.familyMessage,
    mood: result.mood,
    pain: result.pain,
    sleep: result.sleep,
    medicine_taken: result.medicineTaken,
    ate: result.ate,
    risk_level: riskOf(allAlerts, result.riskLevel),
    alerts: allAlerts,
  };
}

export function fallbackRow(base: Base, nickname: string, alerts: StoredAlert[]): CheckinRow {
  // Without a summary we can't say "all well", so the family is at least asked to check.
  const risk = riskOf(alerts, "concern");
  const details = alerts.map((a) => a.reason || getRule(a.category)?.title || a.category).join("; ");

  const message =
    risk === "urgent"
      ? `${nickname} ne baat ki. Fori tawajjo: ${details}. Abhi call karein.`
      : details
        ? `${nickname} ne baat ki. In baaton ka zikr hua: ${details}. Aaj call kar lein.`
        : `${nickname} ne aaj baat ki, lekin AI khulasa nahi bana saka. Call kar ke haal pooch lein.`;

  return {
    id: base.id,
    parent_id: base.parentId,
    created_at: base.createdAt,
    summary: `${FALLBACK_NOTE} ${nickname} se baat-cheet hui.${details ? ` Zikr hua: ${details}.` : ""}`.slice(0, 1000),
    family_message: message.slice(0, 600),
    mood: null,
    pain: null,
    sleep: null,
    medicine_taken: null,
    ate: null,
    risk_level: risk,
    alerts,
  };
}

export async function recordCheckin(
  parent: Pick<Parent, "id" | "nickname">,
  turns: Turn[],
  callAlerts: StoredAlert[],
  deps: CheckinDeps,
): Promise<CheckinOutcome> {
  const alerts = mergeAlerts(callAlerts, keywordAlerts(turns));
  const createdAt = deps.now().toISOString();
  const base = () => ({ parentId: parent.id, id: deps.newId(), createdAt });
  const tellFamily = (row: CheckinRow) => {
    const icon = row.risk_level === "urgent" ? "🚨" : row.risk_level === "concern" ? "🟠" : "🌿";
    return deps.notify(`${icon} ${parent.nickname} ki aaj ki khairiyat`, row.family_message || row.summary);
  };
  const summarize = (budgetMs: number) => deps.summarize(budgetMs).catch(() => null);

  const result = await summarize(FIRST_SUMMARY_MS);
  if (result) {
    const row = fullRow(base(), result, alerts);
    const saved = await deps.save(row);
    await tellFamily(row);
    return { saved, riskLevel: row.risk_level, summaryPending: false };
  }

  // The AI is unavailable: keep the check-in and its alerts anyway.
  const basic = fallbackRow(base(), parent.nickname, alerts);
  const basicSaved = await deps.save(basic);
  const toldNow = basic.risk_level === "urgent";
  if (toldNow) await tellFamily(basic); // urgent news can't wait for the retry

  deps.later(async () => {
    await deps.wait(RETRY_DELAY_MS);
    const retry = await summarize(RETRY_SUMMARY_MS);
    if (retry) {
      const row = fullRow(base(), retry, alerts);
      // Save the full check-in first and only then remove the basic one, so nothing is ever lost.
      if (await deps.save(row)) {
        if (basicSaved) await deps.remove(basic.id);
        await tellFamily(row);
        return;
      }
    }
    if (!toldNow) await tellFamily(basic);
  });

  return { saved: basicSaved, riskLevel: basic.risk_level, summaryPending: true };
}
