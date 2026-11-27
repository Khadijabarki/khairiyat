import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import AutoRefresh from "@/components/family/AutoRefresh";
import { Fact, RiskBadge, SampleTag, SignOutButton, yesNo } from "@/components/family/parts";
import CallPanel from "@/components/family/CallPanel";
import FamilyAlerts from "@/components/family/FamilyAlerts";
import { vapidPublicKey } from "@/lib/push";
import ShareLink from "@/components/family/ShareLink";
import VoicePanel from "@/components/family/VoicePanel";
import ParentMessages from "@/components/family/ParentMessages";
import { listParentMessages } from "@/lib/parent-messages";
import { voiceStatus } from "@/lib/voice";
import { deviceCount, latestCall } from "@/lib/calls";
import TrendChart, { type TrendPoint } from "@/components/family/TrendChart";
import { dayKey, formatDay, formatTime, getDashboardData } from "@/lib/dashboard";
import { requireUser } from "@/lib/auth";
import { isFallbackSummary } from "@/lib/checkin";
import { getFamilyParent } from "@/lib/data";
import type { Checkin } from "@/lib/db";
import { getRule } from "@/lib/safety";
import { getLang } from "@/lib/i18n-server";
import { parentNames, translator, type Lang, type Translate } from "@/lib/i18n";

export const metadata: Metadata = { title: "Khairiyat · Family", robots: { index: false, follow: false } };
export const instant = false;

// Alerts raised by the system itself (not by something said in a call).
const SYSTEM_ALERTS: Record<string, [en: string, ur: string]> = { no_answer: ["No answer to today's call", "آج کی کال کا جواب نہیں ملا"] };

type Words = { lang: Lang; t: Translate };

// Chart colours: validated categorical slots 1-3 (blue, orange, aqua).
const COLORS = { mood: "#2a78d6", sleep: "#eb6834", pain: "#1baf7a" };

