"use client";

// Light or dark appearance, remembered on this device.
import { useSyncExternalStore } from "react";
import { THEME_KEY } from "@/lib/theme";
import { useLang } from "../i18n/LangProvider";

const EVENT = "khairiyat-theme";
const subscribe = (onChange: () => void) => {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
};
const current = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

// Changes the page itself, so it lives outside the component.
function applyTheme(next: "light" | "dark") {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {} // private browsing: the choice lasts until the page is closed
  window.dispatchEvent(new Event(EVENT));
}

export default function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, current, () => "light");
  const { t } = useLang();

  return (
    <div role="group" aria-label={t("Appearance", "ظاہری شکل")} className="mt-3 grid grid-cols-2 gap-3">
      {(["light", "dark"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={theme === option}
          onClick={() => applyTheme(option)}
          className={`ui-btn ${theme === option ? "ui-btn-primary" : "ui-btn-secondary"}`}
        >
          {option === "light" ? t("☀ Light", "☀ ہلکا") : t("☾ Dark", "☾ گہرا")}
        </button>
      ))}
    </div>
  );
}
