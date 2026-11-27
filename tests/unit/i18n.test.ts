// English / Urdu helpers.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parentNames, readLang, translator } from "../../src/lib/i18n";
import { SAFETY_RULES } from "../../src/lib/safety";
import { TIPS_EN } from "../../src/lib/safety-tips-en";

describe("language helpers", () => {
  it("picks the chosen language and ignores unknown cookie values", () => {
    assert.equal(translator("en")("Sign out", "x"), "Sign out");
    assert.equal(translator("ur")("Sign out", "x"), "x");
    assert.equal(readLang("ur", "en"), "ur");
    assert.equal(readLang("fr", "en"), "en");
    assert.equal(readLang(undefined, "ur"), "ur");
  });

  it("uses Urdu names in Urdu, falling back to what was typed", () => {
    const parent = { nickname: "Ammi", nicknameUr: "امی", childName: "Ali", childNameUr: "" };
    assert.deepEqual(parentNames(parent, "ur"), { nickname: "امی", childName: "Ali" });
    assert.deepEqual(parentNames(parent, "en"), { nickname: "Ammi", childName: "Ali" });
  });

  it("has English advice for every Urdu safety tip", () => {
    for (const rule of SAFETY_RULES) if (rule.tipsUr) assert.ok(TIPS_EN[rule.id], rule.id);
  });
});
