// Names on the Urdu screens.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isolate, knownUrdu, urduName } from "../../src/lib/urdu-names";

describe("urdu names", () => {
  it("writes family words and common names in Urdu", () => {
    assert.equal(knownUrdu("api"), "آپی");
    assert.equal(knownUrdu("Phopho"), "پھوپھو");
    assert.equal(knownUrdu("Ayesha"), "عائشہ");
    assert.equal(knownUrdu("Zubaida"), null);
    assert.equal(knownUrdu(""), null);
  });

  it("keeps Urdu the family typed, and fixes Latin text typed in the Urdu box", () => {
    assert.equal(urduName("اپیا", "api"), "اپیا");
    assert.equal(urduName("api", "api"), "آپی");
    assert.equal(urduName("", "Zubaida"), "Zubaida");
  });

  it("isolates a name so it keeps its place in an Urdu sentence", () => {
    assert.equal(isolate("api"), "\u2068api\u2069");
  });
});
