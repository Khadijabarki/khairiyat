// The monthly report for the doctor: one parent, one month, made to be printed or saved as PDF.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PrintButton from "@/components/family/PrintButton";
import { yesNo } from "@/components/family/parts";
import Icon from "@/components/ui/Icon";
import { requireUser } from "@/lib/auth";
import { getFamilyParent } from "@/lib/data";
import { buildReport, reportMonth, type Measure } from "@/lib/report";
import { getMonthData } from "@/lib/report-data";
import { getRule } from "@/lib/safety";
import { getLang } from "@/lib/i18n-server";
import { parentNames, translator, type Lang } from "@/lib/i18n";
import BackLink from "@/components/ui/BackLink";
import Loading from "@/components/ui/Loading";

export const metadata: Metadata = { title: "Khairiyat · Doctor report", robots: { index: false, follow: false } };
export const instant = false;

type ReportProps = {
  params: PageProps<"/family/[parentId]/report">["params"];
  searchParams: PageProps<"/family/[parentId]/report">["searchParams"];
};

export default function ReportPage({ params, searchParams }: PageProps<"/family/[parentId]/report">) {
  return (
    <main className="ui-page print:min-h-0 print:bg-none print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl">
        <Suspense fallback={<Loading />}>
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
  const lang = await getLang();
  const t = translator(lang);
  const { nickname } = parentNames(parent, lang);
  const monthButton = "ui-btn ui-btn-secondary !min-h-10 !px-4";
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
        <BackLink href={`/family/${parent.id}`} label={t(`Back to ${nickname}`, `${nickname} پر واپس`)} />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link href={`/family/${parent.id}/report?month=${month.previousKey}`} className={monthButton}>
            {t("‹ Previous month", "پچھلا مہینہ")}
          </Link>
          {month.nextKey && (
            <Link href={`/family/${parent.id}/report?month=${month.nextKey}`} className={monthButton}>
              {t("Next month ›", "اگلا مہینہ")}
            </Link>
          )}
          {ok && report.checkins > 0 && <PrintButton />}
        </div>
      </nav>

      {/* The sheet the doctor sees: a card on screen, a plain page on paper. */}
      <article className="report-sheet ui-card mt-2 overflow-hidden print:mt-0 print:rounded-none print:border-0 print:bg-white print:shadow-none">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-emerald-700 bg-sage-soft px-5 py-4 sm:px-8 print:rounded-xl print:px-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-700 text-white">
              <Icon name="heart" className="size-6" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-2xl font-semibold text-stone-900">Khairiyat</span>
              <span className="font-urdu block text-sm leading-[1.9] text-emerald-700">خیریت</span>
            </span>
          </div>
          <div className="sm:text-end print:text-end">
            <h1 className="text-xl font-semibold text-stone-900 sm:text-2xl">{t("Monthly Health Report", "صحت کی ماہانہ رپورٹ")}</h1>
            <p className="text-sm font-medium text-emerald-800">{monthLabel}</p>
          </div>
        </header>

        <div className="space-y-6 px-5 py-5 sm:px-8 print:space-y-4 print:px-0 print:py-4">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 print:grid-cols-2">
            <Detail label={t("Name", "نام")}>
              {parent.name} ({nickname})
            </Detail>
            <Detail label={t("Prepared for", "کس کے لیے")}>{t("The family and doctor", "گھر والے اور ڈاکٹر")}</Detail>
            <div className="sm:col-span-2 print:col-span-2">
              <Detail label={t("Medicines listed by the family", "گھر والوں کی لکھی دوائیاں")}>
                {parent.medicines.length
                  ? parent.medicines.map((m) => (m.when ? `${m.name} (${m.when})` : m.name)).join("; ")
                  : t("None listed", "کوئی نہیں")}
              </Detail>
            </div>
          </dl>

          <p className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-950 print:border print:border-stone-300">
            {t("These notes come from short conversations with an AI companion. They are self-reported, summarised and scored by AI, and may be incomplete or wrong. This is not a medical record or a diagnosis.", "یہ نوٹس AI ساتھی سے مختصر باتوں سے بنے ہیں۔ یہ ان کے اپنے بیان ہیں، AI نے خلاصہ اور اسکور بنائے ہیں، اور یہ ادھورے یا غلط ہو سکتے ہیں۔ یہ طبی ریکارڈ یا تشخیص نہیں۔")}
          </p>

          {!ok ? (
            <p role="alert" className="rounded-xl bg-amber-100 p-3 text-amber-900">
              {t("The report couldn't be loaded. Please try again.", "رپورٹ نہیں کھل سکی۔ دوبارہ کوشش کریں۔")}
            </p>
          ) : report.checkins === 0 ? (
            <p className="rounded-xl border border-stone-200 p-5 text-stone-600">
              {t(`No check-ins in ${monthLabel}.`, `${monthLabel} میں کوئی بات نہیں ہوئی۔`)}
              {unansweredDays > 0 && t(` Days with an unanswered call: ${unansweredDays}.`, ` جن دنوں کال کا جواب نہیں ملا: ${unansweredDays}۔`)}
            </p>
          ) : (
            <>
              {report.sampleCheckins > 0 && (
                <p className="text-sm font-medium text-stone-700">
                  {t(`Includes ${report.sampleCheckins} sample check-in(s) made for the demo, not real conversations.`, `اس میں ${report.sampleCheckins} نمونے کی باتیں شامل ہیں جو ڈیمو کے لیے بنائی گئیں، اصلی نہیں۔`)}
                </p>
              )}

              <section>
                <h2 className={SECTION}>{t("Month at a Glance", "مہینے پر ایک نظر")}</h2>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 print:grid-cols-4">
                  <Stat label={t("Conversations", "بات چیت")} value={String(report.checkins)} note={t(`on ${report.days.length} day(s)`, `${report.days.length} دن میں`)} />
                  <Stat label={t("Unanswered calls", "بغیر جواب کال")} value={String(unansweredDays)} note={t("day(s)", "دن")} />
                  <Stat label={t("Medicine taken", "دوائی لی")} value={String(report.medicine.yes)} note={t(`day(s) · missed ${report.medicine.no}`, `دن · رہ گئی ${report.medicine.no}`)} />
                  <Stat label={t("Ate", "کھانا کھایا")} value={String(report.food.yes)} note={t(`day(s) · not eaten ${report.food.no}`, `دن · نہیں کھایا ${report.food.no}`)} />
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3 print:grid-cols-3">
                  <Stat label={t("Mood average (1-5)", "اوسط موڈ (1-5)")} value={averageText(report.mood)} note={rangeText(report.mood)} />
                  <Stat label={t("Sleep average (1-5)", "اوسط نیند (1-5)")} value={averageText(report.sleep)} note={rangeText(report.sleep)} />
                  <Stat label={t("Pain average (0-10)", "اوسط درد (0-10)")} value={averageText(report.pain)} note={rangeText(report.pain)} />
                </div>
              </section>

              <section className="break-inside-avoid">
                <h2 className={SECTION}>{t("Health Warnings", "نظر آنے والے خطرے")}</h2>
                {report.alerts.length === 0 ? (
                  <p className="mt-2 text-sm text-stone-700">{t("None recorded in the saved conversations.", "محفوظ باتوں میں کوئی نہیں۔")}</p>
                ) : (
                  <ul className="mt-2 divide-y divide-stone-200 rounded-xl border border-stone-200">
                    {report.alerts.map((a) => {
                      const rule = getRule(a.category);
                      const urgent = rule?.level === "urgent";
                      return (
                        <li key={a.category} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-2 text-sm text-stone-700">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${urgent ? "bg-rose-600 text-white" : "bg-amber-100 text-amber-950"}`}>
                            {urgent ? t("Urgent", "فوری") : t("Concern", "فکر")}
                          </span>
                          <span className="font-semibold text-stone-900">{rule ? t(rule.title, rule.titleUr) : a.category}</span>
                          <span className="ms-auto text-stone-600">
                            {t(`${a.days.length} day(s)`, `${a.days.length} دن`)}: {a.days.map((d) => shortDay(d, lang)).join(lang === "ur" ? "، " : ", ")}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section>
                <h2 className={SECTION}>{t("Daily Record", "دن بہ دن")}</h2>
                <div className="mt-2 overflow-x-auto rounded-xl border border-stone-200 print:overflow-visible">
                  <table className="w-full min-w-[620px] text-start text-sm print:min-w-0 print:text-[11px]">
                    <thead className="bg-sage-soft text-stone-800">
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
                          <th key={h} className="px-3 py-2 text-start font-semibold print:px-2">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 text-stone-800">
                      {report.days.map((d) => (
                        <tr key={d.day} className="break-inside-avoid align-top even:bg-stone-50">
                          <td className="px-3 py-2 font-medium whitespace-nowrap print:px-2">{shortDay(d.day, lang)}</td>
                          <td className="px-3 py-2 print:px-2">{d.mood ?? "–"}</td>
                          <td className="px-3 py-2 print:px-2">{d.sleep ?? "–"}</td>
                          <td className="px-3 py-2 print:px-2">{d.pain ?? "–"}</td>
                          <td className="px-3 py-2 print:px-2">{d.medicineTaken === null ? "–" : yesNo(d.medicineTaken, t("Taken", "لے لی"), t("Missed", "رہ گئی"))}</td>
                          <td className="px-3 py-2 print:px-2">{d.ate === null ? "–" : yesNo(d.ate, t("Yes", "ہاں"), t("No", "نہیں"))}</td>
                          <td dir="auto" className="px-3 py-2 print:px-2">
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

          <footer className="border-t border-stone-200 pt-3 text-center text-xs text-stone-500">
            {t("Prepared by Khairiyat", "خیریت کی تیار کردہ")} · khairiyat.vercel.app
          </footer>
        </div>
      </article>
    </>
  );
}

const SECTION = "border-b border-stone-200 pb-1 text-lg font-semibold text-stone-900";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-stone-900">{children}</dd>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="break-inside-avoid rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
      <p className="text-xs font-medium text-stone-600">{label}</p>
      <p className="font-display text-2xl font-semibold text-emerald-800">{value}</p>
      <p className="text-xs text-stone-500">{note}</p>
    </div>
  );
}
