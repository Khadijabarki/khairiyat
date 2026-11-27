import Link from "next/link";
import { Suspense } from "react";
import { DemoButton } from "@/components/auth/AuthForm";
import LangShell from "@/components/i18n/LangShell";
import { getT } from "@/lib/i18n-server";
import Icon, { type IconName } from "@/components/ui/Icon";

// Start page: what Khairiyat is, sign in / sign up for families, and a one-click demo.
export default function Home() {
  return (
    <Suspense fallback={<main className="ui-page" />}>
      <LangShell background="bg-cream">
        <HomeContent />
      </LangShell>
    </Suspense>
  );
}

async function HomeContent() {
  const t = await getT();
  const demoLink = "font-semibold text-emerald-800 underline underline-offset-4";
  const features: { icon: IconName; title: string; text: string }[] = [
    { icon: "phone", title: t("Daily Calls", "روز کی کال"), text: t("A friendly voice conversation in Urdu, at the times you choose.", "آپ کے چنے ہوئے وقت پر اردو میں پیار بھری بات۔") },
    { icon: "shield", title: t("Safety Alerts", "حفاظتی الرٹ"), text: t("Worrying signs reach the family during the call.", "پریشانی کی بات کال کے دوران ہی گھر والوں تک پہنچتی ہے۔") },
    { icon: "chart", title: t("Clear Updates", "واضح خبر"), text: t("Short summaries, weekly trends and a report for the doctor.", "مختصر خلاصہ، ہفتے کا رجحان اور ڈاکٹر کے لیے رپورٹ۔") },
  ];
  return (
    <main className="ui-page flex flex-col items-center justify-center gap-8 text-center">
      <div className="max-w-xl">
        <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-emerald-700 text-white shadow-lift">
          <Icon name="heart" className="size-8" />
        </span>
        <p className="font-urdu mt-3 text-4xl leading-[1.9] text-emerald-800">خیریت</p>
        <h1 className="text-4xl font-semibold text-stone-900 sm:text-5xl">Khairiyat</h1>
        <p className="mx-auto mt-3 max-w-md text-lg text-stone-600">
          {t(
            "An AI that checks on elderly parents every day in Urdu, remembers how they feel, and keeps their family informed.",
            "ایک AI ساتھی جو روز اردو میں بزرگ والدین کا حال پوچھتا ہے، پچھلی باتیں یاد رکھتا ہے اور گھر والوں کو خبر دیتا ہے۔",
          )}
        </p>
      </div>

      <div className="flex w-full max-w-md flex-col justify-center gap-3 sm:flex-row">
        <Link href="/signup" className="ui-btn ui-btn-primary">
          {t("Create a family account", "فیملی اکاؤنٹ بنائیں")}
        </Link>
        <Link href="/login" className="ui-btn ui-btn-secondary">
          {t("Sign in", "سائن اِن")}
        </Link>
      </div>

      <ul className="grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <li key={f.icon} className="ui-card flex flex-col items-center gap-2 p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-sage-soft text-emerald-700">
              <Icon name={f.icon} />
            </span>
            <h2 className="text-lg font-semibold text-stone-900">{f.title}</h2>
            <p className="text-sm text-stone-600">{f.text}</p>
          </li>
        ))}
      </ul>

      <div className="w-full max-w-md">
        <DemoButton />
        <p className="mt-3 text-sm text-stone-600">
          {t("Or talk to Khairiyat as a demo parent:", "یا ڈیمو والدین بن کر خیریت سے بات کریں:")}{" "}
          <Link href="/talk/demo-ammi" className={demoLink}>{t("Ammi", "امی")}</Link>
          {" · "}
          <Link href="/talk/demo-abbu" className={demoLink}>{t("Abbu", "ابو")}</Link>
        </p>
      </div>
    </main>
  );
}
