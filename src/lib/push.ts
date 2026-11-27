// Sending Web Push messages (used for calling the parent and for alerting the family).
import "server-only";
import { sendNotification, setVapidDetails } from "web-push";

let ready = false;
export function setupPush(): boolean {
  if (ready) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;
  setVapidDetails(process.env.VAPID_SUBJECT?.trim() || "https://khairiyat.vercel.app", publicKey, privateKey);
  ready = true;
  return true;
}

export function vapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
}

// A saved phone, as stored in the database.
export type StoredDevice = { id: string; endpoint: string; p256dh: string; auth: string };

// Sends one message to several phones. Returns how many accepted it, and the ids of phones
// that no longer exist (app removed or notifications turned off) so they can be deleted.
export async function sendPush(
  devices: StoredDevice[],
  payload: Record<string, unknown>,
  options: { ttlSeconds: number; topic?: string },
): Promise<{ reached: number; gone: string[] }> {
  const gone: string[] = [];
  if (!setupPush() || devices.length === 0) return { reached: 0, gone };
  const body = JSON.stringify(payload);
  const results = await Promise.all(
    devices.map(async (device) => {
      try {
        await sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, body, {
          TTL: options.ttlSeconds,
          urgency: "high",
          topic: options.topic,
          timeout: 8000, // a slow push service must never hold up the app
        });
        return true;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(device.id);
        // Log the status only: a phone's push address is private.
        else console.error("sendPush: failed", status ?? (err instanceof Error ? err.name : "unknown"));
        return false;
      }
    }),
  );
  return { reached: results.filter(Boolean).length, gone };
}
