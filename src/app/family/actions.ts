"use server";
// Adding, editing and removing parents, and renewing a parent's talk link.
// Every action first checks who is signed in, and only ever touches that family's parents.

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { demoEmail, requireUser } from "@/lib/auth";
import { removeFamilyDevices, saveFamilyDevice } from "@/lib/family-devices";
import { readSubscription } from "@/lib/push-endpoint";
import { FAMILY_DEVICE_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/session-cookie";
import { cookies } from "next/headers";
import { deviceCount, ringParent } from "@/lib/calls";
import { getFamilyParent } from "@/lib/data";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import { deleteParentMessage, markParentMessageHeard } from "@/lib/parent-messages";
import { deleteVoice, saveVoice } from "@/lib/voice";
import { MAX_VOICE_BYTES, looksLikeAudio, voiceSeconds, voiceType } from "@/lib/voice-rules";

import type { ParentFormValues } from "@/components/family/ParentForm";
import { say } from "@/lib/server-messages";
import { deletePhoto, savePhoto } from "@/lib/photos";
import { MAX_PHOTO_BYTES, looksLikeJpeg } from "@/lib/photo-rules";
import { isClockTime } from "@/lib/time";
import { getLang } from "@/lib/i18n-server";

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
  const medicines: { name: string; when: string; time?: string }[] = [];
  for (let i = 0; i < MAX_MEDICINES; i++) {
    const medName = text(form, `med_name_${i}`, 60);
    const when = text(form, `med_when_${i}`, 60);
    const time = text(form, `med_time_${i}`, 5);
    if (medName || when || time) medicines.push({ name: medName, when, time });
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

  const medicines: { name: string; when: string; time?: string }[] = [];
  for (let i = 0; i < MAX_MEDICINES; i++) {
    const medName = text(form, `med_name_${i}`, 60);
    const time = text(form, `med_time_${i}`, 5);
    if (medName) medicines.push({ name: medName, when: text(form, `med_when_${i}`, 60), ...(isClockTime(time) ? { time } : {}) });
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
  if ("error" in parsed) return { error: await say(parsed.error), values: echoValues(form) };

  const supabase = db();
  if (!supabase) return { error: await say("The database is not available.") };

  // A simple limit so one account can't fill the database.
  const { count } = await supabase.from("parents").select("id", { count: "exact", head: true }).eq("family_id", user.id);
  if ((count ?? 0) >= 10) return { error: await say("A family can add up to 10 parents."), values: echoValues(form) };

  const { data, error } = await supabase
    .from("parents")
    .insert({ ...parsed.row, family_id: user.id, talk_token: newTalkToken() })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createParent: database error", error?.code ?? "");
    return { error: await say("Could not save. Please try again."), values: echoValues(form) };
  }
  revalidatePath("/family");
  redirect(`/family/${data.id}?added=1`);
}

export async function updateParent(parentId: string, _prev: ParentFormState, form: FormData): Promise<ParentFormState> {
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId); // ownership check
  if (!parent) return { error: await say("Not found.") };
  if (parent.isDemo) return { error: await say("The demo parents can't be changed. Create your own account to add your parents.") };

  const parsed = parseParentForm(form);
  if ("error" in parsed) return { error: await say(parsed.error), values: echoValues(form) };

  const supabase = db();
  const { error } = await supabase!.from("parents").update(parsed.row).eq("id", parent.id).eq("family_id", user.id);
  if (error) {
    console.error("updateParent: database error", error.code);
    return { error: await say("Could not save. Please try again."), values: echoValues(form) };
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

// "Send alerts to this phone": saves this browser's push subscription for the signed-in family.
// A cookie remembers which saved device this browser is, so signing out can remove it.
export async function enableFamilyAlerts(subscription: unknown): Promise<{ ok: boolean }> {
  const user = await requireUser();
  // The shared demo account never receives alerts: strangers would get each other's news.
  if (user.email === demoEmail()) return { ok: false };
  if (!rateLimit(`familyalerts:${user.id}`, 20, 10 * 60 * 1000)) return { ok: false };
  const sub = readSubscription(subscription);
  if (!sub) return { ok: false };
  const id = await saveFamilyDevice(user.id, sub);
  if (!id) return { ok: false };
  (await cookies()).set(FAMILY_DEVICE_COOKIE, id, { ...SESSION_COOKIE_OPTIONS, maxAge: 365 * 24 * 60 * 60 });
  return { ok: true };
}

export async function disableFamilyAlerts(): Promise<void> {
  const user = await requireUser();
  const store = await cookies();
  const id = store.get(FAMILY_DEVICE_COOKIE)?.value;
  if (id && /^[0-9a-f-]{36}$/.test(id)) await removeFamilyDevices(user.id, [id]);
  store.delete(FAMILY_DEVICE_COOKIE);
}

export type CallNowState = { message?: string; ok?: boolean };

// "Call Ammi now": rings the parent's phone right away.
export async function callNow(parentId: string, _prev: CallNowState): Promise<CallNowState> {
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId); // ownership check
  if (!parent) return { message: await say("Not found.") };
  // At most one call a minute per parent, so a phone can't be flooded with calls.
  if (!rateLimit(`callnow:${parent.id}`, 1, 60 * 1000)) return { message: await say("Please wait a minute before calling again.") };
  if ((await deviceCount(parent.id)) === 0) {
    return {
      message:
        (await getLang()) === "ur"
          ? `${parent.nicknameUr} کا فون ابھی کال کے لیے تیار نہیں۔ ان کا لنک کھول کر کال کی اجازت دیں۔`
          : `${parent.nickname}'s phone isn't set up for calls yet. Open their link and tap "allow calls".`,
    };
  }
  const call = await ringParent(parent, "manual");
  revalidatePath(`/family/${parent.id}`);
  if (!call) return { message: await say("Could not place the call. Please try again.") };
  const ur = (await getLang()) === "ur";
  if (call.status === "failed") {
    return {
      message: ur
        ? `${parent.nicknameUr} کے فون تک کال نہیں پہنچی۔ ان کا لنک دوبارہ کھولیں۔`
        : `Couldn't reach ${parent.nickname}'s phone. Open their link again to refresh it.`,
    };
  }
  return { ok: true, message: ur ? `${parent.nicknameUr} کو کال جا رہی ہے…` : `Calling ${parent.nickname}… their phone is ringing.` };
}

// A voice message from the family, played to the parent at the start of their next conversation.
export async function sendVoiceMessage(parentId: string, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId); // ownership check
  if (!parent) return { ok: false, error: await say("Not found.") };
  // The demo is shared by everyone: strangers must not leave recordings for each other.
  if (parent.isDemo) return { ok: false, error: await say("Voice messages are switched off in the shared demo.") };
  if (!rateLimit(`voicemessage:${user.id}`, 10, 10 * 60 * 1000)) {
    return { ok: false, error: await say("Please wait a few minutes before sending another message.") };
  }

  const file = form.get("audio");
  const seconds = voiceSeconds(form.get("seconds"));
  if (!(file instanceof File) || !seconds || file.size === 0 || file.size > MAX_VOICE_BYTES) {
    return { ok: false, error: await say("The recording is empty or too long. Please record again.") };
  }
  const type = voiceType(file.type);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!type || !looksLikeAudio(bytes, type)) return { ok: false, error: await say("This browser's recording format isn't supported.") };

  if (!(await saveVoice(parent.id, type, bytes, seconds))) return { ok: false, error: await say("Could not save. Please try again.") };
  revalidatePath(`/family/${parent.id}`);
  return { ok: true };
}

