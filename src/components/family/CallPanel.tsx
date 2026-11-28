// "Daily call" panel on the family dashboard: the daily call time, whether the parent's
// phone can receive calls, the last call's result, and a "Call now" button.
import { callNow } from "@/app/family/actions";
import { formatDay, formatTime } from "@/lib/dashboard";
import type { Call } from "@/lib/calls";
import type { Parent } from "@/lib/data";
import { RETRY_MINUTES, liveCall, stoppedRinging, type LiveCall } from "@/lib/call-rules";
import AutoRefresh from "./AutoRefresh";
import { callSlots } from "@/lib/time";
import CallNowButton from "./CallNowButton";
import { getLang } from "@/lib/i18n-server";
import { parentNames, translator, type Lang } from "@/lib/i18n";
import SectionHeading from "../ui/SectionHeading";

const CALL_STATUS: Record<Call["status"], [en: string, ur: string]> = {
  ringing: ["📳 Ringing now…", "📳 ابھی گھنٹی بج رہی ہے…"],
  answered: ["✓ Answered", "✓ کال اٹھائی گئی"],
  declined: ["⏰ Said \"later\"", "⏰ \"بعد میں\" کہا"],
  missed: ["📵 Not answered", "📵 جواب نہیں ملا"],
  failed: ["⚠ Couldn't reach the phone", "⚠ فون تک کال نہیں پہنچی"],
};

// Shows "10:00" as "10:00 am".
function friendlyTime(hhmm: string): string { // shown left-to-right in both languages
  const [h, m] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

// The line under "Call now": what is happening with the latest call.
function liveNote(live: LiveCall, nickname: string, lang: Lang): string {
  const t = translator(lang);
  if (live.state === "ringing") return t(`Calling ${nickname}… their phone is ringing.`, `${nickname} کو کال جا رہی ہے…`);
  if (live.state === "talking") return t(`${nickname} answered. The call is in progress.`, `${nickname} نے کال اٹھا لی۔ بات جاری ہے۔`);
  if (live.state === "gave-up") {
    return t(`The second call wasn't answered either. Please call ${nickname} yourself.`, `دوسری کال کا بھی جواب نہیں ملا۔ ${nickname} کو خود کال کریں۔`);
  }
  if (live.state === "calling-again") {
    const time = formatTime(new Date(live.at).toISOString(), lang);
    const why =
      live.after === "declined"
        ? t(`${nickname} said "Later".`, `${nickname} نے "بعد میں" کہا۔`)
        : t(`${nickname} didn't answer.`, `${nickname} نے کال نہیں اٹھائی۔`);
    return `${why} ${t(`Khairiyat calls again at ${time}.`, `خیریت ${time} پر دوبارہ کال کرے گی۔`)}`;
  }
  return "";
}

type Props = { parent: Parent; devices: number; lastCall: Call | null; talkedAt: string | undefined; nowMs: number };

export default async function CallPanel({ parent, devices, lastCall, talkedAt, nowMs }: Props) {
  // A call stops ringing after a few minutes, even before the scheduler has noted it.
  const shownStatus =
    lastCall?.status === "ringing" && stoppedRinging(lastCall.created_at, nowMs, parent.ringMinutes) ? "missed" : lastCall?.status;
  const lang = await getLang();
  const t = translator(lang);
  const { nickname } = parentNames(parent, lang);
  const live = liveCall(lastCall, talkedAt, nowMs, parent.ringMinutes);
  const busy = live.state === "ringing" || live.state === "talking" ? live.state : null;
  return (
    <section className="mt-5 ui-card p-5">
      {/* Follow a call closely while it is going on. */}
      {busy && <AutoRefresh seconds={4} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 text-sm text-stone-700">
          <SectionHeading icon="phone" title={t("Daily Calls", "روز کی کالز")} />
          <p>{t(`Khairiyat calls ${nickname} every day at (Pakistan time):`, `خیریت ${nickname} کو روز ان اوقات پر کال کرتی ہے (پاکستان کا وقت):`)}</p>
          <ul className="space-y-0.5">
            {callSlots(parent.checkinTime, parent.medicines).map((slot) => (
              <li key={slot.time}>
                <bdi dir="ltr" className="font-medium">{friendlyTime(slot.time)}</bdi>
                {" · "}
                {[slot.daily ? t("daily check-in", "روز کا حال چال") : "", slot.medicines.join(", ")].filter(Boolean).join(" + ")}
              </li>
            ))}
          </ul>
          <p>{t(`A call rings for ${parent.ringMinutes} minutes. No answer or "Later" → it calls again ${RETRY_MINUTES} minutes after the first call; if that one isn't answered either → tells you.`, `کال ${parent.ringMinutes} منٹ بجتی ہے۔ جواب نہ ملے یا "بعد میں" دبائیں تو پہلی کال کے ${RETRY_MINUTES} منٹ بعد دوبارہ کال، وہ بھی نہ اٹھائیں تو آپ کو اطلاع۔`)}</p>
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
              {t("Last call:", "آخری کال:")} {formatDay(lastCall.created_at, lang)}, {formatTime(lastCall.created_at, lang)} · {t(...CALL_STATUS[shownStatus ?? lastCall.status])}
            </p>
          )}
        </div>
        <CallNowButton action={callNow.bind(null, parent.id)} nickname={nickname} busy={busy} note={liveNote(live, nickname, lang)} />
      </div>
    </section>
  );
}
