"use client";

import { useActionState, useState } from "react";
import type { ParentFormState } from "@/app/family/actions";
import { useLang } from "../i18n/LangProvider";
import { MAX_RELATION, OTHER_RELATION, RELATIONS, findRelation } from "@/lib/relations";
import { knownUrdu } from "@/lib/urdu-names";

// Plain values the form starts with (a new parent, or the one being edited).
export type ParentFormValues = {
  name: string;
  nickname: string;
  relation: string;
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
  relation: "",
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
const input = "ui-input";
const label = "block text-sm font-medium text-stone-700";
const hint = "mt-1 text-xs text-stone-500";

type Props = {
  action: (state: ParentFormState, form: FormData) => Promise<ParentFormState>;
  values: ParentFormValues;
  submitLabel: string;
  defaultChildName?: string; // the signed-in person's name, for a new family member
};

export default function ParentForm({ action, values: initialValues, submitLabel, defaultChildName = "" }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const { lang, t } = useLang();
  const startRelation = state.values?.relation ?? initialValues.relation;
  // "Other" shows a box to write the relationship.
  const [relationChoice, setRelationChoice] = useState(() =>
    !startRelation ? "" : findRelation(startRelation) ? startRelation : OTHER_RELATION,
  );

  // While typing an English name, write the Urdu one too if we know it. Anything the family
  // typed in Urdu themselves is left alone; other names are filled in when saved.
  function fillUrdu(input: HTMLInputElement, urduField: string) {
    const target = input.form?.elements.namedItem(urduField) as HTMLInputElement | null;
    if (!target) return;
    if (target.value && target.value !== target.dataset.auto) return;
    const urdu = knownUrdu(input.value) ?? "";
    target.value = urdu;
    target.dataset.auto = urdu;
  }

  // Picking a relationship fills in the gender and a suggested way to address them.
  function chooseRelation(select: HTMLSelectElement) {
    setRelationChoice(select.value);
    const relation = findRelation(select.value);
    if (!relation || !select.form) return;
    const field = (name: string) => select.form!.elements.namedItem(name) as HTMLInputElement;
    field("gender").value = relation.gender;
    const suggested = (value: string, key: "call" | "callUr") => !value || RELATIONS.some((x) => x[key] === value);
    if (relation.call && suggested(field("nickname").value, "call")) field("nickname").value = relation.call;
    if (relation.callUr && suggested(field("nickname_ur").value, "callUr")) {
      field("nickname_ur").value = relation.callUr;
      field("nickname_ur").dataset.auto = relation.callUr;
    }
  }
  // After an error, show what was typed (the server sends it back), not the starting values.
  const values = state.values ?? { ...initialValues, childName: initialValues.childName || defaultChildName };
  // A new key re-creates the inputs so their default values update after each submit.
  const formKey = JSON.stringify(state.values ?? null);
  const medicineRows = Array.from({ length: Math.max(MEDICINE_ROWS, values.medicines.length) }, (_, i) => values.medicines[i]);

  return (
    <form key={formKey} action={formAction} className="space-y-6">
      <fieldset className="ui-card p-5">
        <legend className="rounded-full bg-sage-soft px-3 py-0.5 font-display font-semibold text-emerald-900">{t("Family Member", "آپ کے والدین")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={label}>{t("Full name", "پورا نام")}</label>
            <input id="name" name="name" required maxLength={80} defaultValue={values.name} placeholder="Zubaida Begum" className={input} />
          </div>
          <div>
            <label htmlFor="relation" className={label}>{t("Relationship", "رشتہ")}</label>
            <select id="relation" name="relation" value={relationChoice} onChange={(e) => chooseRelation(e.currentTarget)} className={input}>
              <option value="">{t("Choose…", "چنیں…")}</option>
              {RELATIONS.map((x) => (
                <option key={x.id} value={x.id}>{x[lang]}</option>
              ))}
              <option value={OTHER_RELATION}>{t("Other (write it)", "کوئی اور (خود لکھیں)")}</option>
            </select>
            {relationChoice === OTHER_RELATION && (
              <input name="relation_other" maxLength={MAX_RELATION} defaultValue={findRelation(startRelation) ? "" : startRelation} placeholder={t("e.g. Neighbour, Teacher", "مثلاً پڑوسی، استاد")} aria-label={t("Write the relationship", "رشتہ لکھیں")} className={input} />
            )}
          </div>
          <div>
            <label htmlFor="gender" className={label}>{t("Gender", "صنف")}</label>
            <select id="gender" name="gender" defaultValue={values.gender} className={input}>
              <option value="female">{t("Female", "خاتون")}</option>
              <option value="male">{t("Male", "مرد")}</option>
            </select>
            <p className={hint}>{t("Khairiyat uses the right Urdu grammar for them.", "خیریت ان کے لیے درست اردو گرامر استعمال کرتی ہے۔")}</p>
          </div>
          <div>
            <label htmlFor="nickname" className={label}>{t("What do you call them?", "آپ انہیں کیا کہہ کر بلاتے ہیں؟")}</label>
            <input id="nickname" name="nickname" required maxLength={40} defaultValue={values.nickname} placeholder="Ammi, Phuppo, Appa…" className={input} onInput={(e) => fillUrdu(e.currentTarget, "nickname_ur")} />
            <p className={hint}>{t("Khairiyat will address them by this name.", "خیریت انہیں اسی نام سے پکارے گی۔")}</p>
          </div>
          <div>
            <label htmlFor="nickname_ur" className={label}>{t("Same in Urdu (filled automatically)", "اردو میں (خود لکھا جائے گا)")}</label>
            <input id="nickname_ur" name="nickname_ur" dir="rtl" maxLength={40} defaultValue={values.nicknameUr} placeholder="امی" className={`${input} font-urdu`} />
            <p className={hint}>{t("Shown on their screen.", "ان کی اسکرین پر دکھایا جائے گا۔")}</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="ui-card p-5">
        <legend className="rounded-full bg-sage-soft px-3 py-0.5 font-display font-semibold text-emerald-900">{t("Daily Call", "روز کی کال")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="checkin_time" className={label}>{t("Call time every day (Pakistan time)", "روز کال کا وقت (پاکستان)")}</label>
            <input id="checkin_time" name="checkin_time" type="time" required defaultValue={values.checkinTime} className={input} />
          </div>
          <div>
            <label htmlFor="companion_gender" className={label}>{t("Khairiyat speaks like", "خیریت کس کی طرح بولے")}</label>
            <select id="companion_gender" name="companion_gender" defaultValue={values.companionGender} className={input}>
              <option value="female">{t("A woman of the family (female voice)", "گھر کی خاتون کی طرح (زنانہ آواز)")}</option>
              <option value="male">{t("A man of the family (male voice)", "گھر کے مرد کی طرح (مردانہ آواز)")}</option>
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

      <fieldset className="ui-card p-5">
        <legend className="rounded-full bg-sage-soft px-3 py-0.5 font-display font-semibold text-emerald-900">{t("Medicines", "دوائیاں")}</legend>
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

      <fieldset className="ui-card p-5">
        <legend className="rounded-full bg-sage-soft px-3 py-0.5 font-display font-semibold text-emerald-900">{t("Your Details", "آپ")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="child_name" className={label}>{t("Your name", "آپ کا نام")}</label>
            <input id="child_name" name="child_name" required maxLength={40} defaultValue={values.childName} placeholder="Ali" className={input} onInput={(e) => fillUrdu(e.currentTarget, "child_name_ur")} />
          </div>
          <div>
            <label htmlFor="child_name_ur" className={label}>{t("Your name in Urdu (filled automatically)", "آپ کا نام اردو میں (خود لکھا جائے گا)")}</label>
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
      <button type="submit" disabled={pending} className="ui-btn ui-btn-primary">
        {pending ? t("Saving…", "محفوظ ہو رہا ہے…") : submitLabel}
      </button>
    </form>
  );
}
