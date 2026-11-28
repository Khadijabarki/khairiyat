// Names on the Urdu screens.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { capitalName, isolate, knownUrdu, urduName } from "../../src/lib/urdu-names";

describe("urdu names", () => {
  it("writes family words and common names in Urdu", () => {
    assert.equal(knownUrdu("api"), "آپی");
    assert.equal(knownUrdu("Phopho"), "پھوپھو");
    assert.equal(knownUrdu("Ayesha"), "عائشہ");
    assert.equal(knownUrdu("Zubaida"), "زبیدہ");
    assert.equal(knownUrdu("nimra"), "نمرہ");
    assert.equal(knownUrdu("Kalsoom"), "کلثوم");
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

  it("isolates a name so it keeps its place in an Urdu sentence", () => {
    assert.equal(isolate("api"), "\u2068api\u2069");
  });
});
