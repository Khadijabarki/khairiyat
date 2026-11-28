// The background worker must stop the ringing everywhere once a call is dealt with.
import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";

type Handler = (event: unknown) => void;

function loadWorker() {
  const handlers: Record<string, Handler> = {};
  const messages: { type: string; callId?: string }[] = [];
  const shown: { title: string; options: { tag?: string; silent?: boolean } }[] = [];
  const requests: string[] = [];
  const windows = [{ url: "https://x/talk/abcdefgh", postMessage: (m: { type: string }) => messages.push(m), focus: () => {} }];
  const self = {
    addEventListener: (name: string, fn: Handler) => (handlers[name] = fn),
    clients: { matchAll: async () => windows, openWindow: async () => {}, claim: () => {} },
    registration: { showNotification: async (title: string, options: object) => void shown.push({ title, options }) },
    skipWaiting: () => {},
    location: { origin: "https://x" },
  };
  const fetch = async (_url: string, init: { body: string }) => void requests.push(init.body);
  vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), { self, fetch, URL, Date, Promise });
  const run = async (name: string, event: object) => {
    let done: Promise<unknown> = Promise.resolve();
    handlers[name]({ ...event, waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
  };
  return { run, messages, shown, requests };
}

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
