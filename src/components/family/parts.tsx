// Small building blocks shared by the family dashboard pages.
import { signOut } from "@/app/(auth)/actions";
import type { RiskLevel } from "@/lib/db";

// Status is always shown with an icon AND a word, never by colour alone.
const RISK_STYLE: Record<RiskLevel, { label: string; icon: string; className: string }> = {
  normal: { label: "All well", icon: "✓", className: "bg-emerald-100 text-emerald-900 ring-emerald-300" },
  concern: { label: "Needs attention", icon: "!", className: "bg-amber-100 text-amber-900 ring-amber-300" },
  urgent: { label: "Urgent", icon: "⚠", className: "bg-rose-100 text-rose-900 ring-rose-300" },
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  const s = RISK_STYLE[level];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-medium ring-1 ${s.className}`}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}

// Marks demo rows, so sample data is never presented as real.
export function SampleTag() {
  return (
    <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-600">
      Sample
    </span>
  );
}

// "Medicine: Taken / Missed / Not discussed" style facts.
export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-100 px-3 py-2">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="font-semibold text-stone-900">{value}</div>
    </div>
  );
}

export function yesNo(value: boolean | null, yes: string, no: string): string {
  return value === null ? "Not discussed" : value ? yes : no;
}

// Signs the family member out (Server Action, so it only works from our own pages).
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="text-sm text-stone-600 underline-offset-2 hover:underline">
        Sign out
      </button>
    </form>
  );
}
