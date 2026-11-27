// "Voice messages from Ammi" panel on the family dashboard.
import { formatDay, formatTime } from "@/lib/dashboard";
import type { Parent } from "@/lib/data";
import { KEPT_MESSAGES, type ParentMessage } from "@/lib/parent-messages";
import ParentMessagePlayer from "./ParentMessagePlayer";

type Props = { parent: Parent; ready: boolean; messages: ParentMessage[] };

export default function ParentMessages({ parent, ready, messages }: Props) {
  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="font-semibold text-stone-900">🎧 Voice messages from {parent.nickname}</h2>
      {parent.isDemo ? (
        <p className="mt-1 text-sm text-stone-600">Voice messages are switched off in the shared demo.</p>
      ) : !ready ? (
        <p className="mt-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-900">
          Voice messages aren&apos;t set up yet: run <code>supabase/schema.sql</code> in Supabase.
        </p>
      ) : messages.length === 0 ? (
        <p className="mt-1 text-sm text-stone-600">
          When {parent.nickname} records a message on their talk screen, you can listen to it here.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-stone-600">The newest {KEPT_MESSAGES} are kept.</p>
          <ul className="mt-3 space-y-2">
            {messages.map((m) => (
              <ParentMessagePlayer
                key={m.id}
                parentId={parent.id}
                messageId={m.id}
                heard={Boolean(m.heardAt)}
                label={`${formatDay(m.createdAt)}, ${formatTime(m.createdAt)} · ${m.seconds}s`}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
