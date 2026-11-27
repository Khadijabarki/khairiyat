// "Voice message" panel on the family dashboard: what was sent, whether it was heard,
// and the recorder.
import { formatDay, formatTime } from "@/lib/dashboard";
import type { Parent } from "@/lib/data";
import type { VoiceStatus } from "@/lib/voice";
import VoiceRecorder from "./VoiceRecorder";

export default function VoicePanel({ parent, status }: { parent: Parent; status: VoiceStatus }) {
  const { message } = status;
  const waiting = Boolean(message && !message.playedAt);
  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="font-semibold text-stone-900">💌 Voice message</h2>
      <p className="text-sm text-stone-700">
        Record up to a minute. {parent.nickname} hears it at the start of the next conversation, then the recording is erased.
      </p>
      {parent.isDemo ? (
        <p className="mt-2 text-sm text-stone-600">
          Voice messages are switched off in the shared demo. Create your own account to send one.
        </p>
      ) : !status.ready ? (
        <p className="mt-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-900">
          Voice messages aren&apos;t set up yet: run <code>supabase/schema.sql</code> in Supabase.
        </p>
      ) : (
        <>
          {message && (
            <p role="status" className="mt-2 text-sm font-medium text-stone-800">
              {message.playedAt
                ? `✓ Heard on ${formatDay(message.playedAt)}, ${formatTime(message.playedAt)}`
                : `⏳ Waiting: ${message.seconds}s message sent ${formatDay(message.createdAt)}, ${formatTime(message.createdAt)}. A new one replaces it.`}
            </p>
          )}
          <VoiceRecorder parentId={parent.id} nickname={parent.nickname} waiting={waiting} />
        </>
      )}
    </section>
  );
}
