// Settings and account: who is signed in, language, notifications, privacy and sign out.
import type { Metadata } from "next";
import { Suspense } from "react";
import FamilyAlerts from "@/components/family/FamilyAlerts";
import { SignOutButton } from "@/components/family/parts";
import LanguageSwitch from "@/components/i18n/LanguageSwitch";
import SectionHeading from "@/components/ui/SectionHeading";
import { demoEmail, requireUser } from "@/lib/auth";
import { APP_LANG_COOKIE, translator } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { vapidPublicKey } from "@/lib/push";
import ProfileForm from "@/components/family/ProfileForm";
import ThemeSwitch from "@/components/ui/ThemeSwitch";
import Avatar from "@/components/ui/Avatar";
import SidePanel from "@/components/ui/SidePanel";

export const metadata: Metadata = { title: "Settings · Khairiyat", robots: { index: false, follow: false } };
export const instant = false;

export default function SettingsPage() {
  return (
    <main className="ui-page">
      <div className="mx-auto max-w-2xl lg:max-w-5xl">
        <Suspense fallback={<p className="text-stone-500">…</p>}>
          <Settings />
        </Suspense>
      </div>
    </main>
  );
}

async function Settings() {
  const user = await requireUser();
  const lang = await getLang();
  const t = translator(lang);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div className="min-w-0">
      <p className="ui-eyebrow">{t("Your Account", "آپ کا اکاؤنٹ")}</p>
      <h1 className="mt-1 text-3xl font-semibold text-stone-900">{t("Settings", "ترتیبات")}</h1>

      <section className="ui-card mt-6 p-5">
        <div className="flex items-center gap-4">
          <Avatar name={user.name || user.email} gender="female" size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-stone-900">{user.name || t("Your Profile", "آپ کی پروفائل")}</h2>
            <p dir="ltr" className="truncate text-sm text-stone-600">{user.email}</p>
          </div>
        </div>
        {user.email === demoEmail() ? (
          <p className="mt-3 text-sm text-stone-600">{t("The demo account can't be changed.", "ڈیمو اکاؤنٹ بدلا نہیں جا سکتا۔")}</p>
        ) : (
          <ProfileForm name={user.name} />
        )}
      </section>

      <section className="ui-card mt-5 p-5">
        <SectionHeading icon="settings" title={t("Appearance", "ظاہری شکل")} description={t("Light or dark, remembered on this device.", "ہلکا یا گہرا، اسی ڈیوائس پر یاد رہے گا۔")} />
        <ThemeSwitch />
      </section>

      <section className="ui-card mt-5 p-5">
        <SectionHeading
          icon="globe"
          title={t("Language", "زبان")}
          description={t("For these family pages. Each parent's screen has its own choice.", "خاندان کے صفحات کے لیے۔ والدین کی اسکرین کی زبان الگ ہے۔")}
          action={<LanguageSwitch lang={lang} cookie={APP_LANG_COOKIE} />}
        />
      </section>

      <FamilyAlerts vapidPublicKey={vapidPublicKey()} isDemo={user.email === demoEmail()} />

      <section className="ui-card mt-5 p-5">
        <SectionHeading icon="shield" title={t("Privacy", "رازداری")} />
        <p className="mt-2 text-sm text-stone-600">
          {t(
            "Khairiyat saves a short summary and simple scores of each call, never the full conversation. Voice messages are saved only as described on each card.",
            "خیریت ہر بات کا مختصر خلاصہ اور سادہ اسکور محفوظ کرتا ہے، پوری گفتگو نہیں۔ آواز کے پیغام صرف اتنے محفوظ رہتے ہیں جتنا ہر کارڈ پر لکھا ہے۔",
          )}
        </p>
      </section>

      <div className="mt-6">
        <SignOutButton />
      </div>
    </div>
      <SidePanel
        title={t("Your Space", "آپ کی جگہ")}
        points={[
          t("Choose the name, language and appearance you like.", "اپنا نام، زبان اور رنگ روپ چنیں۔"),
          t("Turn on alerts to hear about your family at once.", "گھر والوں کی خبر فوراً پانے کے لیے الرٹ آن کریں۔"),
        ]}
      />
    </div>
  );
}
