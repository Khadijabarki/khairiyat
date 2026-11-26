// Data about the parents and their past check-ins.
// Parents are fixed demo parents for the prototype (in production the family adds
// them on the dashboard). Past check-ins come from the database and give
// Khairiyat its memory of previous days.
import "server-only";
import { db } from "./db";

export type Gender = "female" | "male";

// Which language Khairiyat speaks:
// "auto" = reply in whatever the parent speaks (Urdu or Punjabi), "urdu" or "punjabi" = always that one.
export type Language = "auto" | "urdu" | "punjabi";

export type Parent = {
  id: string; // used in the link, e.g. /talk/ammi
  name: string; // full name, e.g. "Zubaida Begum"
  gender: Gender; // decides Urdu grammar: "aap leti hain" vs "aap lete hain"
  nickname: string; // what the family calls them, e.g. "Ammi" or "Abbu"
  childName: string; // the son or daughter who gets the summaries, e.g. "Ali"
  // The same names in Urdu script, for the talk screen. Mixing English letters
  // into right-to-left Urdu text makes the browser put punctuation in the wrong place.
  nicknameUr: string; // e.g. "امی"
  childNameUr: string; // e.g. "علی"
  // Phone number for the "call your son/daughter" emergency button (empty = button hidden).
  childPhone: string;
  language: Language;
  medicines: string[];
  topics: string[]; // things they enjoy talking about
  // How Khairiyat talks to this parent: as a daughter (female voice) or a son (male voice).
  companion: { gender: Gender; voice: string };
};

export type PastCheckin = {
  date: string; // e.g. "2026-11-23"
  summary: string; // short summary of that day's conversation
};

// Gemini voices. Female voices sound like a daughter, male voices like a son.
// Change these to try other voices from AI Studio's voice list.
export const VOICES = {
  female: process.env.GEMINI_VOICE_FEMALE || "Sulafat", // warm
  male: process.env.GEMINI_VOICE_MALE || "Achird", // friendly
};

const DEMO_PARENTS: Parent[] = [
  {
    id: "ammi",
    name: "Zubaida Begum",
    gender: "female",
    nickname: "Ammi",
    childName: "Ali",
    nicknameUr: "امی",
    childNameUr: "علی",
    // For the demo, put your own number in .env.local (DEMO_CHILD_PHONE=+923001234567).
    childPhone: process.env.DEMO_CHILD_PHONE ?? "",
    language: "urdu",
    medicines: ["BP ki goli (subah nashte ke baad)", "Sugar ki goli (raat ko)"],
    topics: ["apne pote ki baatein", "khana pakana", "purane gaane"],
    companion: { gender: "female", voice: VOICES.female },
  },
  {
    id: "abbu",
    name: "Muhammad Aslam",
    gender: "male",
    nickname: "Abbu",
    childName: "Sana",
    nicknameUr: "ابو",
    childNameUr: "ثنا",
    childPhone: process.env.DEMO_CHILD_PHONE ?? "",
    language: "urdu",
    medicines: ["Dil ki goli (subah)", "Cholesterol ki goli (raat ko khane ke baad)"],
    topics: ["cricket", "khabrein", "subah ki sair", "purane dost"],
    companion: { gender: "male", voice: VOICES.male },
  },
];

export async function getParents(): Promise<Parent[]> {
  return DEMO_PARENTS;
}

export async function getParent(id: string): Promise<Parent | null> {
  return DEMO_PARENTS.find((p) => p.id === id) ?? null;
}

// The last few check-in summaries, oldest first, for Khairiyat's memory.
// If the database isn't set up or fails, Khairiyat simply talks without memory.
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
