"use client";

// "Alerts on this phone": lets the son or daughter receive emergencies, summaries and
// unanswered-call warnings as notifications, even when the dashboard is closed.
import { useEffect, useState, useSyncExternalStore } from "react";
import { disableFamilyAlerts, enableFamilyAlerts } from "@/app/family/actions";
import { useLang } from "../i18n/LangProvider";
import SectionHeading from "../ui/SectionHeading";

type State = "checking" | "off" | "on" | "busy" | "blocked" | "failed";

const noSubscribe = () => () => {};
const supportsPush = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// Web Push needs the server's public key as bytes.
function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// Remembers on this browser that alerts were turned on here (just a flag, no personal data).
const FLAG = "khairiyat-family-alerts";
const readFlag = () => {
  try {
    return localStorage.getItem(FLAG) === "on";
  } catch {
    return false;
  }
};
const writeFlag = (on: boolean) => {
  try {
    if (on) localStorage.setItem(FLAG, "on");
    else localStorage.removeItem(FLAG);
  } catch {}
};

export default function FamilyAlerts({ vapidPublicKey, isDemo }: { vapidPublicKey: string; isDemo: boolean }) {
  const { t } = useLang();
  const supported = useSyncExternalStore(noSubscribe, supportsPush, () => false);
  const [state, setState] = useState<State>("checking");

  // Already turned on here? Re-send the subscription so the server stays up to date.
  useEffect(() => {
    if (isDemo || !supportsPush()) return;
    let cancelled = false;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const existing = await registration.pushManager.getSubscription();
        const on = Notification.permission === "granted" && existing && readFlag();
        const ok = on ? (await enableFamilyAlerts(existing.toJSON())).ok : false;
        if (!cancelled) setState(Notification.permission === "denied" ? "blocked" : ok ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  async function turnOn() {
    setState("busy");
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("blocked");
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(vapidPublicKey) }));
      const { ok } = await enableFamilyAlerts(subscription.toJSON());
      writeFlag(ok);
      setState(ok ? "on" : "failed");
    } catch {
      setState("failed");
    }
  }

  async function turnOff() {
    setState("busy");
    writeFlag(false);
    await disableFamilyAlerts().catch(() => {});
    setState("off");
  }

  let text: string;
  if (isDemo) text = t("Alerts are switched off in the shared demo. Create your own account to get them on your phone.", "مشترکہ ڈیمو میں الرٹ بند ہیں۔ اپنے فون پر الرٹ کے لیے اپنا اکاؤنٹ بنائیں۔");
  else if (!supported) text = t("This browser can't receive alerts. Try Chrome on Android or on a computer.", "اس براؤزر پر الرٹ نہیں آ سکتے۔ اینڈرائیڈ یا کمپیوٹر پر Chrome استعمال کریں۔");
  else if (state === "on") text = t("✓ This device gets emergencies, daily summaries and unanswered calls.", "✓ اس ڈیوائس پر ایمرجنسی، روز کا خلاصہ اور جواب نہ ملنے کی اطلاع آئے گی۔");
  else if (state === "blocked") text = t("Notifications are blocked. Allow them for this site in your browser settings, then reload.", "نوٹیفکیشن بند ہیں۔ براؤزر کی سیٹنگز میں اس سائٹ کی اجازت دیں، پھر صفحہ دوبارہ کھولیں۔");
  else if (state === "failed") text = t("Couldn't turn alerts on. Please try again.", "الرٹ آن نہیں ہو سکے۔ دوبارہ کوشش کریں۔");
  else text = t("Get emergencies, daily summaries and unanswered calls as notifications on this device.", "ایمرجنسی، روز کا خلاصہ اور جواب نہ ملنے کی اطلاع اسی ڈیوائس پر پائیں۔");

  const canToggle = !isDemo && supported && Boolean(vapidPublicKey) && state !== "blocked" && state !== "checking";

  return (
    <section className="mt-5 flex flex-wrap items-center justify-between gap-3 ui-card p-4">
      <div className="min-w-0">
        <SectionHeading icon="bell" title={t("Alerts on This Device", "اس ڈیوائس پر الرٹ")} />
        <p role="status" className="mt-2 text-sm text-stone-600">{text}</p>
      </div>
      {canToggle &&
        (state === "on" ? (
          <button type="button" onClick={turnOff} className="text-sm font-medium text-stone-600 underline-offset-2 hover:underline">
            {t("Turn off", "بند کریں")}
          </button>
        ) : (
          <button
            type="button"
            onClick={turnOn}
            disabled={state === "busy"}
            className="ui-btn ui-btn-primary"
          >
            {state === "busy" ? t("Please wait…", "انتظار کریں…") : t("Turn on alerts", "الرٹ آن کریں")}
          </button>
        ))}
    </section>
  );
}
