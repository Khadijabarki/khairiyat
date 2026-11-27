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

export const metadata: Metadata = { title: "Khairiyat · Doctor report", robots: { index: false, follow: false } };
export const instant = false;

type ReportProps = {
  params: PageProps<"/family/[parentId]/report">["params"];
  searchParams: PageProps<"/family/[parentId]/report">["searchParams"];
};

export default function ReportPage({ params, searchParams }: PageProps<"/family/[parentId]/report">) {
  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-800 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
          <DoctorReport params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

// "2026-11-27" -> "27 Nov"
const shortDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });

const averageText = (m: Measure) => (m.average === null ? "–" : String(m.average));
const rangeText = (m: Measure) => (m.days === 0 ? "not discussed" : `${m.lowest} to ${m.highest}, ${m.days} day(s)`);

async function DoctorReport({ params, searchParams }: ReportProps) {
  const { parentId } = await params;
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId); // only this family's parents
  if (!parent) notFound();

  const month = reportMonth((await searchParams).month);
  const { checkins, unansweredDays, ok } = await getMonthData(parent.id, month);
  const report = buildReport(checkins);
  const link = "text-sm font-medium text-stone-700 hover:underline";

  return (
    <>
      <nav className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/family/${parent.id}`} className="text-sm text-stone-500 hover:underline">
          ← Back to {parent.nickname}
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/family/${parent.id}/report?month=${month.previousKey}`} className={link}>
            ‹ Previous month
          </Link>
          {month.nextKey && (
            <Link href={`/family/${parent.id}/report?month=${month.nextKey}`} className={link}>
              Next month ›
            </Link>
          )}
          {ok && report.checkins > 0 && <PrintButton />}
        </div>
      </nav>

      <header className="mt-5 border-b border-stone-300 pb-3 print:mt-0">
        <h1 className="text-2xl font-semibold text-stone-900">Monthly health report · {month.label}</h1>
        <p className="mt-1 text-stone-700">
          <span className="font-medium">{parent.name}</span> ({parent.nickname}) · prepared by Khairiyat for the family and doctor
        </p>
        <p className="mt-1 text-sm text-stone-600">
          Medicines listed by the family:{" "}
          {parent.medicines.length
            ? parent.medicines.map((m) => (m.when ? `${m.name} (${m.when})` : m.name)).join("; ")
            : "none listed"}
        </p>
      </header>

      <p className="mt-3 rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-700">
        These notes come from short conversations with an AI companion. They are self-reported, summarised and scored by AI, and may
        be incomplete or wrong. This is not a medical record or a diagnosis.
      </p>

      {!ok ? (
        <p role="alert" className="mt-5 rounded-xl bg-amber-100 p-3 text-amber-900">
          The report couldn&apos;t be loaded. Please try again.
        </p>
      ) : report.checkins === 0 ? (
        <p className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 text-stone-600">
          No check-ins in {month.label}.{unansweredDays > 0 && ` Days with an unanswered call: ${unansweredDays}.`}
        </p>
      ) : (
        <>
          {report.sampleCheckins > 0 && (
            <p className="mt-3 text-sm font-medium text-stone-700">
              Includes {report.sampleCheckins} sample check-in(s) made for the demo, not real conversations.
            </p>
          )}

          <section className="mt-5">
            <h2 className="font-semibold text-stone-900">The month at a glance</h2>
            <p className="mt-1 text-stone-700">
              {report.checkins} conversation(s) on {report.days.length} day(s). Days with an unanswered call: {unansweredDays}.
              Medicine reported taken on {report.medicine.yes} day(s) and missed on {report.medicine.no} day(s). Ate:{" "}
              {report.food.yes} day(s) yes, {report.food.no} day(s) no.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 print:grid-cols-3">
              <Fact label={`Mood average (1-5) · ${rangeText(report.mood)}`} value={averageText(report.mood)} />
              <Fact label={`Sleep average (1-5) · ${rangeText(report.sleep)}`} value={averageText(report.sleep)} />
              <Fact label={`Pain average (0-10) · ${rangeText(report.pain)}`} value={averageText(report.pain)} />
            </div>
          </section>

          <section className="mt-5">
            <h2 className="font-semibold text-stone-900">Warnings noticed</h2>
            {report.alerts.length === 0 ? (
              <p className="mt-1 text-stone-700">None recorded in the saved conversations.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {report.alerts.map((a) => {
                  const rule = getRule(a.category);
                  return (
                    <li key={a.category} className="text-stone-700">
                      <span className="font-medium">
                        {rule?.level === "urgent" ? "⚠ Urgent: " : ""}
                        {rule?.title ?? a.category}
                      </span>{" "}
                      · {a.days.length} day(s): {a.days.map(shortDay).join(", ")}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="mt-5">
            <h2 className="font-semibold text-stone-900">Day by day</h2>
            <div className="mt-2 overflow-x-auto rounded-2xl border border-stone-200 bg-white print:overflow-visible">
              <table className="w-full min-w-[620px] text-left text-sm print:min-w-0 print:text-xs">
                <thead className="bg-stone-100 text-stone-600">
                  <tr>
                    {["Day", "Mood", "Sleep", "Pain", "Medicine", "Ate", "Notes (Roman Urdu)"].map((h) => (
                      <th key={h} className="px-2 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {report.days.map((d) => (
                    <tr key={d.day} className="break-inside-avoid align-top">
                      <td className="px-2 py-2 whitespace-nowrap">{shortDay(d.day)}</td>
                      <td className="px-2 py-2">{d.mood ?? "–"}</td>
                      <td className="px-2 py-2">{d.sleep ?? "–"}</td>
                      <td className="px-2 py-2">{d.pain ?? "–"}</td>
                      <td className="px-2 py-2">{d.medicineTaken === null ? "–" : yesNo(d.medicineTaken, "Taken", "Missed")}</td>
                      <td className="px-2 py-2">{d.ate === null ? "–" : yesNo(d.ate, "Yes", "No")}</td>
                      <td className="px-2 py-2">
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
              Mood and sleep: 1 = very bad, 5 = very good. Pain: 0 = none, 10 = worst (highest of the day). A dash means it was not
              discussed. Dates are Pakistan time.
            </p>
          </section>
        </>
      )}
    </>
  );
}
