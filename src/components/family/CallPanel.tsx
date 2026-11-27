// "Daily call" panel on the family dashboard: the daily call time, whether the parent's
// phone can receive calls, the last call's result, and a "Call now" button.
import { callNow } from "@/app/family/actions";
import { formatDay, formatTime } from "@/lib/dashboard";
import type { Call } from "@/lib/calls";
import type { Parent } from "@/lib/data";
import CallNowButton from "./CallNowButton";
import { getLang } from "@/lib/i18n-server";
import { parentNames, translator } from "@/lib/i18n";

const CALL_STATUS: Record<Call["status"], [en: string, ur: string]> = {
  ringing: ["📳 Ringing now…", "📳 ابھی گھنٹی بج رہی ہے…"],
  answered: ["✓ Answered", "✓ کال اٹھائی گئی"],
  declined: ["⏰ Said \"later\" (Khairiyat will call again in 30 minutes)", "⏰ \"بعد میں\" کہا (خیریت 30 منٹ بعد دوبارہ کال کرے گی)"],
  missed: ["📵 Not answered", "📵 جواب نہیں ملا"],
  failed: ["⚠ Couldn't reach the phone", "⚠ فون تک کال نہیں پہنچی"],
};

// Shows "10:00" as "10:00 am".
function friendlyTime(hhmm: string): string { // shown left-to-right in both languages
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export default async function CallPanel({ parent, devices, lastCall }: { parent: Parent; devices: number; lastCall: Call | null }) {
  const lang = await getLang();
  const t = translator(lang);
  const { nickname } = parentNames(parent, lang);
  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 text-sm text-stone-700">
          <h2 className="text-base font-semibold text-stone-900">{t("Daily call", "روز کی کال")}</h2>
          <p>
            {t(`Khairiyat calls ${nickname} every day at`, `خیریت ${nickname} کو روز اس وقت کال کرتی ہے:`)}{" "}
            <bdi dir="ltr" className="font-medium">{friendlyTime(parent.checkinTime)}</bdi>{" "}
            {t("(Pakistan time). No answer → it tries again after 15 minutes, then tells you.", "(پاکستان کا وقت)۔ جواب نہ ملے تو 15 منٹ بعد دوبارہ کال، پھر آپ کو اطلاع۔")}
          </p>
          <p>
            {t(`${nickname}'s phone:`, `${nickname} کا فون:`)}{" "}
            {devices > 0 ? (
              <span className="font-medium text-emerald-800">{t("✓ ready for calls", "✓ کال کے لیے تیار")}</span>
            ) : (
              <span className="font-medium text-amber-800">{t('not set up yet. Open their link on their phone and tap "allow calls".', "ابھی تیار نہیں۔ ان کے فون پر لنک کھول کر کال کی اجازت دیں۔")}</span>
            )}
          </p>
          {lastCall && (
            <p>
              {t("Last call:", "آخری کال:")} {formatDay(lastCall.created_at, lang)}, {formatTime(lastCall.created_at, lang)} · {t(...CALL_STATUS[lastCall.status])}
            </p>
          )}
        </div>
        <CallNowButton action={callNow.bind(null, parent.id)} nickname={nickname} />
      </div>
    </section>
  );
}
