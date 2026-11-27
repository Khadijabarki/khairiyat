"use client";

// Gives client components the chosen language.
import { createContext, useContext, useMemo } from "react";
import { translator, type Lang } from "@/lib/i18n";

const LangContext = createContext<Lang>("en");

export default function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang() {
  const lang = useContext(LangContext);
  return useMemo(() => ({ lang, t: translator(lang) }), [lang]);
}
