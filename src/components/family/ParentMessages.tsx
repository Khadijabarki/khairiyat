// "Voice messages from Ammi" panel on the family dashboard.
import { formatDay, formatTime } from "@/lib/dashboard";
import type { Parent } from "@/lib/data";
import { KEPT_MESSAGES, type ParentMessage } from "@/lib/parent-messages";
import ParentMessagePlayer from "./ParentMessagePlayer";
import { getLang } from "@/lib/i18n-server";
import { parentNames, translator } from "@/lib/i18n";

type Props = { parent: Parent; ready: boolean; messages: ParentMessage[] };

export default async function ParentMessages({ parent, ready, messages }: Props) {
  const lang = await getLang();
  const t = translator(lang);
  const { nickname } = parentNames(parent, lang);
  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="font-semibold text-stone-900">🎧 {t(`Voice messages from ${nickname}`, `${nickname} کے آواز والے پیغام`)}</h2>
      {parent.isDemo ? (
        <p className="mt-1 text-sm text-stone-600">{t("Voice messages are switched off in the shared demo.", "مشترکہ ڈیمو میں آواز کے پیغام بند ہیں۔")}</p>
      ) : !ready ? (
        <p className="mt-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-900">
          {t("Voice messages aren't set up yet: run supabase/schema.sql in Supabase.", "آواز کے پیغام ابھی تیار نہیں: Supabase میں supabase/schema.sql چلائیں۔")}
        </p>
      ) : messages.length === 0 ? (
        <p className="mt-1 text-sm text-stone-600">
          {t(`When ${nickname} records a message on their talk screen, you can listen to it here.`, `جب ${nickname} اپنی اسکرین پر پیغام ریکارڈ کریں گے، آپ یہاں سن سکیں گے۔`)}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-stone-600">{t(`The newest ${KEPT_MESSAGES} are kept.`, `تازہ ترین ${KEPT_MESSAGES} پیغام محفوظ رہتے ہیں۔`)}</p>
          <ul className="mt-3 space-y-2">
            {messages.map((m) => (
              <ParentMessagePlayer
                key={m.id}
                parentId={parent.id}
                messageId={m.id}
                heard={Boolean(m.heardAt)}
                label={`${formatDay(m.createdAt, lang)}, ${formatTime(m.createdAt, lang)} · ${m.seconds}s`}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
