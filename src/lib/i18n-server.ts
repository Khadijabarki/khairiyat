// The language chosen for the family pages, read from the visitor's cookie.
import "server-only";
import { cookies } from "next/headers";
import { APP_LANG_COOKIE, readLang, translator, type Lang, type Translate } from "./i18n";

export async function getLang(): Promise<Lang> {
  return readLang((await cookies()).get(APP_LANG_COOKIE)?.value, "en");
}

export async function getT(): Promise<Translate> {
  return translator(await getLang());
}
