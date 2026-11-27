import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import FamilyAlerts from "@/components/family/FamilyAlerts";
import { RiskBadge, SampleTag, SignOutButton } from "@/components/family/parts";
import { demoEmail, requireUser } from "@/lib/auth";
import { formatDay, formatTime, getDashboardData } from "@/lib/dashboard";
import { getFamilyParents } from "@/lib/data";
import { vapidPublicKey } from "@/lib/push";
import { getLang } from "@/lib/i18n-server";
import { parentNames, translator } from "@/lib/i18n";

// Private health information: never in search results.
export const metadata: Metadata = { title: "Family · Khairiyat", robots: { index: false, follow: false } };
// Depends on who is signed in, so it is rendered per request.
export const instant = false;

export default function FamilyPage() {
  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-800">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<p className="text-stone-500">…</p>}>
          <FamilyHome />
        </Suspense>
      </div>
    </main>
  );
}

async function FamilyHome() {
  const user = await requireUser();
  const parents = await getFamilyParents(user.id);
  const lang = await getLang();
  const t = translator(lang);
  const latest = await Promise.all(parents.map(async (p) => (await getDashboardData(p.id)).checkins[0] ?? null));

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-urdu text-2xl leading-[1.9] text-emerald-800">خیریت</p>
          <h1 className="text-lg font-semibold text-stone-900">{t("Your family", "آپ کا خاندان")}</h1>
          <p className="text-sm text-stone-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/family/new" className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            {t("+ Add a parent", "+ والدین شامل کریں")}
          </Link>
          <SignOutButton />
        </div>
      </header>

      <FamilyAlerts vapidPublicKey={vapidPublicKey()} isDemo={user.email === demoEmail()} />

      {parents.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 text-center">
          <h2 className="text-lg font-semibold text-stone-900">{t("Add your first parent", "پہلے والدین شامل کریں")}</h2>
          <p className="mt-1 text-stone-600">
            {t("Tell Khairiyat about Ammi or Abbu: their medicines and a daily call time. You'll get a link to open on their phone.", "خیریت کو امی یا ابو کے بارے میں بتائیں: ان کی دوائیاں اور روز کال کا وقت۔ پھر ان کے فون پر کھولنے کے لیے ایک لنک ملے گا۔")}
          </p>
          <Link href="/family/new" className="mt-4 inline-block rounded-xl bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">
            {t("+ Add a parent", "+ والدین شامل کریں")}
          </Link>
        </section>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
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
                      {parentNames(parent, lang).nickname} <span className="font-normal text-stone-500">· {parent.name}</span>
                    </h2>
                    {last && <RiskBadge level={last.risk_level} />}
                  </div>
                  {last ? (
                    <>
                      <p className="mt-2 text-stone-700">{last.family_message || last.summary}</p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-stone-500">
                        {t("Last check-in:", "آخری بات:")} {formatDay(last.created_at, lang)}, {formatTime(last.created_at, lang)}
                        {last.is_sample && <SampleTag />}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-stone-500">{t("No check-ins yet. Daily call at", "ابھی کوئی بات نہیں ہوئی۔ روز کال کا وقت")} <bdi dir="ltr">{parent.checkinTime}</bdi></p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
