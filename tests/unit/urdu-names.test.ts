// Names on the Urdu screens.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { capitalName, isolate, knownUrdu, urduName } from "../../src/lib/urdu-names";
import { capitalFirst, matchesProfileName } from "../../src/lib/capitals";

describe("urdu names", () => {
  it("writes family words and common names in Urdu", () => {
    assert.equal(knownUrdu("api"), "آپی");
    assert.equal(knownUrdu("Phopho"), "پھوپھو");
    assert.equal(knownUrdu("Ayesha"), "عائشہ");
    assert.equal(knownUrdu("Zubaida"), "زبیدہ");
    assert.equal(knownUrdu("nimra"), "نمرہ");
    assert.equal(knownUrdu("Kalsoom"), "کلثوم");
    assert.equal(knownUrdu("muskan"), "مسکان");
    assert.equal(knownUrdu("Malaika"), "ملائکہ");
    assert.equal(knownUrdu("Muhammad Aslam"), "محمد اسلم");
    assert.equal(knownUrdu("Gulrukh"), null);
    assert.equal(knownUrdu(""), null);
  });

  it("starts each word of a name with a capital letter", () => {
    assert.equal(capitalName("api"), "Api");
    assert.equal(capitalName("muhammad aslam"), "Muhammad Aslam");
    assert.equal(capitalName("McAli KHAN"), "McAli KHAN");
    assert.equal(capitalName("امی"), "امی");
    assert.equal(capitalName(""), "");
  });

  it("keeps Urdu the family typed, and fixes Latin text typed in the Urdu box", () => {
    assert.equal(urduName("اپیا", "api"), "اپیا");
    assert.equal(urduName("api", "api"), "آپی");
    assert.equal(urduName("", "Gulrukh"), "Gulrukh");
  });

  it("starts other text with one capital letter", () => {
    assert.equal(capitalFirst("subah nashte ke baad"), "Subah nashte ke baad");
    assert.equal(capitalFirst("  bp ki goli"), "  Bp ki goli");
    assert.equal(capitalFirst("BP ki goli"), "BP ki goli");
    assert.equal(capitalFirst("دوائی"), "دوائی");
    assert.equal(capitalFirst("2 goliyan"), "2 goliyan");
  });

  it("requires a member's 'Your name' to be the profile name", () => {
    assert.equal(matchesProfileName("amna", "Amna"), true);
    assert.equal(matchesProfileName(" Amna ", "Amna"), true);
    assert.equal(matchesProfileName("Nimra", "Amna"), false);
    assert.equal(matchesProfileName("Nimra", ""), true); // an account without a name
    const long = "Amna ".repeat(12);
    assert.equal(matchesProfileName(long.slice(0, 40), long), true);
  });

  it("isolates a name so it keeps its place in an Urdu sentence", () => {
    assert.equal(isolate("api"), "\u2068api\u2069");
  });
});
