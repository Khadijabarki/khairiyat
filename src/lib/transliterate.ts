// Gemini's speech-to-text sometimes writes an Urdu word in Hindi (Devanagari) script,
// because spoken Urdu and Hindi sound the same (e.g. "सब" instead of "sab").
// This turns any Devanagari letters into simple Roman Urdu so the text stays readable.

// Consonants: written with an "a" sound after them unless a vowel sign or virama follows.
const CONSONANTS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "n",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "n",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "w", "श": "sh",
  "ष": "sh", "स": "s", "ह": "h",
  // Letters with a dot (nukta), used for Urdu sounds
  "क़": "q", "ख़": "kh", "ग़": "gh", "ज़": "z", "फ़": "f", "ड़": "r", "ढ़": "rh",
};

// Vowels written on their own (at the start of a word).
const VOWELS: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
  "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऋ": "ri",
};

// Vowel signs that attach to a consonant and replace its "a" sound.
const VOWEL_SIGNS: Record<string, string> = {
  "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "oo",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ृ": "ri",
};

const VIRAMA = "्"; // removes the "a" sound after a consonant
const NUKTA = "़";
const NASAL: Record<string, string> = { "ं": "n", "ँ": "n", "ः": "h" };
const DEVANAGARI = /[ऀ-ॿ]/;

function wordToRoman(word: string): string {
  // Join a letter with a following nukta so "ज़" is read as one letter.
  const chars = Array.from(word.normalize("NFC"));
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    let ch = chars[i];
    if (chars[i + 1] === NUKTA) {
      ch += NUKTA;
      i++;
    }
    const next = chars[i + 1];

    if (CONSONANTS[ch]) {
      out += CONSONANTS[ch];
      if (next === VIRAMA) {
        i++; // no vowel after this consonant
      } else if (next && VOWEL_SIGNS[next]) {
        out += VOWEL_SIGNS[next];
        i++;
      } else if (i < chars.length - 1) {
        out += "a"; // the built-in "a" sound (dropped at the end of a word, like "sab")
      }
    } else if (VOWELS[ch]) {
      out += VOWELS[ch];
    } else if (VOWEL_SIGNS[ch]) {
      out += VOWEL_SIGNS[ch];
    } else if (NASAL[ch]) {
      out += NASAL[ch];
    } else if (ch === "।") {
      out += ".";
    } else if (ch >= "०" && ch <= "९") {
      out += String(ch.charCodeAt(0) - "०".charCodeAt(0));
    } else {
      out += ch;
    }
  }
  return out;
}

// Punjabi speech is sometimes written in Gurmukhi script (e.g. "ਸਭ" for "sab").
// Unicode places Gurmukhi letters exactly 0x100 after the matching Devanagari letters,
// so we shift them to Devanagari and reuse the converter above.
const GURMUKHI = /[਀-੿]/;
const TIPPI = "ੰ"; // nasal sound, like Devanagari "ं"
const ADDAK = "ੱ"; // doubles the next consonant; we simply drop it

function gurmukhiToDevanagari(text: string): string {
  return Array.from(text)
    .map((ch) => {
      if (ch === TIPPI) return "ं";
      if (ch === ADDAK) return "";
      const code = ch.charCodeAt(0);
      return code >= 0x0a00 && code <= 0x0a6f ? String.fromCharCode(code - 0x100) : ch;
    })
    .join("");
}

// Converts only the Hindi (Devanagari) and Punjabi (Gurmukhi) parts of a text
// into Roman Urdu, and leaves everything else as it is.
export function devanagariToRoman(text: string): string {
  if (GURMUKHI.test(text)) text = gurmukhiToDevanagari(text);
  if (!DEVANAGARI.test(text)) return text; // fast path: nothing to change
  return text.replace(/[ऀ-ॿ]+/g, (word) => wordToRoman(word));
}
