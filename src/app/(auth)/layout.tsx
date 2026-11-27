import Link from "next/link";
import { Suspense } from "react";
import LangShell from "@/components/i18n/LangShell";

// Shared frame for the sign-in and sign-up pages.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-stone-50" />}>
      <LangShell background="bg-cream">
        <main className="ui-page flex flex-col items-center">
          <Link href="/" className="text-center">
            <span className="font-urdu block text-4xl leading-[1.9] text-emerald-800">خیریت</span>
            <span className="text-sm font-semibold tracking-wide text-stone-700">Khairiyat</span>
          </Link>
          <div className="mt-6 flex w-full max-w-sm flex-col gap-4">{children}</div>
        </main>
      </LangShell>
    </Suspense>
  );
}
