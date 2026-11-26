// Sends a message to the family's phone.
// Prototype: Telegram (free, no approval needed), only if TELEGRAM_BOT_TOKEN and
// TELEGRAM_CHAT_ID are set. Production: WhatsApp Business API.
// Every message is also saved and shown on the family dashboard, so nothing is lost
// if Telegram isn't configured.
import "server-only";

// Telegram's HTML mode needs these characters escaped, so text from the AI
// can't break the message formatting.
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function notifyFamily(title: string, body: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: `<b>${escapeHtml(title)}</b>\n${escapeHtml(body)}`, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(5000), // never let a slow Telegram hold up the app
    });
    if (!res.ok) console.error("notifyFamily: Telegram returned", res.status);
    return res.ok;
  } catch (err) {
    // Log the type only: the request URL contains the bot token.
    console.error("notifyFamily: failed", err instanceof Error ? err.name : "unknown error");
    return false;
  }
}
