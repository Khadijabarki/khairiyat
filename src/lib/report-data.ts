// Reads one month of a parent's saved information for the doctor report.
// The caller must already have checked that this parent belongs to the signed-in family.
import "server-only";
import { connection } from "next/server";
import { db, type Checkin } from "./db";
import type { Month } from "./report";

export type MonthData = {
  checkins: Checkin[];
  unansweredDays: number; // days on which the daily call got no answer
  ok: boolean; // false if the database couldn't be read: the report must not look empty
};

export async function getMonthData(parentId: string, month: Month): Promise<MonthData> {
  await connection(); // health data is always read fresh
  const supabase = db();
  if (!supabase) return { checkins: [], unansweredDays: 0, ok: false };

  const [checkins, unanswered] = await Promise.all([
    supabase
      .from("checkins")
      .select("*")
      .eq("parent_id", parentId)
      .gte("created_at", month.startIso)
      .lt("created_at", month.endIso)
      .order("created_at", { ascending: true })
      .limit(1000),
    supabase
      .from("live_alerts")
      .select("created_at")
      .eq("parent_id", parentId)
      .eq("category", "no_answer")
      .gte("created_at", month.startIso)
      .lt("created_at", month.endIso)
      .limit(1000),
  ]);
  if (checkins.error) console.error("report: checkins error", checkins.error.code);
  if (unanswered.error) console.error("report: alerts error", unanswered.error.code);

  const days = new Set(
    (unanswered.data ?? []).map((a) => new Date(a.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" })),
  );
  return {
    checkins: (checkins.data as Checkin[]) ?? [],
    unansweredDays: days.size,
    ok: !checkins.error && !unanswered.error,
  };
}
