import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RiskBadge, SampleTag, SignInForm, SignOutButton } from "@/components/family/parts";
import { formatDay, formatTime, getDashboardData } from "@/lib/dashboard";
import { getParents } from "@/lib/data";
import { isFamilySignedIn } from "@/lib/family-auth";

// Private health information: never in search results.
export const metadata: Metadata = { title: "Khairiyat · Family", robots: { index: false, follow: false } };
// The page depends on the visitor's cookie, so it is rendered per request.
export const instant = false;

export default function FamilyPage({ searchParams }: PageProps<"/family">) {
  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-800">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="font-urdu text-2xl leading-[1.9] text-emerald-800">خیریت</p>
            <h1 className="text-lg font-semibold text-stone-900">Family dashboard</h1>
          </div>
        </header>
        <Suspense fallback={<p className="mt-8 text-stone-500">Loading…</p>}>
          <FamilyHome searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function FamilyHome({ searchParams }: { searchParams: PageProps<"/family">["searchParams"] }) {
  if (!(await isFamilySignedIn())) {
    const { error } = await searchParams;
    return <SignInForm error={typeof error === "string" ? error : undefined} />;
  }

  const parents = await getParents();
  const latest = await Promise.all(parents.map(async (p) => (await getDashboardData(p.id)).checkins[0] ?? null));

  return (
    <>
      <div className="mt-2 flex justify-end">
        <SignOutButton />
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {parents.map((parent, i) => {
          const last = latest[i];
          return (
            <li key={parent.id}>
              <Link
                href={`/family/${parent.id}`}
                className="block h-full rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-emerald-400"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-stone-900">
                    {parent.nickname} <span className="font-normal text-stone-500">· {parent.name}</span>
                  </h2>
                  {last && <RiskBadge level={last.risk_level} />}
                </div>
                {last ? (
                  <>
                    <p className="mt-2 text-stone-700">{last.family_message || last.summary}</p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-stone-500">
                      Last check-in: {formatDay(last.created_at)}, {formatTime(last.created_at)}
                      {last.is_sample && <SampleTag />}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-stone-500">No check-ins yet.</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
