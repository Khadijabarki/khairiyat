// Wraps the family pages in the chosen language: text direction, font and the switch button.
import { APP_LANG_COOKIE } from "@/lib/i18n";
import { getLang } from "@/lib/i18n-server";
import LangProvider from "./LangProvider";
import LanguageSwitch from "./LanguageSwitch";

export default async function LangShell({ children, background }: { children: React.ReactNode; background: string }) {
  const lang = await getLang();
  return (
    <LangProvider lang={lang}>
      <div lang={lang} dir={lang === "ur" ? "rtl" : "ltr"} data-lang={lang} className="flex flex-1 flex-col">
        <div className={`flex justify-end px-4 pt-3 print:hidden ${background}`}>
          <LanguageSwitch lang={lang} cookie={APP_LANG_COOKIE} />
        </div>
        {children}
      </div>
    </LangProvider>
  );
}
