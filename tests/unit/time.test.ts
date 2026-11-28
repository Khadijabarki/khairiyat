// Daily call schedule in Pakistan time.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { callSlots, callTimeIso, currentSlot, dueSlot, isCallDue, pakistanToday, toMinutes, urduClock } from "../../src/lib/time";
import { readMedicines } from "../../src/lib/medicines";

describe("pakistanToday", () => {
  it("uses Pakistan time (UTC+5), not the server's time", () => {
    // 05:30 UTC = 10:30 in Pakistan
    const { minutesNow, startIso } = pakistanToday(new Date("2026-11-26T05:30:00Z"));
    assert.equal(minutesNow, 10 * 60 + 30);
    assert.equal(startIso, "2026-11-25T19:00:00.000Z"); // midnight in Pakistan
  });

  it("moves to the next day at Pakistan midnight, not UTC midnight", () => {
    // 20:00 UTC on the 26th is already 01:00 on the 27th in Pakistan
    const { minutesNow, startIso } = pakistanToday(new Date("2026-11-26T20:00:00Z"));
    assert.equal(minutesNow, 60);
    assert.equal(startIso, "2026-11-26T19:00:00.000Z");
  });
});

describe("callTimeIso", () => {
  it("gives today's call time in Pakistan", () => {
    // 15:35 in Pakistan = 10:35 UTC
    assert.equal(callTimeIso("2026-11-26T19:00:00.000Z", "15:35"), "2026-11-27T10:35:00.000Z");
  });

  it("lets a call moved to later in the day ring again", () => {
    const { startIso } = pakistanToday(new Date("2026-11-27T10:36:00Z"));
    const earlierCall = "2026-11-27T10:00:26.000Z"; // rang at 15:00 for the old time
    assert.ok(earlierCall < callTimeIso(startIso, "15:35"), "the old call must not count for the new time");
    assert.ok(earlierCall >= callTimeIso(startIso, "15:00"), "but it does count for its own time");
  });
});

describe("isCallDue", () => {
  it("is due from the call time until 3 hours later", () => {
    assert.equal(isCallDue("10:00", toMinutes("09:59")), false);
    assert.equal(isCallDue("10:00", toMinutes("10:00")), true);
    assert.equal(isCallDue("10:00", toMinutes("12:30")), true);
    assert.equal(isCallDue("10:00", toMinutes("13:01")), false);
  });
});

describe("callSlots", () => {
  const meds = [
    { name: "BP", time: "08:30" },
    { name: "Sugar", time: "14:00" },
    { name: "Neend", time: "22:00" },
    { name: "Vitamin" }, // no time: no extra call
  ];

  it("is just the daily call when no medicine has a time", () => {
    assert.deepEqual(callSlots("10:00", [{ name: "BP" }]), [{ time: "10:00", daily: true, medicines: [] }]);
  });

  it("adds a call for each medicine time, earliest first", () => {
    assert.deepEqual(callSlots("10:00", meds).map((s) => s.time), ["08:30", "10:00", "14:00", "22:00"]);
  });

  it("makes one call out of times less than an hour apart", () => {
    const slots = callSlots("09:00", meds);
    assert.deepEqual(slots[0], { time: "08:30", daily: true, medicines: ["BP"] });
    assert.equal(slots.length, 3);
    assert.equal(callSlots("09:30", meds).length, 4);
  });

  it("rings for the latest time that has passed, for up to 3 hours", () => {
    const slots = callSlots("10:00", meds);
    assert.equal(dueSlot(slots, toMinutes("08:29")), null);
    assert.equal(dueSlot(slots, toMinutes("08:30"))?.time, "08:30");
    assert.equal(dueSlot(slots, toMinutes("14:05"))?.time, "14:00");
    assert.equal(dueSlot(slots, toMinutes("17:30")), null);
  });

  it("knows which call a slightly early conversation belongs to", () => {
    const slots = callSlots("10:00", meds);
    assert.deepEqual(currentSlot(slots, toMinutes("13:45"))?.medicines, ["Sugar"]);
    assert.equal(currentSlot(slots, toMinutes("19:00")), null);
  });
});

describe("readMedicines", () => {
  it("keeps valid times and drops bad ones", () => {
    assert.deepEqual(readMedicines([{ name: "A", time: "07:05" }, { name: "B", when: "raat", time: "25:00" }, { when: "x" }, null]), [
      { name: "A", when: "", time: "07:05" },
      { name: "B", when: "raat" },
    ]);
    assert.deepEqual(readMedicines("junk"), []);
  });
});

describe("urduClock", () => {
  const at = (utc: string) => urduClock(new Date(`2026-11-28T${utc}:00Z`)); // Pakistan is 5 hours ahead

  it("says Pakistan time in Urdu words", () => {
    assert.equal(at("08:58"), "دن کے ایک بج کر اٹھاون منٹ");
    assert.equal(at("03:05"), "صبح کے آٹھ بج کر پانچ منٹ");
    assert.equal(at("12:30"), "شام کے پانچ بج کر تیس منٹ");
    assert.equal(at("17:45"), "رات کے دس بج کر پینتالیس منٹ");
  });

  it("handles full hours, midnight and every minute", () => {
    assert.equal(at("07:00"), "دن کے بارہ بجے");
    assert.equal(at("19:00"), "رات کے بارہ بجے");
    for (let minute = 1; minute < 60; minute++) {
      const said = at(`08:${String(minute).padStart(2, "0")}`);
      assert.ok(said.endsWith(" منٹ") && !said.includes("undefined"), said);
    }
  });
});
