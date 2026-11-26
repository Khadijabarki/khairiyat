// Security helpers used by every API route.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSameOrigin, isValidId, isValidTalkToken, rateLimit, readJson, safeErrorInfo } from "../../src/lib/security";

const request = (headers: Record<string, string>, body?: string) =>
  new Request("http://localhost:3000/api/x", { method: "POST", headers, body });

describe("isSameOrigin", () => {
  it("accepts requests from our own site", () => {
    assert.equal(isSameOrigin(request({ origin: "http://localhost:3000", host: "localhost:3000" })), true);
  });
  it("rejects other websites and requests without an Origin (scripts)", () => {
    assert.equal(isSameOrigin(request({ origin: "https://evil.example", host: "localhost:3000" })), false);
    assert.equal(isSameOrigin(request({ host: "localhost:3000" })), false);
  });
});

describe("input checks", () => {
  it("accepts real talk tokens and rejects odd input", () => {
    assert.equal(isValidTalkToken("fDJkBnQN4QXxZEPVXumAHbYW_tD5yI7H"), true);
    assert.equal(isValidTalkToken("demo-ammi"), true);
    for (const bad of ["", "short", "../../etc/passwd", "a b c d e f g h", 42, null]) {
      assert.equal(isValidTalkToken(bad), false, String(bad));
    }
  });
  it("accepts parent ids and rejects path tricks", () => {
    assert.equal(isValidId("ammi"), true);
    assert.equal(isValidId("22630a1f-29a2-44a1-9a8b-8744e0511f5b"), true);
    assert.equal(isValidId("../../etc"), false);
  });
  it("refuses oversized or invalid JSON bodies", async () => {
    assert.equal(await readJson(request({}, JSON.stringify({ a: "x".repeat(3000) })), 1024), null);
    assert.equal(await readJson(request({}, "not json"), 1024), null);
    assert.equal(await readJson(request({}, "[1,2]"), 1024), null);
    assert.deepEqual(await readJson(request({}, '{"a":1}'), 1024), { a: 1 });
  });
});

describe("rateLimit", () => {
  it("allows up to the limit, then blocks", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) assert.equal(rateLimit(key, 3, 60_000), true);
    assert.equal(rateLimit(key, 3, 60_000), false);
  });
});

describe("safeErrorInfo", () => {
  it("never includes the error message (it could contain a secret)", () => {
    const err = Object.assign(new Error("invalid header value AIzaSECRET123"), { status: 400 });
    const info = safeErrorInfo(err);
    assert.equal(info.includes("SECRET"), false);
    assert.equal(info, "Error (HTTP 400)");
  });
});
