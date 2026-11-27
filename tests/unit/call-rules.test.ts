// Ringing, retry and family alert timing.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextStep, stoppedRinging } from "../../src/lib/call-rules";

const start = "2026-11-28T03:00:00.000Z";
const at = (minutes: number) => Date.parse(start) + minutes * 60 * 1000;
const call = (status: string, attempt: number) => ({ status, attempt, created_at: start });

describe("nextStep", () => {
  it("calls again 15 minutes after an unanswered first call", () => {
    assert.equal(nextStep(call("ringing", 1), at(5)), "wait");
    assert.equal(nextStep(call("ringing", 1), at(10)), "wait");
    assert.equal(nextStep(call("ringing", 1), at(15)), "retry");
  });

  it("tells the family 5 minutes after an unanswered second call", () => {
    assert.equal(nextStep(call("ringing", 2), at(4)), "wait");
    assert.equal(nextStep(call("ringing", 2), at(5)), "alert");
  });

  it("is not delayed when the scheduler runs a few seconds early", () => {
    assert.equal(nextStep(call("ringing", 1), at(15) - 10_000), "retry");
    assert.equal(nextStep(call("ringing", 2), at(5) - 10_000), "alert");
  });

  it("waits 30 minutes after 'Later', and does nothing more after the second 'Later'", () => {
    assert.equal(nextStep(call("declined", 1), at(15)), "wait");
    assert.equal(nextStep(call("declined", 1), at(30)), "retry");
    assert.equal(nextStep(call("declined", 2), at(60)), "done");
  });

  it("leaves answered calls alone", () => {
    assert.equal(nextStep(call("answered", 1), at(60)), "done");
  });
});

describe("stoppedRinging", () => {
  it("is true from 5 minutes", () => {
    assert.equal(stoppedRinging(start, at(4.9)), false);
    assert.equal(stoppedRinging(start, at(5)), true);
  });
});
