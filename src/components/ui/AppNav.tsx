"use client";

// Navigation for the family pages: a header on every screen, plus a bottom bar on phones.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "../i18n/LangProvider";
import Icon, { type IconName } from "./Icon";

const LINKS: { href: string; icon: IconName; label: [en: string, ur: string] }[] = [
  { href: "/family", icon: "family", label: ["Family", "خاندان"] },
  { href: "/family/new", icon: "plus", label: ["Add Member", "شامل کریں"] },
  { href: "/family/settings", icon: "settings", label: ["Settings", "ترتیبات"] },
];

function isActive(path: string, href: string): boolean {
  // A parent's own pages belong to "Family".
  if (href === "/family") return path !== "/family/new" && path !== "/family/settings";
  return path === href;
}

export default function AppNav({ languageSwitch }: { languageSwitch: React.ReactNode }) {
  const path = usePathname();
  const { t } = useLang();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-cream/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/family" className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-700 text-white">
              <Icon name="heart" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg font-semibold text-stone-900">Khairiyat</span>
              <span className="font-urdu block text-xs leading-[1.8] text-emerald-700">خیریت</span>
            </span>
          </Link>
          <nav aria-label={t("Main", "مرکزی")} className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(path, l.href) ? "page" : undefined}
                className={`flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                  isActive(path, l.href) ? "bg-emerald-700 text-white" : "text-stone-700 hover:bg-sage-soft"
                }`}
              >
                <Icon name={l.icon} className="size-4" />
                {t(...l.label)}
              </Link>
            ))}
          </nav>
          {languageSwitch}
        </div>
      </header>

      <nav
        aria-label={t("Main", "مرکزی")}
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-stone-200 bg-[#fffdf7] pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(path, l.href) ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
              isActive(path, l.href) ? "text-emerald-700" : "text-stone-500"
            }`}
          >
            <span className={`flex h-7 w-12 items-center justify-center rounded-full ${isActive(path, l.href) ? "bg-emerald-100" : ""}`}>
              <Icon name={l.icon} />
            </span>
            {t(...l.label)}
          </Link>
        ))}
      </nav>
    </>
  );
}
