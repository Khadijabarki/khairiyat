// Voice messages a parent records for their son or daughter. These are separate from the
// conversation with Khairiyat: they are never sent to the AI.
// Callers must check who is asking first: the parent's secret talk link (to save), or a
// signed-in family and its own parent (to list, play and delete).
import "server-only";
import { connection } from "next/server";
import { db } from "./db";
import type { VoiceType } from "./voice-rules";

export const KEPT_MESSAGES = 5; // only the newest ones are kept

export type ParentMessage = { id: string; createdAt: string; seconds: number; heardAt: string | null };

// Saves a new message and removes the oldest ones beyond the limit.
export async function saveParentMessage(parentId: string, mimeType: VoiceType, audio: Uint8Array, seconds: number): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  const { error } = await supabase.from("parent_messages").insert({
    parent_id: parentId,
    mime_type: mimeType,
    audio: Buffer.from(audio).toString("base64"),
    duration_seconds: seconds,
  });
  if (error) {
    console.error("saveParentMessage: database error", error.code);
    return false;
  }
  const { data } = await supabase
    .from("parent_messages")
    .select("id")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false });
  const extra = (data ?? []).slice(KEPT_MESSAGES).map((r) => r.id);
  if (extra.length) await supabase.from("parent_messages").delete().eq("parent_id", parentId).in("id", extra);
  return true;
}

// For the dashboard, newest first (never the audio itself). ready is false until
// supabase/schema.sql has created the table.
export async function listParentMessages(parentId: string): Promise<{ ready: boolean; messages: ParentMessage[] }> {
  await connection(); // always fresh
  const supabase = db();
  if (!supabase) return { ready: false, messages: [] };
  const { data, error } = await supabase
    .from("parent_messages")
    .select("id, created_at, duration_seconds, heard_at")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
    .limit(KEPT_MESSAGES);
  if (error) {
    console.error("listParentMessages: database error", error.code);
    return { ready: false, messages: [] };
  }
  return {
    ready: true,
    messages: (data ?? []).map((m) => ({ id: m.id, createdAt: m.created_at, seconds: m.duration_seconds, heardAt: m.heard_at })),
  };
}

// The recording itself, only if it belongs to this parent.
export async function parentMessageAudio(parentId: string, id: string): Promise<{ mimeType: string; bytes: Buffer } | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("parent_messages")
    .select("mime_type, audio")
    .eq("id", id)
    .eq("parent_id", parentId)
    .maybeSingle();
  if (error) console.error("parentMessageAudio: database error", error.code);
  return data ? { mimeType: data.mime_type, bytes: Buffer.from(data.audio, "base64") } : null;
}

export async function markParentMessageHeard(parentId: string, id: string): Promise<void> {
  const { error } =
    (await db()
      ?.from("parent_messages")
      .update({ heard_at: new Date().toISOString() })
      .eq("id", id)
      .eq("parent_id", parentId)
      .is("heard_at", null)) ?? {};
  if (error) console.error("markParentMessageHeard: database error", error.code);
}

export async function deleteParentMessage(parentId: string, id: string): Promise<void> {
  const { error } = (await db()?.from("parent_messages").delete().eq("id", id).eq("parent_id", parentId)) ?? {};
  if (error) console.error("deleteParentMessage: database error", error.code);
}
