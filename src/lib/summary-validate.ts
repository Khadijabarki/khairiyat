// Checks the AI's summary answer before anything is saved.
// Kept separate from summary.ts (which calls Gemini) so it can be unit-tested offline.
// The model is told the exact JSON shape, but we never trust it blindly:
// numbers are clamped to their range, unknown values become null or "normal",
// and only known safety categories are kept.
import { SAFETY_RULES } from "./safety";

export type RiskLevel = "normal" | "concern" | "urgent";
export type SummaryAlert = { category: string; reason: string; source: "ai" | "keywords" };

export type CheckinSummary = {
  summary: string; // 1-2 sentence Roman Urdu summary for the history
  familyMessage: string; // short message for the son/daughter's phone
  mood: number | null; // 1-5
  pain: number | null; // 0-10
  sleep: number | null; // 1-5
  medicineTaken: boolean | null; // null = not discussed
  ate: boolean | null;
  riskLevel: RiskLevel;
  extraAlerts: SummaryAlert[]; // worries the summary model noticed that the call didn't flag
};

// Keeps a number inside its allowed range, or null if it isn't a usable number.
function score(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : null;
}

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function validateSummary(raw: Record<string, unknown>): CheckinSummary {
  const known = new Set(SAFETY_RULES.map((r) => r.id));
  const noticed = Array.isArray(raw.noticed) ? raw.noticed.map(String).filter((c) => known.has(c)) : [];
  const riskLevel: RiskLevel = raw.risk_level === "urgent" || raw.risk_level === "concern" ? raw.risk_level : "normal";

  return {
    summary: text(raw.summary, 600) || "Aaj ki baat-cheet ka khulasa nahi ban saka.",
    familyMessage: text(raw.family_message, 600),
    mood: score(raw.mood, 1, 5),
    pain: score(raw.pain, 0, 10),
    sleep: score(raw.sleep, 1, 5),
    medicineTaken: typeof raw.medicine_taken === "boolean" ? raw.medicine_taken : null,
    ate: typeof raw.ate === "boolean" ? raw.ate : null,
    riskLevel,
    extraAlerts: [...new Set(noticed)].map((category) => ({ category, reason: "", source: "ai" as const })),
  };
}
