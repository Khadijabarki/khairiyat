// "Daily call" panel on the family dashboard: the daily call time, whether the parent's
// phone can receive calls, the last call's result, and a "Call now" button.
import { callNow } from "@/app/family/actions";
import { formatDay, formatTime } from "@/lib/dashboard";
import type { Call } from "@/lib/calls";
import type { Parent } from "@/lib/data";
import CallNowButton from "./CallNowButton";

const CALL_STATUS: Record<Call["status"], string> = {
  ringing: "📳 Ringing now…",
  answered: "✓ Answered",
  declined: "⏰ Said \"later\" (Khairiyat will call again in 30 minutes)",
  missed: "📵 Not answered",
  failed: "⚠ Couldn't reach the phone",
};

// Shows "10:00" as "10:00 am".
function friendlyTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export default function CallPanel({ parent, devices, lastCall }: { parent: Parent; devices: number; lastCall: Call | null }) {
  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 text-sm text-stone-700">
          <h2 className="text-base font-semibold text-stone-900">Daily call</h2>
          <p>
            Khairiyat calls {parent.nickname} every day at <span className="font-medium">{friendlyTime(parent.checkinTime)}</span>{" "}
            (Pakistan time). No answer → it tries again after 15 minutes, then tells you.
          </p>
          <p>
            {parent.nickname}&apos;s phone:{" "}
            {devices > 0 ? (
              <span className="font-medium text-emerald-800">✓ ready for calls</span>
            ) : (
              <span className="font-medium text-amber-800">not set up yet. Open their link on their phone and tap &quot;allow calls&quot;.</span>
            )}
          </p>
          {lastCall && (
            <p>
              Last call: {formatDay(lastCall.created_at)}, {formatTime(lastCall.created_at)} · {CALL_STATUS[lastCall.status]}
            </p>
          )}
        </div>
        <CallNowButton action={callNow.bind(null, parent.id)} nickname={parent.nickname} />
      </div>
    </section>
  );
}
