// Ringing, missed call, retry and family alert timing.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_TALK_MINUTES, liveCall, nextStep, ringMinutesFrom, ringsUntil, stoppedRinging, type RingMinutes } from "../../src/lib/call-rules";

const start = "2026-11-28T03:00:00.000Z";
const at = (minutes: number) => Date.parse(start) + minutes * 60 * 1000;
const call = (status: string, attempt: number) => ({ status, attempt, created_at: start });

for (const ring of [5, 2] as RingMinutes[]) {
  describe(`nextStep, ringing ${ring} minutes`, () => {
    const step = (status: string, attempt: number, minutes: number) => nextStep(call(status, attempt), at(minutes), ring);

    it("stops the first call without telling the family", () => {
      assert.equal(step("ringing", 1, ring - 1), "wait");
      assert.equal(step("ringing", 1, ring), "stop");
    });

    it("calls again 15 minutes after the first call, not before", () => {
      assert.equal(step("missed", 1, ring), "wait");
      assert.equal(step("missed", 1, 14), "wait");
      assert.equal(step("missed", 1, 15), "retry");
    });

    it("treats 'Later' like no answer: the second call comes at 15 minutes", () => {
      assert.equal(step("declined", 1, ring), "wait");
      assert.equal(step("declined", 1, 14), "wait");
      assert.equal(step("declined", 1, 15), "retry");
    });

    it("tells the family after 'Later' on the second call, once its ringing time is over", () => {
      assert.equal(step("declined", 2, ring - 1), "wait");
      assert.equal(step("declined", 2, ring), "alert");
    });

    it("sends nothing after an answered call, first or second", () => {
      for (const attempt of [1, 2]) {
        for (const minutes of [0, ring, 15, 15 + ring]) assert.equal(step("answered", attempt, minutes), "done");
      }
    });

    it("tells the family only when the second call has stopped, and only once", () => {
      assert.equal(step("ringing", 2, 0), "wait");
      assert.equal(step("ringing", 2, ring - 1), "wait");
      assert.equal(step("ringing", 2, ring), "stop-and-alert");
      assert.equal(step("missed", 2, ring + 5), "done");
    });
  });
}

describe("nextStep", () => {
  const step = (status: string, attempt: number, minutes: number) => nextStep(call(status, attempt), at(minutes), 5);

  it("allows for the scheduler running a few seconds early", () => {
    assert.equal(nextStep(call("ringing", 1), at(2) - 10_000, 2), "stop");
    assert.equal(nextStep(call("missed", 1), at(15) - 10_000, 2), "retry");
  });

  it("does not cut the ringing short by half a minute", () => {
    assert.equal(nextStep(call("ringing", 1), at(2) - 30_000, 2), "wait");
  });

  it("never rings again hours later", () => {
    assert.equal(step("missed", 1, 90), "done");
    assert.equal(step("declined", 1, 90), "done");
    assert.equal(step("ringing", 2, 90), "stop");
  });

  it("leaves failed calls alone", () => {
    assert.equal(step("failed", 1, 20), "done");
  });
});

describe("what the dashboard shows", () => {
  const iso = (minutes: number) => new Date(at(minutes)).toISOString();
  const show = (extra: object, minutes: number, talkedAt?: string) =>
    liveCall({ ...call("ringing", 1), ...extra }, talkedAt, at(minutes), 2);

  it("blocks 'Call now' while the phone rings, and frees it when the ringing stops", () => {
    assert.equal(show({}, 1).state, "ringing");
    assert.deepEqual(show({}, 2), { state: "calling-again", after: "missed", at: at(15) });
  });

  it("says when the second call comes after no answer or 'Later'", () => {
    assert.deepEqual(show({ status: "missed" }, 5), { state: "calling-again", after: "missed", at: at(15) });
    assert.deepEqual(show({ status: "declined" }, 1), { state: "calling-again", after: "declined", at: at(15) });
  });

  it("blocks 'Call now' while the answered call goes on, until the talk screen ends it", () => {
    const answered = { status: "answered", answered_at: iso(1) };
    assert.equal(show(answered, 3).state, "talking");
    assert.equal(show({ ...answered, ended_at: iso(4) }, 4).state, "idle");
  });

  it("never stays 'in progress' if the end message is lost", () => {
    const answered = { status: "answered", answered_at: iso(1) };
    assert.equal(show(answered, 3, iso(2)).state, "idle"); // the conversation was saved
    assert.equal(show(answered, 1 + MAX_TALK_MINUTES + 2).state, "idle"); // time limit
  });

  it("asks the family to call after the second call goes unanswered", () => {
    assert.equal(show({ attempt: 2, status: "missed" }, 3).state, "gave-up");
    assert.equal(show({ attempt: 2, status: "declined" }, 1).state, "gave-up");
  });

  it("shows nothing once it is settled or old", () => {
    assert.equal(liveCall(null, undefined, at(0), 5).state, "idle");
    assert.equal(show({ status: "failed" }, 0).state, "idle");
    assert.equal(show({ status: "missed" }, 5, iso(4)).state, "idle"); // talked since
    assert.equal(show({ status: "missed" }, 20).state, "idle"); // no second call came
    assert.equal(show({ attempt: 2, status: "missed" }, 90).state, "idle");
  });
});

describe("ringing time", () => {
  it("is counted from when the call was made", () => {
    for (const ring of [5, 2] as RingMinutes[]) {
      assert.equal(ringsUntil(start, ring), at(ring));
      assert.equal(stoppedRinging(start, at(ring - 0.1), ring), false);
      assert.equal(stoppedRinging(start, at(ring), ring), true);
    }
  });

  it("is 5 minutes unless 2 was chosen", () => {
    assert.equal(ringMinutesFrom("2"), 2);
    assert.equal(ringMinutesFrom(2), 2);
    for (const other of ["5", 5, "4", "", null, undefined]) assert.equal(ringMinutesFrom(other), 5);
  });
});
