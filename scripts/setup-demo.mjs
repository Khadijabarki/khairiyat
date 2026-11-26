// Sets up the shared demo family that judges open with the "Open the demo" button:
// - a demo account (DEMO_EMAIL / DEMO_PASSWORD from .env.local)
// - two demo parents, Ammi and Abbu, with talk links /talk/demo-ammi and /talk/demo-abbu
// - 7 days of sample check-ins each, clearly marked as samples
//
// Run:  npm run setup:demo            (refreshes the sample data, keeps real test calls)
//       npm run setup:demo -- --clean (also deletes the demo parents' real test calls)
//
// Safe to run again. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local,
// and supabase/schema.sql to have been run first.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const email = process.env.DEMO_EMAIL?.trim() || "demo@khairiyat.app";
const password = process.env.DEMO_PASSWORD?.trim();
const clean = process.argv.includes("--clean");

if (!url || !serviceKey || !password) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or DEMO_PASSWORD in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// Stops the script with a short message (never prints keys).
function check(error, step) {
  if (error) {
    console.error(`${step} failed:`, error.code ?? "", error.message);
    process.exit(1);
  }
}

// 1. The demo account: create it, or reset its password to the one in .env.local.
async function demoUserId() {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    check(error, "Listing users");
    const found = data.users.find((u) => u.email === email);
    if (found) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(found.id, { password, email_confirm: true });
      check(updateError, "Updating the demo account");
      return found.id;
    }
    if (data.users.length < 200) break;
  }
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  check(error, "Creating the demo account");
  return data.user.id;
}

const familyId = await demoUserId();
console.log("Demo account ready:", email);

// 2. The demo parents (fixed ids, so old sample rows and links keep working).
const parents = [
  {
    id: "ammi",
    family_id: familyId,
    name: "Zubaida Begum",
    nickname: "Ammi",
    nickname_ur: "امی",
    gender: "female",
    language: "urdu",
    child_name: "Ali",
    child_name_ur: "علی",
    child_phone: "",
    companion_gender: "female",
    medicines: [
      { name: "BP ki goli", when: "subah nashte ke baad" },
      { name: "Sugar ki goli", when: "raat ko" },
    ],
    topics: ["pote ki baatein", "khana pakana", "purane gaane"],
    checkin_time: "10:00",
    talk_token: "demo-ammi",
    consent_given: true,
    is_demo: true,
  },
  {
    id: "abbu",
    family_id: familyId,
    name: "Muhammad Aslam",
    nickname: "Abbu",
    nickname_ur: "ابو",
    gender: "male",
    language: "urdu",
    child_name: "Sana",
    child_name_ur: "ثنا",
    child_phone: "",
    companion_gender: "male",
    medicines: [
      { name: "Dil ki goli", when: "subah" },
      { name: "Cholesterol ki goli", when: "raat ko khane ke baad" },
    ],
    topics: ["cricket", "khabrein", "subah ki sair", "purane dost"],
    checkin_time: "09:00",
    talk_token: "demo-abbu",
    consent_given: true,
    is_demo: true,
  },
];
const { error: parentError } = await supabase.from("parents").upsert(parents, { onConflict: "id" });
check(parentError, "Saving the demo parents");
console.log("Demo parents ready: /talk/demo-ammi, /talk/demo-abbu");

