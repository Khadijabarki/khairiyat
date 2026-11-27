// Ringing, missed call, retry and family alert timing.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextStep, ringsUntil, stoppedRinging } from "../../src/lib/call-rules";

const start = "2026-11-28T03:00:00.000Z";
const at = (minutes: number) => Date.parse(start) + minutes * 60 * 1000;
const call = (status: string, attempt: number) => ({ status, attempt, created_at: start });

describe("nextStep", () => {
  it("stops the first call after 5 minutes without telling the family", () => {
    assert.equal(nextStep(call("ringing", 1), at(4)), "wait");
    assert.equal(nextStep(call("ringing", 1), at(5)), "stop");
  });

  it("calls again 10 minutes after the first call", () => {
    assert.equal(nextStep(call("missed", 1), at(5)), "wait");
    assert.equal(nextStep(call("missed", 1), at(10)), "retry");
  });

  it("stops the second call after 5 minutes and tells the family, once", () => {
    assert.equal(nextStep(call("ringing", 2), at(5)), "stop-and-alert");
    assert.equal(nextStep(call("missed", 2), at(10)), "done");
  });

  it("is not delayed when the scheduler runs a few seconds early", () => {
    assert.equal(nextStep(call("ringing", 1), at(5) - 10_000), "stop");
    assert.equal(nextStep(call("missed", 1), at(10) - 10_000), "retry");
  });

  it("calls again after 'Later', and tells the family after a second 'Later'", () => {
    assert.equal(nextStep(call("declined", 1), at(5)), "wait");
    assert.equal(nextStep(call("declined", 1), at(10)), "retry");
    assert.equal(nextStep(call("declined", 2), at(10)), "alert");
  });

  it("never rings again hours later", () => {
    assert.equal(nextStep(call("missed", 1), at(90)), "done");
    assert.equal(nextStep(call("declined", 1), at(90)), "done");
    assert.equal(nextStep(call("ringing", 2), at(90)), "stop");
  });

  it("leaves answered and failed calls alone", () => {
    assert.equal(nextStep(call("answered", 1), at(20)), "done");
    assert.equal(nextStep(call("failed", 1), at(20)), "done");
  });
});

describe("ringing time", () => {
  it("is counted from when the call was made", () => {
    assert.equal(ringsUntil(start), at(5));
    assert.equal(stoppedRinging(start, at(4.9)), false);
    assert.equal(stoppedRinging(start, at(5)), true);
  });
});
