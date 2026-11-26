// Daily call schedule in Pakistan time.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCallDue, pakistanToday, toMinutes } from "../../src/lib/time";

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

describe("isCallDue", () => {
  it("is due from the call time until 3 hours later", () => {
    assert.equal(isCallDue("10:00", toMinutes("09:59")), false);
    assert.equal(isCallDue("10:00", toMinutes("10:00")), true);
    assert.equal(isCallDue("10:00", toMinutes("12:30")), true);
    assert.equal(isCallDue("10:00", toMinutes("13:01")), false);
  });
});