// 3. Fresh sample check-ins for the last 7 days.
const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
const sample = (parent_id, d, summary, family_message, mood, pain, sleep, medicine_taken, risk_level, alerts = []) => ({
  parent_id, created_at: daysAgo(d), summary, family_message, mood, pain, sleep, medicine_taken, ate: true, risk_level, alerts, is_sample: true,
});
const rows = [
  // Ammi: knee pain that gets better over the week (shows the memory feature)
  sample("ammi", 7, "Ammi ki tabiyat theek thi. Neend achi aayi, BP ki goli li, nashta kiya. Pote ki baatein kar ke khush thin.", "Ammi theek hain, dawai li aur mood acha tha.", 5, 0, 4, true, "normal"),
  sample("ammi", 6, "Ammi ne ghutne mein halke dard ka bataya. Neend theek aayi, dawai li.", "Ammi ke ghutne mein halka dard hai, baqi sab theek.", 4, 3, 4, true, "normal"),
  sample("ammi", 5, "Ghutne ka dard barh gaya, seedhiyan chadhne mein mushkil. Raat ko neend kam aayi. Dawai li.", "Ammi ka ghutne ka dard barh gaya hai, neend kam aayi. Aaj call kar lein.", 3, 6, 2, true, "concern", [{ category: "lonely_sad", reason: "Ammi ne kaha akelapan mehsoos hota hai.", source: "ai" }]),
  sample("ammi", 4, "Ghutne ka dard thora kam hua. Ammi ne bataya ke kisi ne phone par OTP maanga tha, unhein samjhaya ke kabhi na batayein.", "Fraud call ki koshish hui thi, Ammi ne OTP nahi bataya. Dard thora kam hai.", 3, 4, 3, true, "concern", [{ category: "scam_call", reason: "Ammi ko bank ke naam se call aayi aur OTP maanga gaya.", source: "ai" }]),
  sample("ammi", 3, "Ammi ki tabiyat behtar thi. Dard kam, neend achi. Sugar ki goli raat ko li.", "Ammi behtar hain, dard kam hai.", 4, 2, 4, true, "normal"),
  sample("ammi", 2, "Ammi subah ki BP ki goli bhool gayi thin, yaad dilane par le li. Mood acha tha.", "Ammi subah ki dawai bhool gayi thin, yaad dilane par le li.", 4, 1, 4, false, "concern", [{ category: "medicine_missed", reason: "Ammi subah ki BP ki goli bhool gayi thin.", source: "ai" }]),
  sample("ammi", 1, "Ammi bilkul theek thin. Ghutne ka dard na hone ke barabar. Purane gaane suna rahi thin.", "Ammi theek hain aur khush thin.", 5, 1, 5, true, "normal"),
  // Abbu: mostly well, one dizziness day
  sample("abbu", 7, "Abbu ne subah sair ki, dil ki goli li. Cricket match ki baatein ki.", "Abbu theek hain, sair bhi ki.", 5, 0, 4, true, "normal"),
  sample("abbu", 6, "Abbu theek the, neend thori kam aayi. Dawai li.", "Abbu theek hain, neend thori kam aayi.", 4, 0, 3, true, "normal"),
  sample("abbu", 5, "Abbu ko subah halka chakkar aaya tha, paani piya to behtar hue. Dawai li.", "Abbu ko halka chakkar aaya tha, ab behtar hain. Aaj call kar lein.", 3, 2, 3, true, "concern", [{ category: "dizziness", reason: "Abbu ko subah halka chakkar aaya.", source: "ai" }]),
  sample("abbu", 4, "Abbu ki tabiyat behtar thi. Purane dost se mile.", "Abbu theek hain, dost se mile.", 5, 0, 4, true, "normal"),
  sample("abbu", 3, "Abbu raat ki cholesterol ki goli bhool gaye the. Baqi sab theek.", "Abbu raat ki goli bhool gaye the.", 4, 0, 4, false, "concern", [{ category: "medicine_missed", reason: "Abbu raat ki cholesterol ki goli bhool gaye.", source: "ai" }]),
  sample("abbu", 2, "Abbu theek the, khabron ki baatein ki. Neend achi aayi.", "Abbu theek hain.", 4, 0, 5, true, "normal"),
  sample("abbu", 1, "Abbu ne sair ki aur khush the. Dawai li.", "Abbu theek aur khush hain.", 5, 0, 4, true, "normal"),
];

const ids = parents.map((p) => p.id);
const { error: deleteError } = await supabase.from("checkins").delete().in("parent_id", ids).eq("is_sample", true);
check(deleteError, "Removing old sample check-ins");
if (clean) {
  const { error: cleanError } = await supabase.from("checkins").delete().in("parent_id", ids).eq("is_sample", false);
  check(cleanError, "Removing test calls");
  const { error: alertError } = await supabase.from("live_alerts").delete().in("parent_id", ids);
  check(alertError, "Removing test alerts");
  console.log("Removed the demo parents' test calls and alerts.");
}
const { error: insertError } = await supabase.from("checkins").insert(rows);
check(insertError, "Adding sample check-ins");
console.log(`Added ${rows.length} sample check-ins. Done.`);
