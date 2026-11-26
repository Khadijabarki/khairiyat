// Server-only database access (Supabase).
// The secret key gives full access, so this file must never be imported by browser code.
// "server-only" makes the build fail if that ever happens by mistake.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Returns the Supabase client, or null if the keys are not configured
// (the app then still works, just without saving or memory).
export function db(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL?.trim(); // trim: a stray space in .env must not break things
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export type RiskLevel = "normal" | "concern" | "urgent";
export type StoredAlert = { category: string; reason: string; source: "ai" | "keywords" };

// One saved daily check-in (no transcript: only the summary and scores).
export type Checkin = {
  id: string;
  parent_id: string;
  created_at: string;
  summary: string;
  family_message: string | null;
  mood: number | null;
  pain: number | null;
  sleep: number | null;
  medicine_taken: boolean | null;
  ate: boolean | null;
  risk_level: RiskLevel;
  alerts: StoredAlert[];
  is_sample: boolean;
};

export type LiveAlert = {
  id: string;
  parent_id: string;
  created_at: string;
  category: string;
  level: "concern" | "urgent";
  reason: string | null;
  source: "ai" | "keywords";
};
