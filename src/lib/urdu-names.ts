// Names on the Urdu screens. Pure functions, used by the browser and the server.

const URDU_LETTER = /[\u0600-\u06FF]/;

export const hasUrdu = (text: string) => URDU_LETTER.test(text);

// Words families use for each other, and some common names. Used only to show a name in
// Urdu when the family left the Urdu box empty; any other name is shown as typed.
const KNOWN: Record<string, string> = {
  ammi: "امی", ami: "امی", amma: "اماں", mama: "ماما", maa: "ماں",
  abbu: "ابو", abu: "ابو", abba: "ابا", baba: "بابا", papa: "پاپا",
  api: "آپی", aapi: "آپی", appi: "آپی", apa: "آپا", appa: "آپا", aapa: "آپا", baji: "باجی",
  bhai: "بھائی", bhaiya: "بھیا", behen: "بہن", behan: "بہن",
  phuppo: "پھوپھو", phupho: "پھوپھو", phopho: "پھوپھو", phupo: "پھوپھو", puphoo: "پھوپھو",
  khala: "خالہ", khaala: "خالہ", mami: "ممانی", mumani: "ممانی", chachi: "چچی", tai: "تائی",
  chacha: "چچا", chachu: "چاچو", mamu: "ماموں", mamoo: "ماموں", taya: "تایا", phupha: "پھوپھا", khalu: "خالو",
  dadi: "دادی", dada: "دادا", nani: "نانی", nana: "نانا",
  ali: "علی", sana: "ثنا", ayesha: "عائشہ", aisha: "عائشہ", aliya: "عالیہ", aaliya: "عالیہ",
  noreen: "نورین", khadija: "خدیجہ", fatima: "فاطمہ", ahmed: "احمد", ahmad: "احمد", hassan: "حسن",
  zubaida: "زبیدہ", nimra: "نمرہ", rukhsana: "رخسانہ", shabeer: "شبیر", hamza: "حمزہ", zainab: "زینب",
  usman: "عثمان", mehwish: "مہوش", mehreen: "مہرین", iqra: "اقرا", bushra: "بشریٰ", saima: "سائمہ",
  kashif: "کاشف", hafsa: "حفصہ", waqas: "وقاص", sidra: "سدرہ", taimoor: "تیمور", muhammad: "محمد",
  aslam: "اسلم", begum: "بیگم", kalsoom: "کلثوم", muskan: "مسکان", muskaan: "مسکان", malaika: "ملائکہ", malaikah: "ملائکہ", kulsoom: "کلثوم", kalsum: "کلثوم", kulsum: "کلثوم",
};

// "api" -> "Api", "muhammad aslam" -> "Muhammad Aslam". The rest of each word is left as typed.
export const capitalName = (name: string) =>
  name.replace(/(^|\s)([a-z])/g, (_match, space: string, letter: string) => space + letter.toUpperCase());

// The Urdu spelling if every word is known, otherwise null.
export function knownUrdu(name: string): string | null {
  const words = name.trim().toLowerCase().split(/\s+/);
  const urdu = words.map((w) => KNOWN[w]);
  return words[0] && urdu.every(Boolean) ? urdu.join(" ") : null;
}

// What to show on an Urdu screen: Urdu already written, a known spelling, or what was typed.
export function urduName(urdu: string, roman: string): string {
  if (hasUrdu(urdu)) return urdu;
  return knownUrdu(urdu || roman) ?? (urdu || roman);
}

// Wraps a name so an English name inside an Urdu sentence can't swap places with the
// words or names around it (Unicode "first strong isolate").
export const isolate = (name: string) => `\u2068${name}\u2069`;
