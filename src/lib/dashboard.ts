// Reads what the family dashboard shows: recent check-ins and today's live alerts.
import "server-only";
import { connection } from "next/server";
import { db, type Checkin, type LiveAlert } from "./db";
import type { Lang } from "./i18n";

export type DashboardData = {
  checkins: Checkin[]; // newest first, last 14 days
  liveAlerts: LiveAlert[]; // newest first, last 24 hours
  databaseReady: boolean;
  nowMs: number; // when the data was read, so the page can build "last 7 days" consistently
};

export async function getDashboardData(parentId: string): Promise<DashboardData> {
  // Health data must always be fresh: tell Next.js this runs on every request
  // (never prerendered or cached), which also makes reading the current time safe.
  await connection();
  const supabase = db();
  const nowMs = Date.now();
  if (!supabase) return { checkins: [], liveAlerts: [], databaseReady: false, nowMs };

  const twoWeeksAgo = new Date(nowMs - 14 * 24 * 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

  const [checkins, alerts] = await Promise.all([
    supabase
      .from("checkins")
      .select("*")
      .eq("parent_id", parentId)
      .gte("created_at", twoWeeksAgo)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("live_alerts")
      .select("*")
      .eq("parent_id", parentId)
      .gte("created_at", dayAgo)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (checkins.error) console.error("dashboard: checkins error", checkins.error.code);
  if (alerts.error) console.error("dashboard: alerts error", alerts.error.code);

  return {
    checkins: (checkins.data as Checkin[]) ?? [],
    liveAlerts: (alerts.data as LiveAlert[]) ?? [],
    databaseReady: !checkins.error,
    nowMs,
  };
}

// Dates and times are always shown in Pakistan time.
const LOCALE: Record<Lang, string> = { en: "en-GB", ur: "ur-PK-u-nu-latn" }; // Western digits in both

export function formatDay(iso: string, lang: Lang = "en"): string {
  return new Date(iso).toLocaleDateString(LOCALE[lang], { timeZone: "Asia/Karachi", weekday: "short", day: "numeric", month: "short" });
}

export function formatTime(iso: string, lang: Lang = "en"): string {
  return new Date(iso).toLocaleTimeString(LOCALE[lang], { timeZone: "Asia/Karachi", hour: "numeric", minute: "2-digit", hour12: true });
}

// "2026-11-26" in Pakistan time, used to group check-ins by day.
export function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
}
