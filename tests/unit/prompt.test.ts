// The AI's instructions: right Urdu grammar for mother/father and daughter/son, memory, medicines.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Parent } from "../../src/lib/data";
import { buildSystemPrompt } from "../../src/lib/prompt";

const parent = (overrides: Partial<Parent> = {}): Parent => ({
  id: "test", familyId: "f", name: "Zubaida Begum", gender: "female", nickname: "Ammi", nicknameUr: "امی",
  childName: "Ali", childNameUr: "علی", childPhone: "", language: "urdu",
  medicines: [{ name: "BP ki goli", when: "subah" }], topics: ["cricket"],
  companion: { gender: "female", voice: "Sulafat" }, checkinTime: "10:00", talkToken: "demo-test",
  consentGiven: true, isDemo: false, ...overrides,
});

describe("buildSystemPrompt", () => {
  it("talks as a daughter to a mother", () => {
    const p = buildSystemPrompt(parent(), []);
    assert.ok(p.includes("ek pyari beti"));
    assert.ok(p.includes("aap leti hain"));
    assert.ok(p.includes("bata rahi hoon"));
  });

  it("talks as a son to a father", () => {
    const p = buildSystemPrompt(parent({ gender: "male", nickname: "Abbu", companion: { gender: "male", voice: "Achird" } }), []);
    assert.ok(p.includes("ek pyara beta"));
    assert.ok(p.includes("aap lete hain"));
    assert.ok(p.includes("bata raha hoon"));
  });

  it("includes the family's medicines and past days (memory)", () => {
    const p = buildSystemPrompt(parent(), [{ date: "Wednesday, 25 November", summary: "Ghutne mein dard tha." }]);
    assert.ok(p.includes("BP ki goli (subah)"));
    assert.ok(p.includes("Ghutne mein dard tha."));
  });

  it("replies in Urdu by default and never uses Indian greetings", () => {
    const p = buildSystemPrompt(parent(), []);
    assert.ok(p.includes("HAMESHA saaf, ghar wali Pakistani Urdu"));
    assert.ok(p.includes("KABHI nahi"));
  });

  it("mentions the voice message button once at the end, but not in the demo", () => {
    assert.ok(buildSystemPrompt(parent(), []).includes("paigham wala button"));
    assert.ok(!buildSystemPrompt(parent({ isDemo: true }), []).includes("paigham wala button"));
  });

  it("tells the AI the current Pakistan time", () => {
    assert.ok(buildSystemPrompt(parent(), []).includes("Abhi Pakistan mein asal waqt hai"));
  });
});
