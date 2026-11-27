// Family member photos. Callers must check that the parent belongs to the signed-in family.
import "server-only";
import { connection } from "next/server";
import { db } from "./db";

// Photo addresses by parent id. ready is false until supabase/schema.sql has created the
// table; the app then simply shows the default avatars.
export async function photoUrls(parentIds: string[]): Promise<{ ready: boolean; urls: Record<string, string> }> {
  await connection();
  const supabase = db();
  if (!supabase) return { ready: false, urls: {} };
  const { data, error } = await supabase.from("parent_photos").select("parent_id, updated_at").in("parent_id", parentIds);
  if (error) {
    // PGRST205: the table is not created yet, which is expected before the SQL is run.
    if (error.code !== "PGRST205") console.error("photoUrls: database error", error.code);
    return { ready: false, urls: {} };
  }
  const urls: Record<string, string> = {};
  // The version in the address makes the browser fetch a changed photo.
  for (const row of data ?? []) urls[row.parent_id] = `/family/${row.parent_id}/photo?v=${Date.parse(row.updated_at)}`;
  return { ready: true, urls };
}

export async function photoBytes(parentId: string): Promise<Buffer | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase.from("parent_photos").select("image").eq("parent_id", parentId).maybeSingle();
  if (error) console.error("photoBytes: database error", error.code);
  return data ? Buffer.from(data.image, "base64") : null;
}

export async function savePhoto(parentId: string, bytes: Uint8Array): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  const { error } = await supabase.from("parent_photos").upsert(
    { parent_id: parentId, updated_at: new Date().toISOString(), image: Buffer.from(bytes).toString("base64") },
    { onConflict: "parent_id" },
  );
  if (error) console.error("savePhoto: database error", error.code);
  return !error;
}

export async function deletePhoto(parentId: string): Promise<void> {
  const { error } = (await db()?.from("parent_photos").delete().eq("parent_id", parentId)) ?? {};
  if (error) console.error("deletePhoto: database error", error.code);
}
