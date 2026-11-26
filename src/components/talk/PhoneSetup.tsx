"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// One-time setup on the parent's phone, shown on their talk screen until it's done:
// 1. Install Khairiyat on the home screen (an app icon that opens straight to this screen).
// 2. Allow calls: lets Khairiyat ring the phone at the daily time (Web Push notifications).
// When everything is set up it shows nothing, so the parent's screen stays simple.

// The "install" event Chrome/Android gives us (not in TypeScript's built-in types).
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Web Push needs the server's public key as bytes.
function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// Sends this phone's push subscription to our server (safe to repeat; the server keeps one per phone).
async function saveSubscription(talkToken: string, subscription: PushSubscription): Promise<boolean> {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ talkToken, subscription: subscription.toJSON() }),
  });
  return res.ok;
}

// Facts about this phone and browser, read safely on the client (the server always sees "no").
const noSubscribe = () => () => {};
function subscribeStandalone(onChange: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);
  return () => {
    query.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
}
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIosDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const supportsPush = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const currentPermission = (): NotificationPermission => ("Notification" in window ? Notification.permission : "default");

export default function PhoneSetup({ talkToken, vapidPublicKey }: { talkToken: string; vapidPublicKey: string }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const installed = useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
  const isIos = useSyncExternalStore(noSubscribe, isIosDevice, () => false);
  const pushSupported = useSyncExternalStore(noSubscribe, supportsPush, () => false);
  const browserPermission = useSyncExternalStore(noSubscribe, currentPermission, () => "default" as NotificationPermission);
  // Updated right after the parent answers the permission question.
  const [askedPermission, setAskedPermission] = useState<NotificationPermission | null>(null);
  const permission = askedPermission ?? browserPermission;
  const [ready, setReady] = useState(false); // this phone can receive calls
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    const onInstallPrompt = (e: Event) => {
      e.preventDefault(); // we show our own big Urdu button instead of the small browser banner
      setInstallPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);

    // Register the background worker that makes the phone ring. If calls were already allowed,
    // quietly re-send the subscription so the server always has a fresh one.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(async (registration) => {
          if (!("Notification" in window) || Notification.permission !== "granted") return;
          const existing = await registration.pushManager.getSubscription();
          if (existing && (await saveSubscription(talkToken, existing))) setReady(true);
        })
        .catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
    };
  }, [talkToken]);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice; // the "appinstalled" event then updates "installed"
    setInstallPrompt(null);
  }

  async function allowCalls() {
    setBusy(true);
    setProblem("");
    try {
      const result = await Notification.requestPermission();
      setAskedPermission(result);
      if (result !== "granted") return;
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(vapidPublicKey) }));
      if (await saveSubscription(talkToken, subscription)) setReady(true);
      else setProblem("ابھی محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔");
    } catch {
      setProblem("یہ فون ابھی کالز کے لیے تیار نہیں ہو سکا۔");
    } finally {
      setBusy(false);
    }
  }

  // iPhones only allow notifications for apps added to the home screen.
  const canAskForCalls = pushSupported && Boolean(vapidPublicKey) && (!isIos || installed);
  const showInstall = !installed && (installPrompt !== null || isIos);
  const showAllow = canAskForCalls && !ready && permission !== "denied";
  if (!showInstall && !showAllow && permission !== "denied") return null;

  const button =
    "w-full rounded-2xl px-5 py-2 text-[clamp(1.05rem,4.8vw,1.3rem)] leading-[2] shadow active:scale-95 disabled:opacity-60";

  return (
    <div className="w-full max-w-md space-y-2 rounded-3xl border border-emerald-200 bg-white/80 p-3 text-center">
      {showInstall && installPrompt && (
        <button onClick={install} className={`${button} bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300`}>
          📲 ہوم اسکرین پر لگائیں
        </button>
      )}
      {showInstall && !installPrompt && isIos && (
        <p className="text-[clamp(0.95rem,4.2vw,1.1rem)] leading-[2.2] text-stone-700">
          ہوم اسکرین پر لگانے کے لیے نیچے <bdi>Share</bdi> ⬆️ دبائیں، پھر <bdi>Add to Home Screen</bdi> دبائیں۔
        </p>
      )}
      {showAllow && (
        <button onClick={allowCalls} disabled={busy} className={`${button} bg-emerald-700 text-white`}>
          {busy ? "…" : "🔔 خیریت کی کال کی اجازت دیں"}
        </button>
      )}
      {permission === "denied" && (
        <p className="text-[clamp(0.9rem,4vw,1.05rem)] leading-[2.2] text-rose-700">
          کالز کی اجازت بند ہے۔ فون کی <bdi>Settings</bdi> میں خیریت کے <bdi>Notifications</bdi> کھولیں۔
        </p>
      )}
      {problem && <p className="text-sm leading-[2.2] text-rose-700">{problem}</p>}
    </div>
  );
}
