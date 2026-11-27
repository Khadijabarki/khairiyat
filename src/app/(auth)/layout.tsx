import Link from "next/link";
import { Suspense } from "react";
import LangShell from "@/components/i18n/LangShell";
import BackLink from "@/components/ui/BackLink";
import FamilyIllustration from "@/components/ui/FamilyIllustration";
import { getT } from "@/lib/i18n-server";

// Shared frame for the sign-in and sign-up pages.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<main className="ui-page" />}>
      <LangShell background="bg-cream">
        <AuthFrame>{children}</AuthFrame>
      </LangShell>
    </Suspense>
  );
}

async function AuthFrame({ children }: { children: React.ReactNode }) {
  const t = await getT();
  return (
    <main className="ui-page">
      <BackLink href="/" label={t("Back", "واپس")} />
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-8 lg:min-h-[80dvh] lg:flex-row lg:gap-14">
        <div className="hidden w-full max-w-xl text-center lg:block">
          <FamilyIllustration />
          <h2 className="mt-5 text-3xl font-semibold text-stone-900">{t("Close to Family, Every Day", "ہر روز اپنوں کے قریب")}</h2>
          <p className="mx-auto mt-2 max-w-md text-stone-600">
            {t("A caring call for the people you love, and news you can trust.", "اپنوں کے لیے پیار بھری کال، اور آپ کے لیے قابلِ بھروسا خبر۔")}
          </p>
        </div>
        <div className="flex w-full max-w-sm flex-col items-center">
          <Link href="/" className="text-center">
            <span className="font-urdu block text-4xl leading-[1.9] text-emerald-800">خیریت</span>
            <span className="text-sm font-semibold tracking-wide text-stone-700">Khairiyat</span>
          </Link>
          <div className="my-4 w-full max-w-64 lg:hidden">
            <FamilyIllustration />
          </div>
          <div className="mt-2 flex w-full flex-col gap-4">{children}</div>
        </div>
      </div>
    </main>
  );
}
