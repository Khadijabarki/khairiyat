// The monthly doctor report.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Checkin } from "../../src/lib/db";
import { buildReport, reportMonth } from "../../src/lib/report";

function checkin(created_at: string, extra: Partial<Checkin> = {}): Checkin {
  return {
    id: created_at,
    parent_id: "p1",
    created_at,
    summary: "Theek hain.",
    family_message: null,
    mood: null,
    pain: null,
    sleep: null,
    medicine_taken: null,
    ate: null,
    risk_level: "normal",
    alerts: [],
    is_sample: false,
    ...extra,
  };
}

describe("reportMonth", () => {
  const now = new Date("2026-11-27T10:00:00Z");

  it("uses Pakistan month boundaries", () => {
    const m = reportMonth("2026-11", now);
    assert.equal(m.startIso, "2026-10-31T19:00:00.000Z");
    assert.equal(m.endIso, "2026-11-30T19:00:00.000Z");
    assert.equal(m.label, "November 2026");
    assert.equal(m.previousKey, "2026-10");
    assert.equal(m.nextKey, null);
  });

  it("moves between years", () => {
    const m = reportMonth("2026-01", now);
    assert.equal(m.previousKey, "2025-12");
    assert.equal(m.nextKey, "2026-02");
  });

  it("falls back to the current month for bad or future input", () => {
    for (const bad of [undefined, "", "2026-13", "2027-01", "november", ["2026-10"]]) {
      assert.equal(reportMonth(bad, now).key, "2026-11");
    }
  });

  it("is already the next month just after midnight in Pakistan", () => {
    assert.equal(reportMonth(undefined, new Date("2026-11-30T19:30:00Z")).key, "2026-12");
  });
});

describe("buildReport", () => {
  it("is empty without check-ins", () => {
    const r = buildReport([]);
    assert.equal(r.checkins, 0);
    assert.equal(r.mood.average, null);
    assert.deepEqual(r.days, []);
  });

  it("groups by Pakistan day, not UTC day", () => {
    // 20:00 UTC on the 26th and 05:00 UTC on the 27th are both the 27th in Pakistan.
    const r = buildReport([checkin("2026-11-26T20:00:00Z"), checkin("2026-11-27T05:00:00Z")]);
    assert.equal(r.days.length, 1);
    assert.equal(r.days[0].day, "2026-11-27");
    assert.equal(r.days[0].calls, 2);
  });

  it("averages days equally and keeps the worst pain of a day", () => {
    const r = buildReport([
      checkin("2026-11-01T05:00:00Z", { mood: 2, pain: 7 }),
      checkin("2026-11-01T09:00:00Z", { mood: 4, pain: 2 }),
      checkin("2026-11-02T05:00:00Z", { mood: 5, pain: 1 }),
    ]);
    assert.equal(r.days[0].mood, 3);
    assert.equal(r.days[0].pain, 7);
    assert.deepEqual(r.mood, { average: 4, lowest: 3, highest: 5, days: 2 });
    assert.equal(r.sleep.average, null);
  });

  it("never hides a missed medicine behind a later 'taken'", () => {
    const r = buildReport([
      checkin("2026-11-01T05:00:00Z", { medicine_taken: false }),
      checkin("2026-11-01T09:00:00Z", { medicine_taken: true }),
      checkin("2026-11-02T05:00:00Z", { medicine_taken: true }),
      checkin("2026-11-03T05:00:00Z"),
    ]);
    assert.deepEqual(r.medicine, { yes: 1, no: 1 });
  });

  it("counts each warning once per day, most frequent first", () => {
    const fall = { category: "fall", reason: "", source: "ai" as const };
    const fever = { category: "fever", reason: "", source: "ai" as const };
    const r = buildReport([
      checkin("2026-11-01T05:00:00Z", { alerts: [fever, fall] }),
      checkin("2026-11-01T09:00:00Z", { alerts: [fever] }),
      checkin("2026-11-02T05:00:00Z", { alerts: [fever] }),
    ]);
    assert.deepEqual(r.alerts, [
      { category: "fever", days: ["2026-11-01", "2026-11-02"] },
      { category: "fall", days: ["2026-11-01"] },
    ]);
  });
});
