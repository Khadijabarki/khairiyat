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
import { getFamilyParent, type Parent } from "@/lib/data";
import type { Checkin } from "@/lib/db";
import { getRule } from "@/lib/safety";

export const metadata: Metadata = { title: "Khairiyat · Family", robots: { index: false, follow: false } };
export const instant = false;

// Alerts raised by the system itself (not by something said in a call).
const SYSTEM_ALERTS: Record<string, string> = { no_answer: "No answer to today's call" };

// Chart colours: validated categorical slots 1-3 (blue, orange, aqua).
const COLORS = { mood: "#2a78d6", sleep: "#eb6834", pain: "#1baf7a" };

export default function ParentDashboardPage({ params, searchParams }: PageProps<"/family/[parentId]">) {
  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-800">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
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

  return (
    <>
      <AutoRefresh seconds={10} />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/family" className="text-sm text-stone-500 hover:underline">
            ← Your family
          </Link>
          <h1 className="text-2xl font-semibold text-stone-900">
            {parent.nickname} <span className="font-normal text-stone-500">· {parent.name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/family/${parent.id}/edit`} className="text-sm font-medium text-stone-700 hover:underline">
            Edit
          </Link>
          <Link
            href={`/talk/${parent.talkToken}`}
            className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Open {parent.nickname}&apos;s talk screen
          </Link>
          <SignOutButton />
        </div>
      </header>

      {justAdded && (
        <p role="status" className="mt-4 rounded-xl bg-emerald-100 p-3 text-emerald-900">
          {parent.nickname} has been added. Now open the link below on {parent.nickname}&apos;s phone.
        </p>
      )}

      {!databaseReady && (
        <p className="mt-4 rounded-xl bg-amber-100 p-3 text-amber-900">
          The database is not set up yet: run <code>supabase/schema.sql</code> in Supabase.
        </p>
      )}

      {/* Live alerts from calls in the last 24 hours (emergencies reach the family during the call). */}
      {liveAlerts.length > 0 && (
        <section aria-label="Alerts today" className="mt-5 space-y-2">
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
                  {urgent ? "⚠ Urgent" : "! Needs attention"}: {rule?.title ?? SYSTEM_ALERTS[a.category] ?? a.category}
                  <span className="font-normal opacity-80"> · {formatTime(a.created_at)}</span>
                </p>
                {a.reason && <p className="mt-0.5">{a.reason}</p>}
                {urgent && <p className="mt-1 text-sm">Please call {parent.nickname} now. If there is no answer, call 1122.</p>}
              </div>
            );
          })}
        </section>
      )}

      <FamilyAlerts vapidPublicKey={vapidPublicKey()} isDemo={parent.isDemo} />

      <CallPanel parent={parent} devices={devices} lastCall={lastCall} />

      <ParentMessages parent={parent} ready={fromParent.ready} messages={fromParent.messages} />

      <VoicePanel parent={parent} status={voice} />

      <p className="mt-4">
        <Link
          href={`/family/${parent.id}/report`}
          className="inline-block rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:border-emerald-500"
        >
          🩺 Monthly report for the doctor
        </Link>
      </p>

      {latest ? <TodayCard checkin={latest} /> : (
        <p className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 text-stone-600">
          No check-ins yet. Open {parent.nickname}&apos;s talk screen to have the first conversation.
        </p>
      )}

      {/* A new parent needs the phone set-up first; after that it moves to the bottom. */}
      {checkins.length === 0 && <ShareLink parent={parent} />}

      {checkins.length > 0 && <PhonePreview parent={parent} checkins={checkins} />}
      {checkins.length > 0 && <Trends checkins={checkins} nowMs={nowMs} />}
      {checkins.length > 0 && <History checkins={checkins} />}
      {checkins.length > 0 && <ShareLink parent={parent} />}

      <p className="mt-8 text-center text-xs text-stone-500">
        Khairiyat saves only a short summary and simple scores of each call, never the full conversation.
        Khairiyat is not a doctor and does not diagnose.
      </p>
    </>
  );
}

function TodayCard({ checkin }: { checkin: Checkin }) {
  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-stone-900">Latest check-in</h2>
        <div className="flex items-center gap-2">
          {checkin.is_sample && <SampleTag />}
          <RiskBadge level={checkin.risk_level} />
        </div>
      </div>
      <p className="mt-1 text-sm text-stone-500">
        {formatDay(checkin.created_at)}, {formatTime(checkin.created_at)}
      </p>
      <p className="mt-3 text-lg text-stone-900">{checkin.family_message || checkin.summary}</p>
      {checkin.family_message && <p className="mt-1 text-stone-600">{checkin.summary}</p>}

      {isFallbackSummary(checkin.summary) ? (
        <p className="mt-4 rounded-xl bg-stone-100 px-3 py-2 text-sm text-stone-700">
          The AI summary isn&apos;t available for this call, so there are no scores. Any alerts are listed below.
        </p>
      ) : (
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Fact label="Medicine" value={yesNo(checkin.medicine_taken, "Taken", "Missed")} />
        <Fact label="Ate" value={yesNo(checkin.ate, "Yes", "No")} />
        <Fact label="Mood (1-5)" value={checkin.mood?.toString() ?? "–"} />
        <Fact label="Sleep (1-5)" value={checkin.sleep?.toString() ?? "–"} />
        <Fact label="Pain (0-10)" value={checkin.pain?.toString() ?? "–"} />
      </div>
      )}

      {checkin.alerts.length > 0 && (
        <ul className="mt-4 space-y-1">
          {checkin.alerts.map((a, i) => {
            const rule = getRule(a.category);
            return (
              <li key={i} className="text-sm text-stone-700">
                <span className="font-medium">{rule?.level === "urgent" ? "⚠" : "!"} {rule?.title ?? a.category}</span>
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
function PhonePreview({ parent, checkins }: { parent: Parent; checkins: Checkin[] }) {
  const messages = checkins.filter((c) => c.family_message).slice(0, 4);
  if (messages.length === 0) return null;
  return (
    <section className="mt-5">
      <h2 className="font-semibold text-stone-900">Message preview for {parent.childName}</h2>
      <p className="text-xs text-stone-500">The short messages written for the family. Turn on alerts above to get them as notifications.</p>
      <div className="mt-2 rounded-3xl bg-stone-800 p-3 sm:max-w-sm">
        <div className="space-y-2 rounded-2xl bg-[#e5ddd5] p-3">
          {[...messages].reverse().map((c) => (
            <div key={c.id} className="max-w-[90%] rounded-xl rounded-tl-none bg-white px-3 py-2 text-sm text-stone-900 shadow-sm">
              <p className="font-semibold text-emerald-800">Khairiyat</p>
              <p>
                {c.risk_level === "urgent" ? "🚨 " : c.risk_level === "concern" ? "🟠 " : "🌿 "}
                {c.family_message}
              </p>
              <p className="mt-0.5 text-right text-[11px] text-stone-500">
                {formatDay(c.created_at)} {formatTime(c.created_at)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Last 7 days, one value per day (the day's latest check-in).
function Trends({ checkins, nowMs }: { checkins: Checkin[]; nowMs: number }) {
  const byDay = new Map<string, Checkin>();
  // Check-ins without an AI summary have no scores, so they don't hide the day's scored one.
  for (const c of checkins) {
    if (!isFallbackSummary(c.summary) && !byDay.has(dayKey(c.created_at))) byDay.set(dayKey(c.created_at), c);
  }

  const days: { label: string; checkin: Checkin | undefined }[] = [];
  for (let i = 6; i >= 0; i--) {
    const iso = new Date(nowMs - i * 24 * 60 * 60 * 1000).toISOString();
    days.push({ label: i === 0 ? "Today" : formatDay(iso), checkin: byDay.get(dayKey(iso)) });
  }
  const series = (pick: (c: Checkin) => number | null): TrendPoint[] =>
    days.map((d) => ({ label: d.label, value: d.checkin ? pick(d.checkin) : null }));

  return (
    <section className="mt-6">
      <h2 className="font-semibold text-stone-900">This week</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <TrendChart title="Mood" color={COLORS.mood} points={series((c) => c.mood)} min={1} max={5} note="1 = very low, 5 = very good" />
        <TrendChart title="Sleep" color={COLORS.sleep} points={series((c) => c.sleep)} min={1} max={5} note="1 = very bad, 5 = very good" />
        <TrendChart title="Pain" color={COLORS.pain} points={series((c) => c.pain)} min={0} max={10} note="0 = no pain, 10 = worst" />
      </div>
    </section>
  );
}

// Every check-in as a table: the accessible, exact view of the charts above.
function History({ checkins }: { checkins: Checkin[] }) {
  return (
    <section className="mt-6">
      <h2 className="font-semibold text-stone-900">History</h2>
      <div className="mt-2 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Summary</th>
              <th className="px-3 py-2 font-medium">Mood</th>
              <th className="px-3 py-2 font-medium">Sleep</th>
              <th className="px-3 py-2 font-medium">Pain</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {checkins.map((c) => (
              <tr key={c.id} className="align-top">
                <td className="px-3 py-2 whitespace-nowrap text-stone-600">
                  {formatDay(c.created_at)}
                  <div className="text-xs">{formatTime(c.created_at)}</div>
                  {c.is_sample && <SampleTag />}
                </td>
                <td className="px-3 py-2 text-stone-800">{c.summary}</td>
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
