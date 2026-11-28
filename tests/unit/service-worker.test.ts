// The background worker: it keeps ringing, and stops everywhere once a call is dealt with.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";

type Handler = (event: unknown) => void;
type Options = { tag?: string; silent?: boolean; renotify?: boolean; data?: { callId?: string; ringing?: boolean } };

const START = 1_000_000;

function loadWorker({ appOnScreen = false } = {}) {
  const handlers: Record<string, Handler> = {};
  const messages: { type: string; callId?: string }[] = [];
  const shown: { title: string; options: Options; at: number }[] = [];
  const requests: string[] = [];
  let current: { data?: Options["data"] }[] = []; // notifications on screen (one per tag)
  let now = START;
  let onShow: () => void = () => {};
  const windows = [
    {
      url: "https://x/talk/abcdefgh",
      visibilityState: appOnScreen ? "visible" : "hidden",
      postMessage: (m: { type: string }) => messages.push(m),
      focus: () => {},
    },
  ];
  const self = {
    addEventListener: (name: string, fn: Handler) => (handlers[name] = fn),
    clients: { matchAll: async () => windows, openWindow: async () => {}, claim: () => {} },
    registration: {
      showNotification: async (title: string, options: Options) => {
        shown.push({ title, options, at: now });
        current = [{ data: options.data }];
        onShow();
      },
      getNotifications: async () => current,
    },
    skipWaiting: () => {},
    location: { origin: "https://x" },
  };
  const fetch = async (_url: string, init: { body: string }) => void requests.push(init.body);
  // A pretend clock: waiting moves it forward at once.
  const setTimeout = (fn: () => void, ms: number) => {
    now += ms;
    queueMicrotask(fn);
  };
  vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), { self, fetch, URL, Date: { now: () => now }, Promise, setTimeout });
  const run = async (name: string, event: object) => {
    let done: Promise<unknown> = Promise.resolve();
    handlers[name]({ ...event, waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
  };
  const ring = (callId: string, minutes: number) =>
    run("push", { data: { json: () => ({ type: "call", callId, url: `/talk/abcdefgh?call=${callId}`, until: START + minutes * 60_000 }) } });
  return { run, ring, messages, shown, requests, clearScreen: () => (current = []), whenShown: (fn: () => void) => (onShow = fn) };
}

describe("service worker repeats the ring", () => {
  it("sounds again every few seconds until the call's ringing time is over", async () => {
    const w = loadWorker();
    await w.ring("c1", 2);
    assert.equal(w.shown.length, 30); // every 4 seconds for 2 minutes
    assert.ok(w.shown.every((n) => n.options.renotify && !n.options.silent));
    assert.ok(w.shown[w.shown.length - 1].at < START + 2 * 60_000);
  });

  it("stops before the browser would stop the worker, even for a 5-minute call", async () => {
    const w = loadWorker();
    await w.ring("c1", 5);
    assert.ok(w.shown[w.shown.length - 1].at < START + 4.5 * 60_000);
  });

  it("stops when the notification is swiped away or cleared by the talk screen", async () => {
    const w = loadWorker();
    w.whenShown(() => w.shown.length === 3 && w.clearScreen());
    await w.ring("c1", 2);
    assert.equal(w.shown.length, 3);

    const swiped = loadWorker();
    swiped.whenShown(() => {
      if (swiped.shown.length === 2) void swiped.run("notificationclose", { notification: { data: { callId: "c1" } } });
    });
    await swiped.ring("c1", 2);
    assert.equal(swiped.shown.length, 2);
  });

  it("stops when the call is answered elsewhere, without covering the new message", async () => {
    const w = loadWorker();
    w.whenShown(() => {
      if (w.shown.length === 3) void w.run("push", { data: { json: () => ({ type: "ended", callId: "c1", url: "/talk/abcdefgh", title: "done" }) } });
    });
    await w.ring("c1", 2);
    assert.equal(w.shown.length, 4);
    assert.equal(w.shown[3].options.silent, true);
  });

  it("does not repeat while the app is on screen, which rings by itself", async () => {
    const w = loadWorker({ appOnScreen: true });
    await w.ring("c1", 2);
    assert.equal(w.shown.length, 1);
  });
});

describe("service worker ringing", () => {
  it("stops open screens and quietly replaces the ringing notification when a call is dealt with", async () => {
    const w = loadWorker();
    await w.run("push", { data: { json: () => ({ type: "ended", callId: "c1", url: "/talk/abcdefgh", title: "done" }) } });
    assert.deepEqual(w.messages.map((m) => [m.type, m.callId]), [["call-ended", "c1"]]);
    assert.equal(w.shown[0].options.tag, "khairiyat-call");
    assert.equal(w.shown[0].options.silent, true);
  });

  it("stops open screens at once when 'Later' is pressed on the notification", async () => {
    const w = loadWorker();
    await w.run("notificationclick", {
      action: "later",
      notification: { close: () => {}, data: { url: "/talk/abcdefgh?call=c2", callId: "c2" } },
    });
    assert.deepEqual(w.messages.map((m) => m.type), ["call-ended"]);
    assert.ok(w.requests[0].includes('"action":"decline"'));
  });

  it("does not ring for a call that has already ended", async () => {
    const w = loadWorker();
    await w.run("push", { data: { json: () => ({ type: "call", callId: "c3", url: "/talk/abcdefgh?call=c3", until: 1 }) } });
    assert.deepEqual(w.messages.map((m) => m.type), ["call-ended"]);
  });
});
