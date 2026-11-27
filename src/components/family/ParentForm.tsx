"use client";

import { useActionState } from "react";
import type { ParentFormState } from "@/app/family/actions";
import { useLang } from "../i18n/LangProvider";

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
  medicines: { name: string; when: string; time?: string }[];
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
  const { t } = useLang();
  // After an error, show what was typed (the server sends it back), not the starting values.
  const values = state.values ?? initialValues;
  // A new key re-creates the inputs so their default values update after each submit.
  const formKey = JSON.stringify(state.values ?? null);
  const medicineRows = Array.from({ length: Math.max(MEDICINE_ROWS, values.medicines.length) }, (_, i) => values.medicines[i]);

  return (
    <form key={formKey} action={formAction} className="space-y-6">
      <fieldset className="rounded-2xl border border-stone-200 bg-white p-5">
        <legend className="px-1 font-semibold text-stone-900">{t("Your parent", "آپ کے والدین")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={label}>{t("Full name", "پورا نام")}</label>
            <input id="name" name="name" required maxLength={80} defaultValue={values.name} placeholder="Zubaida Begum" className={input} />
          </div>
          <div>
            <label htmlFor="gender" className={label}>{t("Mother or father", "والدہ یا والد")}</label>
            <select id="gender" name="gender" defaultValue={values.gender} className={input}>
              <option value="female">{t("Mother", "والدہ")}</option>
              <option value="male">{t("Father", "والد")}</option>
            </select>
            <p className={hint}>{t("Khairiyat uses the right Urdu grammar for them.", "خیریت ان کے لیے درست اردو گرامر استعمال کرتی ہے۔")}</p>
          </div>
          <div>
            <label htmlFor="nickname" className={label}>{t("What you call them", "آپ انہیں کیا کہتے ہیں")}</label>
            <input id="nickname" name="nickname" required maxLength={40} defaultValue={values.nickname} placeholder="Ammi" className={input} />
          </div>
          <div>
            <label htmlFor="nickname_ur" className={label}>{t("Same in Urdu (optional)", "اردو میں (اختیاری)")}</label>
            <input id="nickname_ur" name="nickname_ur" dir="rtl" maxLength={40} defaultValue={values.nicknameUr} placeholder="امی" className={`${input} font-urdu`} />
            <p className={hint}>{t("Shown on their screen.", "ان کی اسکرین پر دکھایا جائے گا۔")}</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-stone-200 bg-white p-5">
        <legend className="px-1 font-semibold text-stone-900">{t("Daily call", "روز کی کال")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="checkin_time" className={label}>{t("Call time every day (Pakistan time)", "روز کال کا وقت (پاکستان)")}</label>
            <input id="checkin_time" name="checkin_time" type="time" required defaultValue={values.checkinTime} className={input} />
          </div>
          <div>
            <label htmlFor="companion_gender" className={label}>{t("Khairiyat speaks like", "خیریت کس کی طرح بولے")}</label>
            <select id="companion_gender" name="companion_gender" defaultValue={values.companionGender} className={input}>
              <option value="female">{t("A daughter (female voice)", "بیٹی کی طرح (خاتون کی آواز)")}</option>
              <option value="male">{t("A son (male voice)", "بیٹے کی طرح (مرد کی آواز)")}</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="language" className={label}>{t("Language", "گفتگو کی زبان")}</label>
            <select id="language" name="language" defaultValue={values.language} className={input}>
              <option value="urdu">{t("Urdu (understands Punjabi too) — recommended", "اردو (پنجابی بھی سمجھتی ہے) — بہتر")}</option>
              <option value="auto">{t("Reply in the language they speak (Urdu or Punjabi)", "جس زبان میں بولیں اسی میں جواب (اردو یا پنجابی)")}</option>
              <option value="punjabi">{t("Always Punjabi (experimental)", "ہمیشہ پنجابی (آزمائشی)")}</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-2xl border border-stone-200 bg-white p-5">
        <legend className="px-1 font-semibold text-stone-900">{t("Medicines", "دوائیاں")}</legend>
        <p className={hint}>{t("Add a time next to a medicine and Khairiyat also calls then to ask about it (times less than an hour apart become one call). It never suggests new medicines.", "دوائی کے ساتھ وقت لکھیں تو خیریت اس وقت بھی کال کر کے اس کا پوچھے گی (ایک گھنٹے سے کم فرق والے وقت ایک ہی کال بنتے ہیں)۔ نئی دوائی کبھی تجویز نہیں کرتی۔")}</p>
        <div className="mt-3 space-y-2">
          {medicineRows.map((med, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_9rem]">
              <input name={`med_name_${i}`} maxLength={60} defaultValue={med?.name ?? ""} placeholder={i === 0 ? "BP ki goli" : t("Medicine", "دوائی")} aria-label={`${t("Medicine", "دوائی")} ${i + 1}`} className={input} />
              <input name={`med_when_${i}`} maxLength={60} defaultValue={med?.when ?? ""} placeholder={i === 0 ? "subah nashte ke baad" : t("When", "کب")} aria-label={`${t("When to take medicine", "دوائی کا وقت")} ${i + 1}`} className={input} />
              <input name={`med_time_${i}`} type="time" defaultValue={med?.time ?? ""} aria-label={`${t("Call time for medicine", "دوائی کی کال کا وقت")} ${i + 1}`} title={t("Call time", "کال کا وقت")} className={`${input} col-span-2 sm:col-span-1`} />
            </div>
          ))}
        </div>
        <label htmlFor="topics" className={`${label} mt-4`}>{t("Things they enjoy talking about (comma separated)", "پسندیدہ موضوعات (کاما لگا کر لکھیں)")}</label>
        <input id="topics" name="topics" maxLength={400} defaultValue={values.topics.join(", ")} placeholder="pote ki baatein, cricket, purane gaane" className={input} />
      </fieldset>

      <fieldset className="rounded-2xl border border-stone-200 bg-white p-5">
        <legend className="px-1 font-semibold text-stone-900">{t("You", "آپ")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="child_name" className={label}>{t("Your name", "آپ کا نام")}</label>
            <input id="child_name" name="child_name" required maxLength={40} defaultValue={values.childName} placeholder="Ali" className={input} />
          </div>
          <div>
            <label htmlFor="child_name_ur" className={label}>{t("Your name in Urdu (optional)", "آپ کا نام اردو میں (اختیاری)")}</label>
            <input id="child_name_ur" name="child_name_ur" dir="rtl" maxLength={40} defaultValue={values.childNameUr} placeholder="علی" className={`${input} font-urdu`} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="child_phone" className={label}>{t("Your phone (optional)", "آپ کا فون (اختیاری)")}</label>
            <input id="child_phone" name="child_phone" type="tel" inputMode="tel" maxLength={30} defaultValue={values.childPhone} placeholder="+92 300 1234567" className={input} />
            <p className={hint}>{t("Shown as a \"call your son/daughter\" button on their screen in an emergency.", "ایمرجنسی میں ان کی اسکرین پر آپ کو کال کرنے کا بٹن بنے گا۔")}</p>
          </div>
        </div>
      </fieldset>

      <label className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-stone-800">
        <input type="checkbox" name="consent" defaultChecked={values.consentGiven} className="mt-1 size-4 accent-emerald-700" />
        <span>
          {t("My parent knows that Khairiyat is an AI, agrees to talk with it, and agrees that a short summary of each call is shared with the family. (Full conversations are never stored.)", "میرے والدین جانتے ہیں کہ خیریت ایک AI ہے، اس سے بات کرنے پر راضی ہیں، اور اس پر بھی کہ ہر بات کا مختصر خلاصہ گھر والوں کو دیا جائے۔ (پوری گفتگو کبھی محفوظ نہیں ہوتی۔)")}
        </span>
      </label>

      {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="rounded-xl bg-emerald-700 px-5 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
        {pending ? t("Saving…", "محفوظ ہو رہا ہے…") : submitLabel}
      </button>
    </form>
  );
}
