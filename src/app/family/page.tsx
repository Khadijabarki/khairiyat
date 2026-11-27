import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import FamilyAlerts from "@/components/family/FamilyAlerts";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import { photoUrls } from "@/lib/photos";
import { RiskBadge, SampleTag, SignOutButton } from "@/components/family/parts";
import { demoEmail, requireUser } from "@/lib/auth";
import { formatDay, formatTime, getDashboardData } from "@/lib/dashboard";
import { getFamilyParents } from "@/lib/data";
import { callSlots } from "@/lib/time";
import { vapidPublicKey } from "@/lib/push";
import { getLang } from "@/lib/i18n-server";
import { parentNames, translator } from "@/lib/i18n";
import { relationLabel } from "@/lib/relations";

// Private health information: never in search results.
export const metadata: Metadata = { title: "Family · Khairiyat", robots: { index: false, follow: false } };
// Depends on who is signed in, so it is rendered per request.
export const instant = false;

export default function FamilyPage() {
  return (
    <main className="ui-page">
      <div className="mx-auto max-w-5xl">
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
  const [latest, photos] = await Promise.all([
    Promise.all(parents.map(async (p) => (await getDashboardData(p.id)).checkins[0] ?? null)),
    photoUrls(parents.map((p) => p.id)),
  ]);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="ui-eyebrow">{user.name ? t(`Assalam o Alaikum, ${user.name}`, `السلام علیکم، ${user.name}`) : t("Family Wellbeing", "خاندان کی خیریت")}</p>
          <h1 className="mt-1 text-3xl font-semibold text-stone-900 sm:text-4xl">{t("Your Family", "آپ کا خاندان")}</h1>
          {user.name ? null : user.email === demoEmail() ? (
            <p className="mt-1 text-sm text-stone-500">{t("Demo Family", "ڈیمو خاندان")}</p>
          ) : (
            <Link href="/family/settings" className="mt-1 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-4">
              {t("Add your name", "اپنا نام لکھیں")}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/family/new" className="ui-btn ui-btn-primary">
            <Icon name="plus" className="size-4" />
            {t("Add Family Member", "فرد شامل کریں")}
          </Link>
          <SignOutButton />
        </div>
      </header>

      {parents.length === 0 ? (
        <section className="ui-card mt-8 px-6 py-10 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-sage-soft text-emerald-700">
            <Icon name="family" className="size-8" />
          </span>
          <h2 className="mt-4 text-2xl font-semibold text-stone-900">{t("Add Your First Family Member", "پہلا فرد شامل کریں")}</h2>
          <p className="mx-auto mt-2 max-w-md text-stone-600">
            {t("Tell Khairiyat about anyone you care for: Ammi, Abbu, Phuppo, Appa or another relative. You'll get a link to open on their phone.", "جس کی خیریت پوچھنی ہو ان کے بارے میں بتائیں: امی، ابو، پھوپھو، آپا یا کوئی اور۔ پھر ان کے فون کے لیے ایک لنک ملے گا۔")}
          </p>
          <Link href="/family/new" className="ui-btn ui-btn-primary mt-5">
            <Icon name="plus" className="size-4" />
            {t("Add Family Member", "فرد شامل کریں")}
          </Link>
        </section>
      ) : (
        <ul className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parents.map((parent, i) => {
            const last = latest[i];
            const { nickname } = parentNames(parent, lang);
            return (
              <li key={parent.id}>
                <Link href={`/family/${parent.id}`} className="ui-card ui-card-link flex h-full flex-col p-5">
                  <div className="flex items-center gap-4">
                    <Avatar name={parent.nickname} gender={parent.gender} photoUrl={photos.urls[parent.id]} size="lg" />
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-semibold text-stone-900">{nickname}</h2>
                      <p className="truncate text-sm text-stone-600">{parent.name}</p>
                      <p className="ui-eyebrow mt-1">{relationLabel(parent.relation, parent.gender, lang)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {last ? <RiskBadge level={last.risk_level} /> : (
                      <span className="rounded-full bg-stone-100 px-3 py-0.5 text-sm font-medium text-stone-600">{t("No check-ins yet", "ابھی کوئی بات نہیں")}</span>
                    )}
                    {last?.is_sample && <SampleTag />}
                  </div>
                  <p dir="auto" className="mt-3 line-clamp-3 flex-1 text-stone-700">
                    {last
                      ? last.family_message || last.summary
                      : t("Open their profile to set up their phone and have the first conversation.", "فون لگانے اور پہلی بات کے لیے پروفائل کھولیں۔")}
                  </p>
                  <div className="mt-4 space-y-1 border-t border-stone-200 pt-3 text-sm text-stone-600">
                    <p className="flex items-center gap-2">
                      <Icon name="phone" className="size-4 text-emerald-600" />
                      <span>{t("Calls:", "کال:")} <bdi dir="ltr">{callSlots(parent.checkinTime, parent.medicines).map((s) => s.time).join(", ")}</bdi></span>
                    </p>
                    {last && (
                      <p className="flex items-center gap-2">
                        <Icon name="calendar" className="size-4 text-emerald-600" />
                        <span>{t("Last check-in:", "آخری بات:")} {formatDay(last.created_at, lang)}, {formatTime(last.created_at, lang)}</span>
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
          <li>
            <Link href="/family/new" className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sage p-5 text-center font-semibold text-emerald-700 transition hover:bg-sage-soft">
              <Icon name="plus" className="size-7" />
              {t("Add Another Family Member", "ایک اور فرد شامل کریں")}
            </Link>
          </li>
        </ul>
      )}

      <FamilyAlerts vapidPublicKey={vapidPublicKey()} isDemo={user.email === demoEmail()} />
    </>
  );
}
