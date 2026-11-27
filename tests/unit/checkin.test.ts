// A finished call must never be lost, even when the AI or the database fails.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isFallbackSummary, recordCheckin, type CheckinDeps, type CheckinRow } from "../../src/lib/checkin";
import type { CheckinSummary } from "../../src/lib/summary-validate";

const parent = { id: "ammi", nickname: "Ammi" };
const calm = [{ role: "ammi" as const, text: "Theek hoon beta, dawai le li" }];
const emergency = [{ role: "ammi" as const, text: "Beta seene mein dard ho raha hai" }];

const goodSummary: CheckinSummary = {
  summary: "Ammi theek hain.", familyMessage: "Ammi theek hain.", mood: 4, pain: 0, sleep: 4,
  medicineTaken: true, ate: true, riskLevel: "normal", extraAlerts: [],
};

// A fake database, AI and phone. `answers` are what the AI returns on each attempt.
function fake(answers: (CheckinSummary | null)[], saveWorks = true) {
  const rows = new Map<string, CheckinRow>();
  const messages: string[] = [];
  const background: (() => Promise<void>)[] = [];
  let nextId = 0;
  const deps: CheckinDeps = {
    summarize: async () => answers.shift() ?? null,
    save: async (row) => {
      if (saveWorks) rows.set(row.id, row);
      return saveWorks;
    },
    remove: async (id) => void rows.delete(id),
    notify: async (_title, body) => void messages.push(body),
    later: (task) => void background.push(task),
    wait: async () => {},
    newId: () => `id-${++nextId}`,
    now: () => new Date("2026-11-27T05:00:00Z"),
  };
  const runBackground = async () => {
    for (const task of background) await task();
  };
  return { deps, rows, messages, runBackground, saved: () => [...rows.values()] };
}

describe("recordCheckin", () => {
  it("saves the full summary and tells the family once", async () => {
    const f = fake([goodSummary]);
    const outcome = await recordCheckin(parent, calm, [], f.deps);
    await f.runBackground();
    assert.deepEqual(outcome, { saved: true, riskLevel: "normal", summaryPending: false });
    assert.equal(f.saved().length, 1);
    assert.equal(f.saved()[0].mood, 4);
    assert.equal(f.messages.length, 1);
  });

  it("still saves the check-in when the AI is busy, and never calls it 'all well'", async () => {
    const f = fake([null, null]);
    const outcome = await recordCheckin(parent, calm, [], f.deps);
    assert.deepEqual(outcome, { saved: true, riskLevel: "concern", summaryPending: true });
    assert.ok(isFallbackSummary(f.saved()[0].summary));
    assert.equal(f.saved()[0].mood, null);
    await f.runBackground();
    assert.equal(f.saved().length, 1);
    assert.equal(f.messages.length, 1);
  });

  it("replaces the basic check-in when the retry works", async () => {
    const f = fake([null, goodSummary]);
    await recordCheckin(parent, calm, [], f.deps);
    assert.equal(f.messages.length, 0, "a non-urgent message waits for the retry");
    await f.runBackground();
    assert.equal(f.saved().length, 1);
    assert.equal(f.saved()[0].summary, "Ammi theek hain.");
    assert.equal(f.saved()[0].created_at, "2026-11-27T05:00:00.000Z");
    assert.deepEqual(f.messages, ["Ammi theek hain."]);
  });

  it("sends urgent news immediately, even with no AI at all", async () => {
    const f = fake([null, null]);
    const outcome = await recordCheckin(parent, emergency, [], f.deps);
    assert.equal(outcome.riskLevel, "urgent");
    assert.equal(f.messages.length, 1, "told before the retry");
    assert.ok(f.messages[0].includes("Abhi call karein"));
    assert.equal(f.saved()[0].alerts[0].category, "chest_pain");
    await f.runBackground();
    assert.equal(f.messages.length, 1, "not told twice about the same thing");
  });

  it("keeps the call's alerts and doesn't repeat them", async () => {
    const f = fake([null]);
    await recordCheckin(parent, emergency, [{ category: "chest_pain", reason: "Seene mein dard", source: "ai" }], f.deps);
    assert.equal(f.saved()[0].alerts.length, 1);
    assert.equal(f.saved()[0].alerts[0].reason, "Seene mein dard");
  });

  it("is never less serious than its alerts, whatever the AI says", async () => {
    const f = fake([goodSummary]);
    const outcome = await recordCheckin(parent, emergency, [], f.deps);
    assert.equal(outcome.riskLevel, "urgent");
  });

  it("reports honestly when the database fails, and still tells the family", async () => {
    const f = fake([goodSummary], false);
    const outcome = await recordCheckin(parent, calm, [], f.deps);
    assert.equal(outcome.saved, false);
    assert.equal(f.messages.length, 1);
  });

  it("treats a crashing AI like a busy one", async () => {
    const f = fake([]);
    f.deps.summarize = async () => {
      throw new Error("network");
    };
    const outcome = await recordCheckin(parent, calm, [], f.deps);
    await f.runBackground();
    assert.equal(outcome.saved, true);
    assert.equal(f.saved().length, 1);
  });
});
