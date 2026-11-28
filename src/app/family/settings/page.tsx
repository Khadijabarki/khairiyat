// Settings and account: who is signed in, language, notifications, privacy and sign out.
import type { Metadata } from "next";
import { Suspense } from "react";
import FamilyAlerts from "@/components/family/FamilyAlerts";
import { SignOutButton } from "@/components/family/parts";
import SectionHeading from "@/components/ui/SectionHeading";
import { demoEmail, requireUser } from "@/lib/auth";
import { translator } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import { vapidPublicKey } from "@/lib/push";
import SettingsForm from "@/components/family/SettingsForm";
import Avatar from "@/components/ui/Avatar";
import SidePanel from "@/components/ui/SidePanel";
import Loading from "@/components/ui/Loading";

export const metadata: Metadata = { title: "Settings · Khairiyat", robots: { index: false, follow: false } };
export const instant = false;

export default function SettingsPage() {
  return (
    <main className="ui-page">
      <div className="mx-auto max-w-2xl lg:max-w-5xl">
        <Suspense fallback={<Loading />}>
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
        {user.email === demoEmail() && (
          <p className="mt-3 text-sm text-stone-600">{t("The demo account's name can't be changed.", "ڈیمو اکاؤنٹ کا نام بدلا نہیں جا سکتا۔")}</p>
        )}
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

      <SettingsForm name={user.name} canRename={user.email !== demoEmail()} />

      <div className="mt-8 flex justify-center border-t border-stone-200 pt-5">
        <SignOutButton />
      </div>
    </div>
      <SidePanel
        title={t("Your Space", "آپ کی جگہ")}
        points={[
          t("Set your name, language and appearance.", "اپنا نام، زبان اور رنگ روپ چنیں۔"),
          t("Turn on alerts to hear about your family right away.", "گھر والوں کی خبر فوراً پانے کے لیے الرٹ آن کریں۔"),
        ]}
      />
    </div>
  );
}
