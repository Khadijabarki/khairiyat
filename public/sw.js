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

  if (data.type !== "call" || !data.url) return;

  event.waitUntil(
    (async () => {
      // If the app is already open, show the incoming-call screen right away.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const win of windows) win.postMessage({ type: "incoming-call", callId: data.callId });

      // The "ringing": a notification that stays until answered, with a long vibration.
      await self.registration.showNotification(data.title || "📞 خیریت", {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "khairiyat-call", // a new call replaces the old notification
        renotify: true,
        requireInteraction: true,
        vibrate: [800, 400, 800, 400, 800, 400, 800, 400, 800],
        dir: "rtl",
        lang: "ur",
        data: { url: data.url, callId: data.callId },
        actions: [
          { action: "answer", title: "اٹھائیں" },
          { action: "later", title: "بعد میں" },
        ],
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url, callId, family } = event.notification.data || {};
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
      fetch("/api/call/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talkToken: talkTokenFrom(url), callId, action: "decline" }),
      }).catch(() => {}),
    );
    return;
  }

  // "Answer" or a tap on the notification: open (or bring forward) the talk screen.
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const win of windows) {
        if (new URL(win.url).pathname === new URL(url, self.location.origin).pathname) {
          win.postMessage({ type: "incoming-call", callId });
          return win.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
