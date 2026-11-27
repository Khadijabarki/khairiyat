// The family's voice message for a parent (one at a time).
// Callers must check who is asking first: a signed-in family (their own parent) or the
// parent's secret talk link.
import "server-only";
import { randomUUID } from "node:crypto";
import { connection } from "next/server";
import { db } from "./db";
import type { VoiceType } from "./voice-rules";

export type VoiceStatus = {
  ready: boolean; // false until supabase/schema.sql has created the table
  message: { createdAt: string; seconds: number; playedAt: string | null } | null;
};

export type PendingVoice = { id: string; mimeType: string; audio: string };

// What the family dashboard shows (never the audio itself).
export async function voiceStatus(parentId: string): Promise<VoiceStatus> {
  await connection(); // always fresh
  const supabase = db();
  if (!supabase) return { ready: false, message: null };
  const { data, error } = await supabase
    .from("voice_messages")
    .select("created_at, duration_seconds, played_at")
    .eq("parent_id", parentId)
    .maybeSingle();
  if (error) {
    console.error("voiceStatus: database error", error.code);
    return { ready: false, message: null };
  }
  return {
    ready: true,
    message: data ? { createdAt: data.created_at, seconds: data.duration_seconds, playedAt: data.played_at } : null,
  };
}

// Saves a new message, replacing any earlier one.
export async function saveVoice(parentId: string, mimeType: VoiceType, audio: Uint8Array, seconds: number): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  // A new id every time, so "heard" for the old recording can't mark the new one.
  const { error } = await supabase.from("voice_messages").upsert(
    {
      id: randomUUID(),
      parent_id: parentId,
      created_at: new Date().toISOString(),
      mime_type: mimeType,
      audio: Buffer.from(audio).toString("base64"),
      duration_seconds: seconds,
      played_at: null,
    },
    { onConflict: "parent_id" },
  );
  if (error) console.error("saveVoice: database error", error.code);
  return !error;
}

export async function deleteVoice(parentId: string): Promise<void> {
  const { error } = (await db()?.from("voice_messages").delete().eq("parent_id", parentId)) ?? {};
  if (error) console.error("deleteVoice: database error", error.code);
}

// The message the parent hasn't heard yet, or null.
export async function pendingVoice(parentId: string): Promise<PendingVoice | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("voice_messages")
    .select("id, mime_type, audio")
    .eq("parent_id", parentId)
    .is("played_at", null)
    .maybeSingle();
  if (error) console.error("pendingVoice: database error", error.code);
  return data?.audio ? { id: data.id, mimeType: data.mime_type, audio: data.audio } : null;
}

// The parent heard it: erase the recording and remember when.
export async function markVoiceHeard(parentId: string, id: string): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("voice_messages")
    .update({ played_at: new Date().toISOString(), audio: "" })
    .eq("id", id)
    .eq("parent_id", parentId)
    .is("played_at", null)
    .select("id");
  if (error) console.error("markVoiceHeard: database error", error.code);
  return Boolean(data?.length);
}
