"use server";
// Adding, editing and removing parents, and renewing a parent's talk link.
// Every action first checks who is signed in, and only ever touches that family's parents.

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { deviceCount, ringParent } from "@/lib/calls";
import { getFamilyParent } from "@/lib/data";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";

import type { ParentFormValues } from "@/components/family/ParentForm";

// On an error, the typed-in values are sent back so the form can show them again
// (React clears a form after it is submitted).
export type ParentFormState = { error?: string; values?: ParentFormValues };

const MAX_MEDICINES = 8;
const MAX_TOPICS = 8;

// A new secret for the talk link: 24 random bytes = 32 URL-safe characters (impossible to guess).
function newTalkToken(): string {
  return randomBytes(24).toString("base64url");
}

function text(form: FormData, key: string, max: number): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

// What the family typed, for showing the form again after an error.
function echoValues(form: FormData): ParentFormValues {
  const medicines: { name: string; when: string }[] = [];
  for (let i = 0; i < MAX_MEDICINES; i++) {
    const medName = text(form, `med_name_${i}`, 60);
    const when = text(form, `med_when_${i}`, 60);
    if (medName || when) medicines.push({ name: medName, when });
  }
  return {
    name: text(form, "name", 80),
    nickname: text(form, "nickname", 40),
    nicknameUr: text(form, "nickname_ur", 40),
    gender: form.get("gender") === "male" ? "male" : "female",
    childName: text(form, "child_name", 40),
    childNameUr: text(form, "child_name_ur", 40),
    childPhone: text(form, "child_phone", 30),
    companionGender: form.get("companion_gender") === "male" ? "male" : "female",
    language: (["urdu", "auto", "punjabi"].includes(String(form.get("language"))) ? form.get("language") : "urdu") as ParentFormValues["language"],
    checkinTime: text(form, "checkin_time", 5) || "10:00",
    medicines,
    topics: text(form, "topics", 400).split(",").map((x) => x.trim()).filter(Boolean),
    consentGiven: form.get("consent") === "on",
  };
}

// Reads and checks the parent form. Returns the database row, or an error message.
function parseParentForm(form: FormData): { row: Record<string, unknown> } | { error: string } {
  const name = text(form, "name", 80);
  const nickname = text(form, "nickname", 40);
  const childName = text(form, "child_name", 40);
  if (!name || !nickname || !childName) return { error: "Please fill in the parent's name, what you call them, and your name." };

  const gender = form.get("gender") === "male" ? "male" : "female";
  const companionGender = form.get("companion_gender") === "male" ? "male" : "female";
  const languageValue = String(form.get("language") ?? "urdu");
  const language = ["urdu", "auto", "punjabi"].includes(languageValue) ? languageValue : "urdu";

  const checkinTime = text(form, "checkin_time", 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(checkinTime)) return { error: "Please choose a daily call time." };

  // Phone: keep only + and digits, e.g. "0300-123 4567" -> "03001234567".
  const childPhone = text(form, "child_phone", 30).replace(/[^\d+]/g, "");
  if (childPhone && !/^\+?\d{7,15}$/.test(childPhone)) return { error: "Please check the phone number." };

  const medicines: { name: string; when: string }[] = [];
  for (let i = 0; i < MAX_MEDICINES; i++) {
    const medName = text(form, `med_name_${i}`, 60);
    if (medName) medicines.push({ name: medName, when: text(form, `med_when_${i}`, 60) });
  }

  const topics = text(form, "topics", 400)
    .split(",")
    .map((t) => t.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, MAX_TOPICS);

  if (form.get("consent") !== "on") {
    return { error: "Please confirm that your parent agrees to talk with Khairiyat (an AI)." };
  }

  return {
    row: {
      name,
      nickname,
      nickname_ur: text(form, "nickname_ur", 40),
      gender,
      language,
      child_name: childName,
      child_name_ur: text(form, "child_name_ur", 40),
      child_phone: childPhone,
      companion_gender: companionGender,
      medicines,
      topics,
      checkin_time: checkinTime,
      consent_given: true,
    },
  };
}

export async function createParent(_prev: ParentFormState, form: FormData): Promise<ParentFormState> {
  const user = await requireUser();
  const parsed = parseParentForm(form);
  if ("error" in parsed) return { error: parsed.error, values: echoValues(form) };

  const supabase = db();
  if (!supabase) return { error: "The database is not available." };

  // A simple limit so one account can't fill the database.
  const { count } = await supabase.from("parents").select("id", { count: "exact", head: true }).eq("family_id", user.id);
  if ((count ?? 0) >= 10) return { error: "A family can add up to 10 parents.", values: echoValues(form) };

  const { data, error } = await supabase
    .from("parents")
    .insert({ ...parsed.row, family_id: user.id, talk_token: newTalkToken() })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createParent: database error", error?.code ?? "");
    return { error: "Could not save. Please try again.", values: echoValues(form) };
  }
  revalidatePath("/family");
  redirect(`/family/${data.id}?added=1`);
}

export async function updateParent(parentId: string, _prev: ParentFormState, form: FormData): Promise<ParentFormState> {
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId); // ownership check
  if (!parent) return { error: "Not found." };
  if (parent.isDemo) return { error: "The demo parents can't be changed. Create your own account to add your parents." };

  const parsed = parseParentForm(form);
  if ("error" in parsed) return { error: parsed.error, values: echoValues(form) };

  const supabase = db();
  const { error } = await supabase!.from("parents").update(parsed.row).eq("id", parent.id).eq("family_id", user.id);
  if (error) {
    console.error("updateParent: database error", error.code);
    return { error: "Could not save. Please try again.", values: echoValues(form) };
  }
  revalidatePath(`/family/${parent.id}`);
  redirect(`/family/${parent.id}`);
}

// Makes a new talk link; the old link stops working at once (e.g. if a phone was lost).
export async function renewTalkLink(parentId: string): Promise<void> {
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId);
  if (!parent || parent.isDemo) return;
  const { error } = await db()!
    .from("parents")
    .update({ talk_token: newTalkToken() })
    .eq("id", parent.id)
    .eq("family_id", user.id);
  if (error) console.error("renewTalkLink: database error", error.code);
  revalidatePath(`/family/${parent.id}`);
}

export type CallNowState = { message?: string; ok?: boolean };

// "Call Ammi now": rings the parent's phone right away.
export async function callNow(parentId: string, _prev: CallNowState): Promise<CallNowState> {
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId); // ownership check
  if (!parent) return { message: "Not found." };
  // At most one call a minute per parent, so a phone can't be flooded with calls.
  if (!rateLimit(`callnow:${parent.id}`, 1, 60 * 1000)) return { message: "Please wait a minute before calling again." };
  if ((await deviceCount(parent.id)) === 0) {
    return { message: `${parent.nickname}'s phone isn't set up for calls yet. Open their link and tap "allow calls".` };
  }
  const call = await ringParent(parent, "manual");
  revalidatePath(`/family/${parent.id}`);
  if (!call) return { message: "Could not place the call. Please try again." };
  if (call.status === "failed") return { message: `Couldn't reach ${parent.nickname}'s phone. Open their link again to refresh it.` };
  return { ok: true, message: `Calling ${parent.nickname}… their phone is ringing.` };
}

// Removes a parent together with all their check-ins and alerts (database cascade).
export async function deleteParent(parentId: string): Promise<void> {
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId);
  if (!parent || parent.isDemo) redirect("/family");
  const { error } = await db()!.from("parents").delete().eq("id", parent.id).eq("family_id", user.id);
  if (error) console.error("deleteParent: database error", error.code);
  revalidatePath("/family");
  redirect("/family");
}
