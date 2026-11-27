// A parent's medicines as stored in the database (a JSON list the family filled in).
import { isClockTime } from "./time";

export type Medicine = {
  name: string;
  when: string; // in the family's words, e.g. "subah nashte ke baad"
  time?: string; // "HH:MM" (Pakistan time): Khairiyat also calls then
};

// Unexpected values are dropped or left empty.
export function readMedicines(value: unknown): Medicine[] {
  if (!Array.isArray(value)) return [];
  return (value as Partial<Medicine>[])
    .filter((m) => typeof m?.name === "string")
    .map((m) => ({ name: m.name as string, when: String(m.when ?? ""), ...(isClockTime(m.time) ? { time: m.time } : {}) }));
}
