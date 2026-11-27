// "Voice message" panel on the family dashboard: what was sent, whether it was heard,
// and the recorder.
import { formatDay, formatTime } from "@/lib/dashboard";
import type { Parent } from "@/lib/data";
import type { VoiceStatus } from "@/lib/voice";
import VoiceRecorder from "./VoiceRecorder";
import { getLang } from "@/lib/i18n-server";
import { parentNames, translator } from "@/lib/i18n";
import SectionHeading from "../ui/SectionHeading";

export default async function VoicePanel({ parent, status }: { parent: Parent; status: VoiceStatus }) {
  const lang = await getLang();
  const t = translator(lang);
  const { nickname } = parentNames(parent, lang);
  const { message } = status;
  const waiting = Boolean(message && !message.playedAt);
  return (
    <section className="mt-5 ui-card p-5">
      <SectionHeading icon="mic" title={t("Send a Voice Message", "آواز کا پیغام بھیجیں")} />
      <p className="text-sm text-stone-700">
        {t(`Record up to a minute. ${nickname} hears it at the start of the next conversation, then the recording is erased.`, `ایک منٹ تک ریکارڈ کریں۔ ${nickname} اگلی بات کے شروع میں سنیں گے، پھر ریکارڈنگ مٹ جائے گی۔`)}
      </p>
      {parent.isDemo ? (
        <p className="mt-2 text-sm text-stone-600">
          {t("Voice messages are switched off in the shared demo. Create your own account to send one.", "مشترکہ ڈیمو میں آواز کے پیغام بند ہیں۔ بھیجنے کے لیے اپنا اکاؤنٹ بنائیں۔")}
        </p>
      ) : !status.ready ? (
        <p className="mt-2 rounded-xl bg-amber-100 p-3 text-sm text-amber-900">
          {t("Voice messages aren't set up yet: run supabase/schema.sql in Supabase.", "آواز کے پیغام ابھی تیار نہیں: Supabase میں supabase/schema.sql چلائیں۔")}
        </p>
      ) : (
        <>
          {message && (
            <p role="status" className="mt-2 text-sm font-medium text-stone-800">
              {message.playedAt
                ? `${t("✓ Heard on", "✓ سنا گیا:")} ${formatDay(message.playedAt, lang)}, ${formatTime(message.playedAt, lang)}`
                : `${t("⏳ Waiting to be heard. Sent", "⏳ سننا باقی ہے۔ بھیجا گیا:")} ${formatDay(message.createdAt, lang)}, ${formatTime(message.createdAt, lang)} (${message.seconds}s). ${t("A new one replaces it.", "نیا پیغام اس کی جگہ لے گا۔")}`}
            </p>
          )}
          <VoiceRecorder parentId={parent.id} nickname={nickname} waiting={waiting} />
        </>
      )}
    </section>
  );
}
