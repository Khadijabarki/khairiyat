// Safety rules: emergencies must be caught, and normal chat must NOT raise alarms.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SAFETY_RULES, detectByKeywords, getRule, safetyPrompt } from "../../src/lib/safety";

const ids = (text: string) => detectByKeywords(text).map((r) => r.id);

describe("safety keyword double-check", () => {
  const mustCatch: [string, string][] = [
    ["beta seene mein dard ho raha hai", "chest_pain"],
    ["سینے میں درد ہے", "chest_pain"],
    ["mera munh terha ho gaya hai", "stroke"],
    ["saans nahi aa rahi", "breathing"],
    ["main gir gayi thi uth nahi pa rahi", "fall"],
    ["heater ki boo aa rahi hai sar dard hai", "gas_fire"],
    ["sugar gir gayi lagti hai paseena aa raha", "low_sugar"],
    ["ghar mein chor ghus aaya", "intruder"],
    ["kisi ne phone par OTP maanga", "scam_call"],
    ["bank se call aayi thi", "scam_call"],
    ["aaj bukhar hai", "fever"],
    ["dawai khatam ho gayi", "medicine_missed"],
    ["main bohat udaas hoon", "lonely_sad"],
    ["mujhe chakkar aa rahe hain", "dizziness"],
  ];
  for (const [sentence, expected] of mustCatch) {
    it(`catches "${sentence}" as ${expected}`, () => {
      assert.ok(ids(sentence).includes(expected), `got: ${ids(sentence).join(", ") || "nothing"}`);
    });
  }

  const mustNotAlarm = ["aaj mausam acha hai", "khana kha liya", "phone gir gaya", "Assalam o alaikum beta, theek hoon"];
  for (const sentence of mustNotAlarm) {
    it(`does not alarm on "${sentence}"`, () => {
      assert.deepEqual(ids(sentence), []);
    });
  }
});

describe("safety rules list", () => {
  it("has unique ids", () => {
    const all = SAFETY_RULES.map((r) => r.id);
    assert.equal(new Set(all).size, all.length);
  });

  it("gives every urgent rule on-screen advice in Urdu", () => {
    for (const rule of SAFETY_RULES.filter((r) => r.level === "urgent")) {
      assert.ok(rule.tipsUr && rule.tipsUr.length > 5, `${rule.id} has no tipsUr`);
    }
  });

  it("finds rules by id", () => {
    assert.equal(getRule("chest_pain")?.level, "urgent");
    assert.equal(getRule("not_a_rule"), undefined);
  });

  it("puts every rule into the AI's instructions, with matching grammar", () => {
    const prompt = safetyPrompt("Ali", "raha");
    for (const rule of SAFETY_RULES) assert.ok(prompt.includes(`[${rule.id}]`), `${rule.id} missing from prompt`);
    assert.ok(prompt.includes("main abhi Ali ko bata raha hoon"));
  });
});
