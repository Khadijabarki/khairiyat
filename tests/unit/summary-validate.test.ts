// The AI's summary must be checked before saving: nothing out of range, nothing unknown.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateSummary } from "../../src/lib/summary-validate";

describe("validateSummary", () => {
  it("keeps a good answer as it is", () => {
    const s = validateSummary({
      summary: "Ammi theek hain.",
      family_message: "Ammi theek hain, dawai li.",
      mood: 4, pain: 2, sleep: 5, medicine_taken: true, ate: true,
      risk_level: "normal", noticed: [],
    });
    assert.deepEqual(
      { mood: s.mood, pain: s.pain, sleep: s.sleep, risk: s.riskLevel, med: s.medicineTaken },
      { mood: 4, pain: 2, sleep: 5, risk: "normal", med: true },
    );
  });

  it("clamps numbers into their ranges and rounds them", () => {
    const s = validateSummary({ summary: "x", mood: 9, pain: -3, sleep: 2.6, risk_level: "normal", noticed: [] });
    assert.equal(s.mood, 5);
    assert.equal(s.pain, 0);
    assert.equal(s.sleep, 3);
  });

  it("turns missing or wrong-typed values into 'not discussed'", () => {
    const s = validateSummary({ summary: "x", mood: "happy", medicine_taken: "yes", risk_level: "normal", noticed: [] });
    assert.equal(s.mood, null);
    assert.equal(s.medicineTaken, null);
  });

  it("treats an unknown risk level as normal, and drops unknown alert categories", () => {
    const s = validateSummary({ summary: "x", risk_level: "apocalypse", noticed: ["fever", "made_up", "fever"] });
    assert.equal(s.riskLevel, "normal");
    assert.deepEqual(s.extraAlerts.map((a) => a.category), ["fever"]);
  });

  it("never saves an empty or overlong summary", () => {
    assert.ok(validateSummary({ summary: "", risk_level: "normal", noticed: [] }).summary.length > 0);
    assert.equal(validateSummary({ summary: "a".repeat(5000), risk_level: "normal", noticed: [] }).summary.length, 600);
  });
});
