// Speech-to-text sometimes writes Urdu in Hindi or Punjabi script; it must come out as Roman Urdu.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { devanagariToRoman } from "../../src/lib/transliterate";

describe("devanagariToRoman", () => {
  const cases: [string, string][] = [
    ["Aap fikar na karein Abbu, सब theek", "Aap fikar na karein Abbu, sab theek"],
    ["Main Ali ko bata रही hoon.", "Main Ali ko bata rahi hoon."],
    ["ज़रूर", "zaroor"],
    ["बहुत", "bahut"],
    ["कल", "kal"],
    ["ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ", "tusin kiwen ho"], // Gurmukhi (Punjabi)
    ["ਪੁੱਤਰ", "putar"],
  ];
  for (const [input, expected] of cases) {
    it(`turns "${input}" into "${expected}"`, () => assert.equal(devanagariToRoman(input), expected));
  }

  it("leaves Roman Urdu and Urdu script untouched", () => {
    assert.equal(devanagariToRoman("Assalam o alaikum"), "Assalam o alaikum");
    assert.equal(devanagariToRoman("السلام علیکم"), "السلام علیکم");
  });
});
