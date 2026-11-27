// The server may only send push messages to real browser push services.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPushEndpoint, readSubscription } from "../../src/lib/push-endpoint";

describe("isPushEndpoint", () => {
  for (const good of [
    "https://fcm.googleapis.com/fcm/send/abc123",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
    "https://web.push.apple.com/abc",
  ]) {
    it(`accepts ${new URL(good).hostname}`, () => assert.equal(isPushEndpoint(good), true));
  }

  for (const bad of [
    "http://fcm.googleapis.com/fcm/send/abc", // not https
    "https://evil.example/fcm.googleapis.com",
    "https://fcm.googleapis.com.evil.example/x",
    "https://evilfcm.googleapis.com.attacker.io/x",
    "https://127.0.0.1/x",
    "https://localhost/x",
    "https://user:pass@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
    "not a url",
    "",
  ]) {
    it(`refuses "${bad}"`, () => assert.equal(isPushEndpoint(bad), false));
  }
});

describe("readSubscription", () => {
  const good = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) } };

  it("accepts a normal subscription and drops extra fields", () => {
    assert.deepEqual(readSubscription({ ...good, expirationTime: null, extra: "x" }), good);
  });

  it("refuses missing or odd keys", () => {
    assert.equal(readSubscription({ endpoint: good.endpoint }), null);
    assert.equal(readSubscription({ ...good, keys: { p256dh: "short", auth: good.keys.auth } }), null);
    assert.equal(readSubscription({ ...good, keys: { p256dh: good.keys.p256dh, auth: "has spaces here!!" } }), null);
    assert.equal(readSubscription(null), null);
  });
});
