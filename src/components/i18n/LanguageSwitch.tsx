"use client";

// The اردو / English button. It remembers the choice in a cookie and redraws the page.
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Lang } from "@/lib/i18n";

export default function LanguageSwitch({ lang, cookie }: { lang: Lang; cookie: string }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const other: Lang = lang === "ur" ? "en" : "ur";
  return (
    <button
      type="button"
      disabled={busy}
      lang={other}
      onClick={() => {
        document.cookie = `${cookie}=${other}; Path=/; Max-Age=31536000; SameSite=Lax`;
        startTransition(() => router.refresh());
      }}
      className={`rounded-full border border-emerald-300 bg-white px-4 py-1 text-sm font-medium text-emerald-900 shadow-sm hover:bg-emerald-50 disabled:opacity-60 ${
        other === "ur" ? "font-urdu leading-[2]" : ""
      }`}
    >
      {other === "ur" ? "اردو" : "English"}
    </button>
  );
}