export async function removeVoiceMessage(parentId: string): Promise<void> {
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId);
  if (!parent || parent.isDemo) return;
  await deleteVoice(parent.id);
  revalidatePath(`/family/${parent.id}`);
}

// The family pressed play on a voice message from their parent.
export async function heardParentMessage(parentId: string, messageId: string): Promise<void> {
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId); // ownership check
  if (!parent || !/^[0-9a-f-]{36}$/.test(messageId)) return;
  await markParentMessageHeard(parent.id, messageId);
  revalidatePath(`/family/${parent.id}`);
}

export async function removeParentMessage(parentId: string, messageId: string): Promise<void> {
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId);
  if (!parent || parent.isDemo || !/^[0-9a-f-]{36}$/.test(messageId)) return;
  await deleteParentMessage(parent.id, messageId);
  revalidatePath(`/family/${parent.id}`);
}

// A photo for a family member's card (resized in the browser before it is sent).
export async function uploadPhoto(parentId: string, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId); // ownership check
  if (!parent) return { ok: false, error: await say("Not found.") };
  if (parent.isDemo) return { ok: false, error: await say("Photos can't be changed in the shared demo.") };
  if (!rateLimit(`photo:${user.id}`, 20, 10 * 60 * 1000)) return { ok: false, error: await say("Too many attempts. Please wait a few minutes.") };
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: await say("Please choose a smaller picture.") };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLikeJpeg(bytes)) return { ok: false, error: await say("Please choose a picture file.") };
  if (!(await savePhoto(parent.id, bytes))) return { ok: false, error: await say("Could not save. Please try again.") };
  revalidatePath("/family", "layout");
  return { ok: true };
}

export async function removePhoto(parentId: string): Promise<void> {
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId);
  if (!parent || parent.isDemo) return;
  await deletePhoto(parent.id);
  revalidatePath("/family", "layout");
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
