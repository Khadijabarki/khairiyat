// Tells the family something about their parent.
// - Web Push to every phone or computer where the family allowed alerts.
// - Optionally also Telegram (prototype: one chat for the whole server), only if
//   TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set.
// Everything is also shown on the family dashboard, so nothing is lost if no phone is set up.
// Notifying never throws: a failed message must not stop a check-in from being saved.
import "server-only";
import type { Parent } from "./data";
import { familyDevices, removeFamilyDevices } from "./family-devices";
import { sendPush } from "./push";

export type FamilyMessage = { title: string; body: string; urgent?: boolean };
type NotifiedParent = Pick<Parent, "id" | "familyId" | "isDemo">;

export async function notifyFamily(parent: NotifiedParent, message: FamilyMessage): Promise<void> {
  await Promise.all([pushToFamily(parent, message), sendTelegram(message)]);
}

async function pushToFamily(parent: NotifiedParent, message: FamilyMessage): Promise<void> {
  // The demo family is shared by everyone, so it never sends alerts to anyone's phone.
  if (parent.isDemo) return;
  try {
    const { gone } = await sendPush(
      await familyDevices(parent.familyId),
      {
        type: "family",
        title: message.title,
        body: message.body.slice(0, 500),
        urgent: Boolean(message.urgent),
        url: `/family/${parent.id}`,
      },
      { ttlSeconds: 12 * 60 * 60 }, // delivered later if the phone is offline now
    );
    await removeFamilyDevices(parent.familyId, gone);
  } catch (err) {
    console.error("pushToFamily: failed", err instanceof Error ? err.name : "unknown error");
  }
}

// Telegram's HTML mode needs these characters escaped, so text from the AI
// can't break the message formatting.
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendTelegram(message: FamilyMessage): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `<b>${escapeHtml(message.title)}</b>\n${escapeHtml(message.body)}`,
        parse_mode: "HTML",
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("sendTelegram: Telegram returned", res.status);
  } catch (err) {
    // Log the type only: the request URL contains the bot token.
    console.error("sendTelegram: failed", err instanceof Error ? err.name : "unknown error");
  }
}