export default function ParentDashboardPage({ params, searchParams }: PageProps<"/family/[parentId]">) {
  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-800">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<p className="text-stone-500">…</p>}>
          <ParentDashboard params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

type DashboardProps = {
  params: PageProps<"/family/[parentId]">["params"];
  searchParams: PageProps<"/family/[parentId]">["searchParams"];
};

async function ParentDashboard({ params, searchParams }: DashboardProps) {
  const { parentId } = await params;
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId); // only this family's parents
  if (!parent) notFound();
  const justAdded = (await searchParams).added === "1";

  const [{ checkins, liveAlerts, databaseReady, nowMs }, devices, lastCall, voice, fromParent] = await Promise.all([
    getDashboardData(parent.id),
    deviceCount(parent.id),
    latestCall(parent.id),
    voiceStatus(parent.id),
    listParentMessages(parent.id),
  ]);
  const latest = checkins[0];
  const lang = await getLang();
  const t = translator(lang);
  const words: Words = { lang, t };
  const { nickname, childName } = parentNames(parent, lang);

  return (
    <>
      <AutoRefresh seconds={10} />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/family" className="text-sm text-stone-500 hover:underline">
            {t("← Your family", "→ آپ کا خاندان")}
          </Link>
          <h1 className="text-2xl font-semibold text-stone-900">
            {nickname} <span className="font-normal text-stone-500">· {parent.name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/family/${parent.id}/edit`} className="text-sm font-medium text-stone-700 hover:underline">
            {t("Edit", "تبدیلی")}
          </Link>
          <Link
            href={`/talk/${parent.talkToken}`}
            className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            {t(`Open ${nickname}'s talk screen`, `${nickname} کی بات والی اسکرین کھولیں`)}
          </Link>
          <SignOutButton />
        </div>
      </header>

      {justAdded && (
        <p role="status" className="mt-4 rounded-xl bg-emerald-100 p-3 text-emerald-900">
          {t(`${nickname} has been added. Now open the link below on ${nickname}'s phone.`, `${nickname} شامل ہو گئے۔ اب نیچے والا لنک ${nickname} کے فون پر کھولیں۔`)}
        </p>
      )}

      {!databaseReady && (
        <p className="mt-4 rounded-xl bg-amber-100 p-3 text-amber-900">
          {t("The database is not set up yet: run supabase/schema.sql in Supabase.", "ڈیٹابیس ابھی تیار نہیں: Supabase میں supabase/schema.sql چلائیں۔")}
        </p>
      )}

      {/* Live alerts from calls in the last 24 hours (emergencies reach the family during the call). */}
      {liveAlerts.length > 0 && (
        <section aria-label={t("Alerts today", "آج کے الرٹ")} className="mt-5 space-y-2">
          {liveAlerts.map((a) => {
            const rule = getRule(a.category);
            const urgent = a.level === "urgent";
            return (
              <div
                key={a.id}
                role="alert"
                className={`rounded-2xl p-4 ${urgent ? "bg-rose-600 text-white" : "bg-amber-100 text-amber-950"}`}
              >
                <p className="font-semibold">
                  {urgent ? t("⚠ Urgent", "⚠ فوری") : t("! Needs attention", "! توجہ چاہیے")}:{" "}
                  {rule ? t(rule.title, rule.titleUr) : SYSTEM_ALERTS[a.category] ? t(...SYSTEM_ALERTS[a.category]) : a.category}
                  <span className="font-normal opacity-80"> · {formatTime(a.created_at, lang)}</span>
                </p>
                {a.reason && <p dir="auto" className="mt-0.5">{a.reason}</p>}
                {urgent && <p className="mt-1 text-sm">{t(`Please call ${nickname} now. If there is no answer, call 1122.`, `ابھی ${nickname} کو کال کریں۔ جواب نہ ملے تو 1122 پر کال کریں۔`)}</p>}
              </div>
            );
          })}
        </section>
      )}

      <FamilyAlerts vapidPublicKey={vapidPublicKey()} isDemo={parent.isDemo} />

      <CallPanel parent={parent} devices={devices} lastCall={lastCall} nowMs={nowMs} />

      <ParentMessages parent={parent} ready={fromParent.ready} messages={fromParent.messages} />

      <VoicePanel parent={parent} status={voice} />

      <p className="mt-4">
        <Link
          href={`/family/${parent.id}/report`}
          className="inline-block rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:border-emerald-500"
        >
          🩺 {t("Monthly report for the doctor", "ڈاکٹر کے لیے مہینے کی رپورٹ")}
        </Link>
      </p>

      {latest ? <TodayCard checkin={latest} {...words} /> : (
        <p className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 text-stone-600">
          {t(`No check-ins yet. Open ${nickname}'s talk screen to have the first conversation.`, `ابھی کوئی بات نہیں ہوئی۔ پہلی بات کے لیے ${nickname} کی اسکرین کھولیں۔`)}
        </p>
      )}

      {/* A new parent needs the phone set-up first; after that it moves to the bottom. */}
      {checkins.length === 0 && <ShareLink parent={parent} />}

      {checkins.length > 0 && <PhonePreview childName={childName} checkins={checkins} {...words} />}
      {checkins.length > 0 && <Trends checkins={checkins} nowMs={nowMs} {...words} />}
      {checkins.length > 0 && <History checkins={checkins} {...words} />}
      {checkins.length > 0 && <ShareLink parent={parent} />}

      <p className="mt-8 text-center text-xs text-stone-500">
        {t(
          "Khairiyat saves only a short summary and simple scores of each call, never the full conversation. Khairiyat is not a doctor and does not diagnose.",
          "خیریت ہر بات کا صرف مختصر خلاصہ اور سادہ اسکور محفوظ کرتا ہے، پوری گفتگو کبھی نہیں۔ خیریت ڈاکٹر نہیں اور بیماری کی تشخیص نہیں کرتا۔",
        )}
      </p>
    </>
  );
}

function TodayCard({ checkin, lang, t }: { checkin: Checkin } & Words) {
  const no = t("Not discussed", "ذکر نہیں ہوا");
  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-stone-900">{t("Latest check-in", "تازہ ترین بات")}</h2>
        <div className="flex items-center gap-2">
          {checkin.is_sample && <SampleTag />}
          <RiskBadge level={checkin.risk_level} />
        </div>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        {formatDay(checkin.created_at, lang)}, {formatTime(checkin.created_at, lang)}
      </p>
      <p dir="auto" className="mt-3 text-lg text-stone-900">{checkin.family_message || checkin.summary}</p>
      {checkin.family_message && <p dir="auto" className="mt-1 text-stone-600">{checkin.summary}</p>}

      {isFallbackSummary(checkin.summary) ? (
        <p className="mt-4 rounded-xl bg-stone-100 px-3 py-2 text-sm text-stone-700">
          {t("The AI summary isn't available for this call, so there are no scores. Any alerts are listed below.", "اس بات کا AI خلاصہ دستیاب نہیں، اس لیے اسکور نہیں ہیں۔ الرٹ نیچے درج ہیں۔")}
        </p>
      ) : (
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Fact label={t("Medicine", "دوائی")} value={yesNo(checkin.medicine_taken, t("Taken", "لے لی"), t("Missed", "رہ گئی"), no)} />
        <Fact label={t("Ate", "کھانا")} value={yesNo(checkin.ate, t("Yes", "ہاں"), t("No", "نہیں"), no)} />
        <Fact label={t("Mood (1-5)", "موڈ (1-5)")} value={checkin.mood?.toString() ?? "–"} />
        <Fact label={t("Sleep (1-5)", "نیند (1-5)")} value={checkin.sleep?.toString() ?? "–"} />
        <Fact label={t("Pain (0-10)", "درد (0-10)")} value={checkin.pain?.toString() ?? "–"} />
      </div>
      )}

      {checkin.alerts.length > 0 && (
        <ul className="mt-4 space-y-1">
          {checkin.alerts.map((a, i) => {
            const rule = getRule(a.category);
            return (
              <li key={i} className="text-sm text-stone-700">
                <span className="font-medium">{rule?.level === "urgent" ? "⚠" : "!"} {rule ? t(rule.title, rule.titleUr) : a.category}</span>
                {a.reason && <span className="text-stone-500"> · {a.reason}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// A preview of the messages written for the son/daughter (sent as notifications if alerts are on).
function PhonePreview({ childName, checkins, lang, t }: { childName: string; checkins: Checkin[] } & Words) {
  const messages = checkins.filter((c) => c.family_message).slice(0, 4);
  if (messages.length === 0) return null;
  return (
    <section className="mt-5">
      <h2 className="font-semibold text-stone-900">{t(`Message preview for ${childName}`, `${childName} کے لیے پیغام کا نمونہ`)}</h2>
      <p className="text-xs text-stone-500">{t("The short messages written for the family. Turn on alerts above to get them as notifications.", "گھر والوں کے لیے لکھے گئے مختصر پیغام۔ نوٹیفکیشن کے لیے اوپر الرٹ آن کریں۔")}</p>
      <div className="mt-2 rounded-3xl bg-stone-800 p-3 sm:max-w-sm">
        <div className="space-y-2 rounded-2xl bg-[#e5ddd5] p-3">
          {[...messages].reverse().map((c) => (
            <div key={c.id} className="max-w-[90%] rounded-xl rounded-tl-none bg-white px-3 py-2 text-sm text-stone-900 shadow-sm">
              <p className="font-semibold text-emerald-800">Khairiyat</p>
              <p dir="auto">
                {c.risk_level === "urgent" ? "🚨 " : c.risk_level === "concern" ? "🟠 " : "🌿 "}
                {c.family_message}
              </p>
              <p className="mt-0.5 text-end text-[11px] text-stone-500">
                {formatDay(c.created_at, lang)} {formatTime(c.created_at, lang)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Last 7 days, one value per day (the day's latest check-in).
function Trends({ checkins, nowMs, lang, t }: { checkins: Checkin[]; nowMs: number } & Words) {
  const byDay = new Map<string, Checkin>();
  // Check-ins without an AI summary have no scores, so they don't hide the day's scored one.
  for (const c of checkins) {
    if (!isFallbackSummary(c.summary) && !byDay.has(dayKey(c.created_at))) byDay.set(dayKey(c.created_at), c);
  }

  const days: { label: string; checkin: Checkin | undefined }[] = [];
  for (let i = 6; i >= 0; i--) {
    const iso = new Date(nowMs - i * 24 * 60 * 60 * 1000).toISOString();
    days.push({ label: i === 0 ? t("Today", "آج") : formatDay(iso, lang), checkin: byDay.get(dayKey(iso)) });
  }
  const series = (pick: (c: Checkin) => number | null): TrendPoint[] =>
    days.map((d) => ({ label: d.label, value: d.checkin ? pick(d.checkin) : null }));

  return (
    <section className="mt-6">
      <h2 className="font-semibold text-stone-900">{t("This week", "یہ ہفتہ")}</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <TrendChart title={t("Mood", "موڈ")} color={COLORS.mood} points={series((c) => c.mood)} min={1} max={5} note={t("1 = very low, 5 = very good", "1 = بہت خراب، 5 = بہت اچھا")} />
        <TrendChart title={t("Sleep", "نیند")} color={COLORS.sleep} points={series((c) => c.sleep)} min={1} max={5} note={t("1 = very bad, 5 = very good", "1 = بہت خراب، 5 = بہت اچھی")} />
        <TrendChart title={t("Pain", "درد")} color={COLORS.pain} points={series((c) => c.pain)} min={0} max={10} note={t("0 = no pain, 10 = worst", "0 = کوئی درد نہیں، 10 = شدید ترین")} />
      </div>
    </section>
  );
}

// Every check-in as a table: the accessible, exact view of the charts above.
function History({ checkins, lang, t }: { checkins: Checkin[] } & Words) {
  return (
    <section className="mt-6">
      <h2 className="font-semibold text-stone-900">{t("History", "پچھلی باتیں")}</h2>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[560px] text-start text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="px-3 py-2 text-start font-medium">{t("When", "کب")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("Summary", "خلاصہ")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("Mood", "موڈ")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("Sleep", "نیند")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("Pain", "درد")}</th>
              <th className="px-3 py-2 text-start font-medium">{t("Status", "حالت")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {checkins.map((c) => (
              <tr key={c.id} className="align-top">
                <td className="px-3 py-2 whitespace-nowrap text-stone-600">
                  {formatDay(c.created_at, lang)}
                  <div className="text-xs">{formatTime(c.created_at, lang)}</div>
                  {c.is_sample && <SampleTag />}
                </td>
                <td dir="auto" className="px-3 py-2 text-stone-800">{c.summary}</td>
                <td className="px-3 py-2">{c.mood ?? "–"}</td>
                <td className="px-3 py-2">{c.sleep ?? "–"}</td>
                <td className="px-3 py-2">{c.pain ?? "–"}</td>
                <td className="px-3 py-2"><RiskBadge level={c.risk_level} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
