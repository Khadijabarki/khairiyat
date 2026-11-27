// Wraps the family pages in the chosen language: text direction, font and the switch button.
import { APP_LANG_COOKIE } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import LangProvider from "./LangProvider";
import LanguageSwitch from "./LanguageSwitch";
import AppNav from "../ui/AppNav";

type Props = { children: React.ReactNode; background: string; nav?: boolean };

export default async function LangShell({ children, background, nav = false }: Props) {
  const lang = await getLang();
  return (
    <LangProvider lang={lang}>
      <div lang={lang} dir={lang === "ur" ? "rtl" : "ltr"} data-lang={lang} className="relative flex flex-1 flex-col">
        {nav ? (
          <AppNav languageSwitch={<LanguageSwitch lang={lang} cookie={APP_LANG_COOKIE} />} />
        ) : (
          <div className={`absolute end-4 top-3 z-10 rounded-full print:hidden ${background}`}>
            <LanguageSwitch lang={lang} cookie={APP_LANG_COOKIE} />
          </div>
        )}
        {children}
      </div>
    </LangProvider>
  );
}
