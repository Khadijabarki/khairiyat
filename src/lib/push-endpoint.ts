// Which addresses we are willing to send push messages to.
// A browser gives us the address, but anyone can call our API with a made-up one, and our
// server would then send a request to it. So only the browser makers' push services are allowed.
const PUSH_HOSTS = [
  "fcm.googleapis.com", // Chrome, Edge on Android, Samsung Internet
  "push.services.mozilla.com", // Firefox
  "notify.windows.com", // Edge on Windows
  "push.apple.com", // Safari and iPhone
];

export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1000) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password) return false;
    return PUSH_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

// Push keys are short base64url strings.
const BASE64URL = /^[A-Za-z0-9_-]{10,200}$/;

export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

// Checks a subscription sent by a browser. Returns it cleaned up, or null.
export function readSubscription(value: unknown): PushSubscriptionInput | null {
  const sub = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null | undefined;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!isPushEndpoint(endpoint) || typeof p256dh !== "string" || typeof auth !== "string") return null;
  if (!BASE64URL.test(p256dh) || !BASE64URL.test(auth)) return null;
  return { endpoint, keys: { p256dh, auth } };
}
