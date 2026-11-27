"use client";

// Name, language and appearance, all saved together with one button at the end.
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { updateName } from "@/app/(auth)/actions";
import { APP_LANG_COOKIE, type Lang } from "@/lib/i18n";
import { THEME_KEY } from "@/lib/theme";
import { useLang } from "../i18n/LangProvider";
import SectionHeading from "../ui/SectionHeading";

type Theme = "light" | "dark";
const noSubscribe = () => () => {};
const currentTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

// These change the page itself, so they live outside the component.
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {} // private browsing: the choice lasts until the page is closed
}
function applyLanguage(lang: Lang) {
  document.cookie = `${APP_LANG_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export default function SettingsForm({ name, canRename }: { name: string; canRename: boolean }) {
  const { lang, t } = useLang();
  const router = useRouter();
  const savedTheme = useSyncExternalStore(noSubscribe, currentTheme, () => "light" as Theme);
  const [nextName, setNextName] = useState(name);
  const [nextLang, setNextLang] = useState<Lang | null>(null);
  const [nextTheme, setNextTheme] = useState<Theme | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startTransition] = useTransition();
  const chosenLang = nextLang ?? lang;
  const chosenTheme = nextTheme ?? savedTheme;

  function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      if (canRename && nextName.trim() !== name) {
        const form = new FormData();
        form.set("full_name", nextName);
        const result = await updateName({}, form);
        if (result.error) return setMessage({ ok: false, text: result.error });
      }
      applyTheme(chosenTheme);
      applyLanguage(chosenLang);
      router.refresh();
      setMessage({ ok: true, text: chosenLang === "ur" ? "✓ ترتیبات محفوظ ہو گئیں۔" : "✓ Settings saved." });
    });
  }

  const choice = (selected: boolean) => `ui-btn ${selected ? "ui-btn-primary" : "ui-btn-secondary"}`;

  return (
    <form onSubmit={save} onChange={() => setMessage(null)}>
      {canRename && (
        <section className="ui-card mt-5 p-5">
          <SectionHeading icon="user" title={t("Your Name", "آپ کا نام")} description={t("Shown in the app instead of your email.", "ایپ میں ای میل کی جگہ یہ دکھایا جائے گا۔")} />
          <input aria-label={t("Your Name", "آپ کا نام")} maxLength={60} autoComplete="name" required value={nextName} onChange={(e) => setNextName(e.target.value)} className="ui-input" />
        </section>
      )}

      <section className="ui-card mt-5 p-5">
        <SectionHeading icon="globe" title={t("Language", "زبان")} description={t("For these family pages. Each talk screen has its own choice.", "خاندان کے صفحات کے لیے۔ بات والی اسکرین کی زبان الگ ہے۔")} />
        <div role="group" aria-label={t("Language", "زبان")} className="mt-3 grid grid-cols-2 gap-3">
          <button type="button" aria-pressed={chosenLang === "en"} onClick={() => setNextLang("en")} className={choice(chosenLang === "en")}>English</button>
          <button type="button" aria-pressed={chosenLang === "ur"} onClick={() => setNextLang("ur")} className={`font-urdu ${choice(chosenLang === "ur")}`}>اردو</button>
        </div>
      </section>

      <section className="ui-card mt-5 p-5">
        <SectionHeading icon="settings" title={t("Appearance", "ظاہری شکل")} description={t("Light or dark, remembered on this device.", "ہلکا یا گہرا، اسی ڈیوائس پر یاد رہے گا۔")} />
        <div role="group" aria-label={t("Appearance", "ظاہری شکل")} className="mt-3 grid grid-cols-2 gap-3">
          {(["light", "dark"] as const).map((option) => (
            <button key={option} type="button" aria-pressed={chosenTheme === option} onClick={() => setNextTheme(option)} className={choice(chosenTheme === option)}>
              {option === "light" ? t("☀ Light", "☀ ہلکا") : t("☾ Dark", "☾ گہرا")}
            </button>
          ))}
        </div>
      </section>

      <button type="submit" disabled={saving} className="ui-btn ui-btn-primary mt-6 w-full">
        {saving ? t("Saving…", "محفوظ ہو رہا ہے…") : t("Save Settings", "ترتیبات محفوظ کریں")}
      </button>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-3 text-center text-sm font-semibold ${message.ok ? "text-emerald-800" : "text-rose-700"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
