// English / Urdu for the screens. Every text is written as a pair next to where it is used:
// t("Sign out", "سائن آؤٹ"). Pure functions, so both the server and the browser can use them.
//
// Not translated: what people typed, and the summaries and alert reasons written by the AI.

export type Lang = "en" | "ur";
export type Translate = (en: string, ur: string) => string;

// Two separate choices, so changing the dashboard never changes the parent's screen:
export const APP_LANG_COOKIE = "app-lang"; // family pages, English unless chosen
export const TALK_LANG_COOKIE = "talk-lang"; // parent's talk screen, Urdu unless chosen

export function readLang(value: string | undefined, fallback: Lang): Lang {
  return value === "en" || value === "ur" ? value : fallback;
}

export function translator(lang: Lang): Translate {
  return (en, ur) => (lang === "ur" ? ur : en);
}

// The names as they should appear in this language (Urdu falls back to what was typed).
export function parentNames(
  parent: { nickname: string; nicknameUr: string; childName: string; childNameUr: string },
  lang: Lang,
): { nickname: string; childName: string } {
  return lang === "ur"
    ? { nickname: parent.nicknameUr || parent.nickname, childName: parent.childNameUr || parent.childName }
    : { nickname: parent.nickname, childName: parent.childName };
}
