// The phones and computers where a family member allowed alerts.
import "server-only";
import { db } from "./db";
import type { StoredDevice } from "./push";
import type { PushSubscriptionInput } from "./push-endpoint";

const MAX_DEVICES_PER_FAMILY = 10;

// Saves (or moves) a device to this family. Returns its id, or null.
export async function saveFamilyDevice(familyId: string, sub: PushSubscriptionInput): Promise<string | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("family_devices")
    .upsert(
      { family_id: familyId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      { onConflict: "endpoint" },
    )
    .select("id")
    .single();
  if (error || !data) {
    console.error("saveFamilyDevice: database error", error?.code ?? "");
    return null;
  }
  // Keep only the newest devices.
  const { data: all } = await supabase
    .from("family_devices")
    .select("id")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false });
  const extra = (all ?? []).slice(MAX_DEVICES_PER_FAMILY).map((r) => r.id);
  if (extra.length) await supabase.from("family_devices").delete().in("id", extra);
  return data.id;
}

export async function familyDevices(familyId: string): Promise<StoredDevice[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data, error } = await supabase.from("family_devices").select("id, endpoint, p256dh, auth").eq("family_id", familyId);
  if (error) console.error("familyDevices: database error", error.code);
  return (data as StoredDevice[]) ?? [];
}

// Always limited to the family's own devices.
export async function removeFamilyDevices(familyId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = (await db()?.from("family_devices").delete().eq("family_id", familyId).in("id", ids)) ?? {};
  if (error) console.error("removeFamilyDevices: database error", error.code);
}
