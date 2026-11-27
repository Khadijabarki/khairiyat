// Names on the Urdu screens. Pure functions, used by the browser and the server.

const URDU_LETTER = /[\u0600-\u06FF]/;

export const hasUrdu = (text: string) => URDU_LETTER.test(text);

// Words families use for each other, and some common names. Anything else is written in
// Urdu by the AI when the family saves (see urdu-script.ts).
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
};

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
