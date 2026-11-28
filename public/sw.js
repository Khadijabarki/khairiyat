// Khairiyat's service worker: runs in the background on the parent's phone.
// It receives "call" messages (Web Push), makes the phone ring with a notification,
// and handles the Answer / Later buttons. It never stores any conversation.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// The talk token is the part after /talk/ in the call link.
function talkTokenFrom(url) {
  const match = /\/talk\/([A-Za-z0-9_-]{8,64})/.exec(url || "");
  return match ? match[1] : "";
}

// Tells every open Khairiyat window on this device to stop ringing for this call.
async function stopRingingScreens(callId) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const win of windows) win.postMessage({ type: "call-ended", callId });
}

// ---------- Ringing again and again ----------
// A web app can't play a ringtone while closed. Instead the ringing notification sounds and
// vibrates again every few seconds, until it is answered, put off, swiped away or the call ends.
const RING_EVERY_MS = 4000;
const MAX_RING_MS = 4.5 * 60 * 1000; // browsers stop a background worker after about 5 minutes
const quieted = new Set(); // calls that must not sound again

function quiet(callId) {
  if (callId) quieted.add(callId);
}

async function keepRinging(callId, until, ringOnce) {
  const stopAt = Math.min(Number(until) || Infinity, Date.now() + MAX_RING_MS);
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, RING_EVERY_MS));
    if (quieted.has(callId) || Date.now() >= stopAt) return;
    // No longer there (opened, swiped away, cleared by the talk screen) or replaced: stop.
    const showing = await self.registration.getNotifications({ tag: "khairiyat-call" });
    if (!showing.some((n) => n.data && n.data.ringing && n.data.callId === callId)) return;
    // While the app is on screen it rings by itself.
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (windows.some((w) => w.visibilityState === "visible" && w.url.includes("/talk/"))) continue;
    if (quieted.has(callId)) return;
    await ringOnce();
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    return;
  }
  // An alert for the son or daughter (emergency, daily summary or an unanswered call).
  if (data.type === "family" && typeof data.url === "string" && data.url.startsWith("/family/")) {
    event.waitUntil(
      self.registration.showNotification(data.title || "Khairiyat", {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        // Urgent news stays on screen and vibrates strongly.
        requireInteraction: Boolean(data.urgent),
        vibrate: data.urgent ? [600, 200, 600, 200, 600, 200, 600] : [200],
        data: { url: data.url, family: true },
      }),
    );
    return;
  }

  // Answered or put off on one of the parent's phones: stop ringing here too.
  if (data.type === "ended" && data.url) {
    quiet(data.callId);
    event.waitUntil(
      (async () => {
        await stopRingingScreens(data.callId);
        // Same tag: this quietly takes the place of the ringing notification.
        await self.registration.showNotification(data.title || "خیریت", {
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "khairiyat-call",
          silent: true,
          dir: "rtl",
          lang: "ur",
          data: { url: data.url },
        });
      })(),
    );
    return;
  }

  // A call that ended without an answer: stop any ringing screen and leave a "missed call".
  const missed = data.type === "missed" || (data.type === "call" && data.until && Date.now() >= data.until);
  if (missed && data.url) {
    quiet(data.callId);
    event.waitUntil(
      (async () => {
        await stopRingingScreens(data.callId);
        await self.registration.showNotification(data.type === "missed" ? data.title : "📵 خیریت کی مس کال", {
          body: data.type === "missed" ? data.body : "بات کرنے کے لیے دبائیں۔",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "khairiyat-call", // replaces the ringing notification
          dir: "rtl",
          lang: "ur",
          data: { url: data.url.split("?")[0] },
        });
      })(),
    );
    return;
  }

  if (data.type !== "call" || !data.url) return;

  event.waitUntil(
    (async () => {
      // If the app is already open, show the incoming-call screen right away.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const win of windows) win.postMessage({ type: "incoming-call", callId: data.callId, until: data.until });

      // The "ringing": a notification that stays until answered, with a long vibration.
      const ringOnce = () =>
        self.registration.showNotification(data.title || "📞 خیریت", {
          body: data.body || "",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "khairiyat-call", // a new call replaces the old notification
          renotify: true, // sound and vibration every time
          requireInteraction: true,
          vibrate: [800, 400, 800, 400, 800],
          dir: "rtl",
          lang: "ur",
          data: { url: data.url, callId: data.callId, until: data.until, ringing: true },
          actions: [
            { action: "answer", title: "اٹھائیں" },
            { action: "later", title: "بعد میں" },
          ],
        });
      quieted.delete(data.callId);
      await ringOnce();
      await keepRinging(data.callId, data.until, ringOnce);
    })(),
  );
});

// Swiped away: that call stays quiet.
self.addEventListener("notificationclose", (event) => {
  quiet(event.notification.data && event.notification.data.callId);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url, callId, family, until } = event.notification.data || {};
  quiet(callId);
  if (!url) return;

  // A family alert opens that parent's dashboard.
  if (family) {
    event.waitUntil(
      (async () => {
        const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const win of windows) {
          if (new URL(win.url).pathname === url) return win.focus();
        }
        return self.clients.openWindow(url);
      })(),
    );
    return;
  }

  // "Later": tell the server, so Khairiyat calls again a bit later.
  if (event.action === "later") {
    event.waitUntil(
      Promise.all([
        stopRingingScreens(callId), // an open talk screen must stop at once
        fetch("/api/call/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ talkToken: talkTokenFrom(url), callId, action: "decline" }),
        }).catch(() => {}),
      ]),
    );
    return;
  }

  // "Answer" or a tap on the notification: open (or bring forward) the talk screen.
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const win of windows) {
        if (new URL(win.url).pathname === new URL(url, self.location.origin).pathname) {
          if (callId) win.postMessage({ type: "incoming-call", callId, until });
          return win.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
