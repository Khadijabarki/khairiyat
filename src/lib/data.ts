// Parents and their past check-ins, read from the database.
//
// Two ways to reach a parent, and both are checked here:
// - a family member: only parents whose family_id is their own account
// - the parent's own phone: only through the secret talk link (talk_token)
// Past check-ins give Khairiyat its memory of previous days.
import "server-only";
import { ringMinutesFrom, type RingMinutes } from "./call-rules";
import { db } from "./db";
import { readMedicines, type Medicine } from "./medicines";
import { capitalName, urduName } from "./urdu-names";

export type Gender = "female" | "male";

// Which language Khairiyat speaks:
// "urdu" = understands Punjabi but always replies in Urdu (recommended; the model's spoken
// Punjabi currently sounds Indian), "auto" = replies in the parent's language, "punjabi" = always Punjabi.
export type Language = "urdu" | "auto" | "punjabi";

export type { Medicine };

export type Parent = {
  id: string;
  familyId: string;
  name: string; // full name, e.g. "Zubaida Begum"
  gender: Gender; // decides Urdu grammar: "aap leti hain" vs "aap lete hain"
  nickname: string; // what the family calls them, e.g. "Ammi", "Abbu" or "Phuppo"
  relation: string; // how they are related (see relations.ts); empty for older entries
  nicknameUr: string; // the same in Urdu script, for the talk screen, e.g. "امی"
  childName: string; // the son/daughter who gets the summaries, e.g. "Ali"
  childNameUr: string; // e.g. "علی"
  childPhone: string; // for the "call your son/daughter" emergency button (empty = hidden)
  language: Language;
  medicines: Medicine[];
  topics: string[]; // things they enjoy talking about
  companion: { gender: Gender; voice: string }; // Khairiyat talks as a daughter or a son
  checkinTime: string; // daily call time, "HH:MM" in Pakistan time
  ringMinutes: RingMinutes; // how long a call rings on their phone
  talkToken: string; // secret part of the parent's talk link
  consentGiven: boolean;
  isDemo: boolean;
};

export type PastCheckin = {
  date: string; // e.g. "Wednesday, 25 November"
  summary: string;
};

// Gemini voices that were tested with Urdu: a daughter's (female) and a son's (male) voice.
export const VOICES: Record<Gender, string> = {
  female: process.env.GEMINI_VOICE_FEMALE?.trim() || "Sulafat",
  male: process.env.GEMINI_VOICE_MALE?.trim() || "Achird",
};

// Database row -> Parent. Unexpected values fall back to safe defaults.
type ParentRow = {
  id: string;
  family_id: string;
  name: string;
  nickname: string;
  nickname_ur: string;
  relation?: string | null; // missing until supabase/schema.sql has added the column
  gender: string;
  language: string;
  child_name: string;
  child_name_ur: string;
  child_phone: string;
  companion_gender: string;
  medicines: unknown;
  topics: string[] | null;
  checkin_time: string;
  ring_minutes?: number | null; // missing until supabase/schema.sql has added the column
  talk_token: string;
  consent_given: boolean;
  is_demo: boolean;
};

function toParent(row: ParentRow): Parent {
  const companionGender: Gender = row.companion_gender === "male" ? "male" : "female";
  const medicines = readMedicines(row.medicines);
  return {
    id: row.id,
    familyId: row.family_id,
    name: capitalName(row.name),
    gender: row.gender === "male" ? "male" : "female",
    nickname: capitalName(row.nickname),
    relation: row.relation ?? "",
    nicknameUr: urduName(row.nickname_ur, row.nickname),
    childName: capitalName(row.child_name),
    childNameUr: urduName(row.child_name_ur, row.child_name),
    childPhone: row.child_phone,
    language: row.language === "auto" || row.language === "punjabi" ? row.language : "urdu",
    medicines,
    topics: row.topics ?? [],
    companion: { gender: companionGender, voice: VOICES[companionGender] },
    checkinTime: row.checkin_time.slice(0, 5),
    ringMinutes: ringMinutesFrom(row.ring_minutes),
    talkToken: row.talk_token,
    consentGiven: row.consent_given,
    isDemo: row.is_demo,
  };
}

// All parents of one family account, oldest first.
export async function getFamilyParents(familyId: string): Promise<Parent[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("parents")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });
  if (error) console.error("getFamilyParents: database error", error.code);
  return ((data as ParentRow[]) ?? []).map(toParent);
}

// One parent, ONLY if it belongs to this family account (otherwise null).
export async function getFamilyParent(familyId: string, parentId: string): Promise<Parent | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("parents")
    .select("*")
    .eq("id", parentId)
    .eq("family_id", familyId)
    .maybeSingle();
  if (error) console.error("getFamilyParent: database error", error.code);
  return data ? toParent(data as ParentRow) : null;
}

// The parent whose secret talk link this is (used by the talk screen and its APIs).
export async function getParentByTalkToken(token: string): Promise<Parent | null> {
  const supabase = db();
  if (!supabase || !/^[A-Za-z0-9_-]{8,64}$/.test(token)) return null;
  // Try up to 3 times: a brief connection problem must not look like a wrong link.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data, error } = await supabase.from("parents").select("*").eq("talk_token", token).maybeSingle();
    if (!error) return data ? toParent(data as ParentRow) : null;
    console.error("getParentByTalkToken: database error", error.code || "network", "attempt", attempt);
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  return null;
}

// A parent by id, for server-only jobs (the call scheduler). Never call this with an id
// that came from a browser: family pages use getFamilyParent, which checks ownership.
export async function getParentById(parentId: string): Promise<Parent | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase.from("parents").select("*").eq("id", parentId).maybeSingle();
  if (error) console.error("getParentById: database error", error.code);
  return data ? toParent(data as ParentRow) : null;
}

// The last few check-in summaries, oldest first, for Khairiyat's memory.
// If the database fails, Khairiyat simply talks without memory.
export async function getRecentCheckins(parentId: string, limit = 5): Promise<PastCheckin[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("checkins")
    .select("created_at, summary")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) {
    console.error("getRecentCheckins: database error", error?.code ?? "");
    return [];
  }
  return data.reverse().map((row) => ({
    date: new Date(row.created_at).toLocaleDateString("en-PK", {
      timeZone: "Asia/Karachi",
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    summary: row.summary,
  }));
}
