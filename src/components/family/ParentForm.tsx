"use client";

import { useActionState } from "react";
import type { ParentFormState } from "@/app/family/actions";

// Plain values the form starts with (a new parent, or the one being edited).
export type ParentFormValues = {
  name: string;
  nickname: string;
  nicknameUr: string;
  gender: "female" | "male";
  childName: string;
  childNameUr: string;
  childPhone: string;
  companionGender: "female" | "male";
  language: "urdu" | "auto" | "punjabi";
  checkinTime: string;
  medicines: { name: string; when: string }[];
  topics: string[];
  consentGiven: boolean;
};

export const EMPTY_PARENT: ParentFormValues = {
  name: "",
  nickname: "",
  nicknameUr: "",
  gender: "female",
  childName: "",
  childNameUr: "",
  childPhone: "",
  companionGender: "female",
  language: "urdu",
  checkinTime: "10:00",
  medicines: [],
  topics: [],
  consentGiven: false,
};

const MEDICINE_ROWS = 5;
const input =
  "mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200";
const label = "block text-sm font-medium text-stone-700";
const hint = "mt-1 text-xs text-stone-500";

type Props = {
  action: (state: ParentFormState, form: FormData) => Promise<ParentFormState>;
  values: ParentFormValues;
  submitLabel: string;
};

export default function ParentForm({ action, values: initialValues, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  // After an error, show what was typed (the server sends it back), not the starting values.
  const values = state.values ?? initialValues;
  // A new key re-creates the inputs so their default values update after each submit.
  const formKey = JSON.stringify(state.values ?? null);
  const medicineRows = Array.from({ length: Math.max(MEDICINE_ROWS, values.medicines.length) }, (_, i) => values.medicines[i]);

  return (
    <form key={formKey} action={formAction} className="space-y-6">
      <fieldset className="rounded-2xl border border-stone-200 bg-white p-5">
        <legend className="px-1 font-semibold text-stone-900">Your parent</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={label}>Full name</label>
            <input id="name" name="name" required maxLength={80} defaultValue={values.name} placeholder="Zubaida Begum" className={input} />
          </div>
          <div>
            <label htmlFor="gender" className={label}>Mother or father</label>
            <select id="gender" name="gender" defaultValue={values.gender} className={input}>
              <option value="female">Mother</option>
              <option value="male">Father</option>
            </select>
            <p className={hint}>Khairiyat uses the right Urdu grammar for them.</p>
          </div>
          <div>
            <label htmlFor="nickname" className={label}>What you call them</label>
            <input id="nickname" name="nickname" required maxLength={40} defaultValue={values.nickname} placeholder="Ammi" className={input} />
          </div>
          <div>
            <label htmlFor="nickname_ur" className={label}>Same in Urdu (optional)</label>
            <input id="nickname_ur" name="nickname_ur" dir="rtl" maxLength={40} defaultValue={values.nicknameUr} placeholder="امی" className={`${input} font-urdu`} />
            <p className={hint}>Shown on their screen.</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-stone-200 bg-white p-5">
        <legend className="px-1 font-semibold text-stone-900">Daily call</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="checkin_time" className={label}>Call time every day (Pakistan time)</label>
            <input id="checkin_time" name="checkin_time" type="time" required defaultValue={values.checkinTime} className={input} />
          </div>
          <div>
            <label htmlFor="companion_gender" className={label}>Khairiyat speaks like</label>
            <select id="companion_gender" name="companion_gender" defaultValue={values.companionGender} className={input}>
              <option value="female">A daughter (female voice)</option>
              <option value="male">A son (male voice)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="language" className={label}>Language</label>
            <select id="language" name="language" defaultValue={values.language} className={input}>
              <option value="urdu">Urdu (understands Punjabi too) — recommended</option>
              <option value="auto">Reply in the language they speak (Urdu or Punjabi)</option>
              <option value="punjabi">Always Punjabi (experimental)</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-stone-200 bg-white p-5">
        <legend className="px-1 font-semibold text-stone-900">Medicines</legend>
        <p className={hint}>Khairiyat gently reminds them at the right time. It never suggests new medicines.</p>
        <div className="mt-3 space-y-2">
          {medicineRows.map((med, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input name={`med_name_${i}`} maxLength={60} defaultValue={med?.name ?? ""} placeholder={i === 0 ? "BP ki goli" : "Medicine"} aria-label={`Medicine ${i + 1}`} className={input} />
              <input name={`med_when_${i}`} maxLength={60} defaultValue={med?.when ?? ""} placeholder={i === 0 ? "subah nashte ke baad" : "When"} aria-label={`When to take medicine ${i + 1}`} className={input} />
            </div>
          ))}
        </div>
        <label htmlFor="topics" className={`${label} mt-4`}>Things they enjoy talking about (comma separated)</label>
        <input id="topics" name="topics" maxLength={400} defaultValue={values.topics.join(", ")} placeholder="pote ki baatein, cricket, purane gaane" className={input} />
      </fieldset>

      <fieldset className="rounded-2xl border border-stone-200 bg-white p-5">
        <legend className="px-1 font-semibold text-stone-900">You</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="child_name" className={label}>Your name</label>
            <input id="child_name" name="child_name" required maxLength={40} defaultValue={values.childName} placeholder="Ali" className={input} />
          </div>
          <div>
            <label htmlFor="child_name_ur" className={label}>Your name in Urdu (optional)</label>
            <input id="child_name_ur" name="child_name_ur" dir="rtl" maxLength={40} defaultValue={values.childNameUr} placeholder="علی" className={`${input} font-urdu`} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="child_phone" className={label}>Your phone (optional)</label>
            <input id="child_phone" name="child_phone" type="tel" inputMode="tel" maxLength={30} defaultValue={values.childPhone} placeholder="+92 300 1234567" className={input} />
            <p className={hint}>Shown as a &quot;call your son/daughter&quot; button on their screen in an emergency.</p>
          </div>
        </div>
      </fieldset>

      <label className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-stone-800">
        <input type="checkbox" name="consent" defaultChecked={values.consentGiven} className="mt-1 size-4 accent-emerald-700" />
        <span>
          My parent knows that Khairiyat is an AI, agrees to talk with it, and agrees that a short summary of each
          call is shared with the family. (Full conversations are never stored.)
        </span>
      </label>

      {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-xl bg-emerald-700 px-5 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
