// The monthly report for the doctor: one parent, one month, made to be printed or saved as PDF.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PrintButton from "@/components/family/PrintButton";
import { Fact, yesNo } from "@/components/family/parts";
import { requireUser } from "@/lib/auth";
import { getFamilyParent } from "@/lib/data";
import { buildReport, reportMonth, type Measure } from "@/lib/report";
import { getMonthData } from "@/lib/report-data";
import { getRule } from "@/lib/safety";
import { getLang } from "@/lib/i18n-server";
import { parentNames, translator, type Lang } from "@/lib/i18n";

export const metadata: Metadata = { title: "Khairiyat · Doctor report", robots: { index: false, follow: false } };
export const instant = false;

type ReportProps = {
  params: PageProps<"/family/[parentId]/report">["params"];
  searchParams: PageProps<"/family/[parentId]/report">["searchParams"];
};

export default function ReportPage({ params, searchParams }: PageProps<"/family/[parentId]/report">) {
  return (
    <main className="ui-page print:min-h-0 print:bg-none print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<p className="text-stone-500">…</p>}>
          <DoctorReport params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

// "2026-11-27" -> "27 Nov"
const shortDay = (day: string, lang: Lang) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString(lang === "ur" ? "ur-PK-u-nu-latn" : "en-GB", { timeZone: "UTC", day: "numeric", month: "short" });

const averageText = (m: Measure) => (m.average === null ? "–" : String(m.average));

async function DoctorReport({ params, searchParams }: ReportProps) {
  const { parentId } = await params;
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId); // only this family's parents
  if (!parent) notFound();

  const month = reportMonth((await searchParams).month);
  const { checkins, unansweredDays, ok } = await getMonthData(parent.id, month);
  const report = buildReport(checkins);
  const link = "text-sm font-medium text-stone-700 hover:underline";
  const lang = await getLang();
  const t = translator(lang);
  const { nickname } = parentNames(parent, lang);
  const monthLabel =
    lang === "ur"
      ? new Date(`${month.key}-15T00:00:00Z`).toLocaleDateString("ur-PK-u-nu-latn", { timeZone: "UTC", month: "long", year: "numeric" })
      : month.label;
  const rangeText = (m: Measure) =>
    m.days === 0
      ? t("not discussed", "ذکر نہیں ہوا")
      : t(`${m.lowest} to ${m.highest}, ${m.days} day(s)`, `${m.lowest} سے ${m.highest}، ${m.days} دن`);

  return (
    <>
      <nav className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/family/${parent.id}`} className="text-sm text-stone-500 hover:underline">
          {t(`← Back to ${nickname}`, `→ ${nickname} پر واپس`)}
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/family/${parent.id}/report?month=${month.previousKey}`} className={link}>
            {t("‹ Previous month", "پچھلا مہینہ")}
          </Link>
          {month.nextKey && (
            <Link href={`/family/${parent.id}/report?month=${month.nextKey}`} className={link}>
              {t("Next month ›", "اگلا مہینہ")}
            </Link>
          )}
          {ok && report.checkins > 0 && <PrintButton />}
        </div>
      </nav>

      <header className="mt-5 border-b border-stone-300 pb-3 print:mt-0">
        <h1 className="text-2xl font-semibold text-stone-900">{t("Monthly Health Report", "صحت کی ماہانہ رپورٹ")} · {monthLabel}</h1>
        <p className="mt-1 text-stone-700">
          <span className="font-medium">{parent.name}</span> ({nickname}) · {t("prepared by Khairiyat for the family and doctor", "گھر والوں اور ڈاکٹر کے لیے خیریت کی تیار کردہ")}
        </p>
        <p className="mt-1 text-sm text-stone-600">
          {t("Medicines listed by the family:", "گھر والوں کی لکھی دوائیاں:")}{" "}
          {parent.medicines.length
            ? parent.medicines.map((m) => (m.when ? `${m.name} (${m.when})` : m.name)).join("; ")
            : t("none listed", "کوئی نہیں")}
        </p>
      </header>

      <p className="mt-3 rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-700">
        {t("These notes come from short conversations with an AI companion. They are self-reported, summarised and scored by AI, and may be incomplete or wrong. This is not a medical record or a diagnosis.", "یہ نوٹس AI ساتھی سے مختصر باتوں سے بنے ہیں۔ یہ والدین کے اپنے بیان ہیں، AI نے خلاصہ اور اسکور بنائے ہیں، اور یہ ادھورے یا غلط ہو سکتے ہیں۔ یہ طبی ریکارڈ یا تشخیص نہیں۔")}
      </p>

      {!ok ? (
        <p role="alert" className="mt-5 rounded-xl bg-amber-100 p-3 text-amber-900">
          {t("The report couldn't be loaded. Please try again.", "رپورٹ نہیں کھل سکی۔ دوبارہ کوشش کریں۔")}
        </p>
      ) : report.checkins === 0 ? (
        <p className="mt-5 ui-card p-5 text-stone-600">
          {t(`No check-ins in ${monthLabel}.`, `${monthLabel} میں کوئی بات نہیں ہوئی۔`)}
          {unansweredDays > 0 && t(` Days with an unanswered call: ${unansweredDays}.`, ` جن دنوں کال کا جواب نہیں ملا: ${unansweredDays}۔`)}
        </p>
      ) : (
        <>
          {report.sampleCheckins > 0 && (
            <p className="mt-3 text-sm font-medium text-stone-700">
              {t(`Includes ${report.sampleCheckins} sample check-in(s) made for the demo, not real conversations.`, `اس میں ${report.sampleCheckins} نمونے کی باتیں شامل ہیں جو ڈیمو کے لیے بنائی گئیں، اصلی نہیں۔`)}
            </p>
          )}

          <section className="mt-5">
            <h2 className="text-lg font-semibold text-stone-900">{t("Month at a Glance", "مہینے پر ایک نظر")}</h2>
            <p className="mt-1 text-stone-700">
              {t(
                `${report.checkins} conversation(s) on ${report.days.length} day(s). Days with an unanswered call: ${unansweredDays}. Medicine reported taken on ${report.medicine.yes} day(s) and missed on ${report.medicine.no} day(s). Ate: ${report.food.yes} day(s) yes, ${report.food.no} day(s) no.`,
                `${report.days.length} دن میں ${report.checkins} بار بات ہوئی۔ جن دنوں کال کا جواب نہیں ملا: ${unansweredDays}۔ دوائی لی: ${report.medicine.yes} دن، رہ گئی: ${report.medicine.no} دن۔ کھانا کھایا: ${report.food.yes} دن، نہیں کھایا: ${report.food.no} دن۔`,
              )}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 print:grid-cols-3">
              <Fact label={`${t("Mood average (1-5)", "اوسط موڈ (1-5)")} · ${rangeText(report.mood)}`} value={averageText(report.mood)} />
              <Fact label={`${t("Sleep average (1-5)", "اوسط نیند (1-5)")} · ${rangeText(report.sleep)}`} value={averageText(report.sleep)} />
              <Fact label={`${t("Pain average (0-10)", "اوسط درد (0-10)")} · ${rangeText(report.pain)}`} value={averageText(report.pain)} />
            </div>
          </section>

          <section className="mt-5">
            <h2 className="text-lg font-semibold text-stone-900">{t("Health Warnings", "نظر آنے والے خطرے")}</h2>
            {report.alerts.length === 0 ? (
              <p className="mt-1 text-stone-700">{t("None recorded in the saved conversations.", "محفوظ باتوں میں کوئی نہیں۔")}</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {report.alerts.map((a) => {
                  const rule = getRule(a.category);
                  return (
                    <li key={a.category} className="text-stone-700">
                      <span className="font-medium">
                        {rule?.level === "urgent" ? t("⚠ Urgent: ", "⚠ فوری: ") : ""}
                        {rule ? t(rule.title, rule.titleUr) : a.category}
                      </span>{" "}
                      · {t(`${a.days.length} day(s)`, `${a.days.length} دن`)}: {a.days.map((d) => shortDay(d, lang)).join(lang === "ur" ? "، " : ", ")}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="mt-5">
            <h2 className="text-lg font-semibold text-stone-900">{t("Daily Record", "دن بہ دن")}</h2>
            <div className="mt-2 overflow-x-auto ui-card print:overflow-visible">
              <table className="w-full min-w-[620px] text-start text-sm print:min-w-0 print:text-xs">
                <thead className="bg-stone-100 text-stone-600">
                  <tr>
                    {[
                      t("Day", "دن"),
                      t("Mood", "موڈ"),
                      t("Sleep", "نیند"),
                      t("Pain", "درد"),
                      t("Medicine", "دوائی"),
                      t("Ate", "کھانا"),
                      t("Notes (Roman Urdu)", "نوٹس (رومن اردو)"),
                    ].map((h) => (
                      <th key={h} className="px-2 py-2 text-start font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {report.days.map((d) => (
                    <tr key={d.day} className="break-inside-avoid align-top">
                      <td className="px-2 py-2 whitespace-nowrap">{shortDay(d.day, lang)}</td>
                      <td className="px-2 py-2">{d.mood ?? "–"}</td>
                      <td className="px-2 py-2">{d.sleep ?? "–"}</td>
                      <td className="px-2 py-2">{d.pain ?? "–"}</td>
                      <td className="px-2 py-2">{d.medicineTaken === null ? "–" : yesNo(d.medicineTaken, t("Taken", "لے لی"), t("Missed", "رہ گئی"))}</td>
                      <td className="px-2 py-2">{d.ate === null ? "–" : yesNo(d.ate, t("Yes", "ہاں"), t("No", "نہیں"))}</td>
                      <td dir="auto" className="px-2 py-2">
                        {d.summaries.map((s, i) => (
                          <p key={i}>{s}</p>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-stone-500">
              {t("Mood and sleep: 1 = very bad, 5 = very good. Pain: 0 = none, 10 = worst (highest of the day). A dash means it was not discussed. Dates are Pakistan time.", "موڈ اور نیند: 1 = بہت خراب، 5 = بہت اچھا۔ درد: 0 = کوئی نہیں، 10 = شدید ترین (دن کا سب سے زیادہ)۔ لکیر کا مطلب ہے ذکر نہیں ہوا۔ تاریخیں پاکستان کے وقت کے مطابق ہیں۔")}
            </p>
          </section>
        </>
      )}
    </>
  );
}
