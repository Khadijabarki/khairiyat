"use client";

import { useActionState, useCallback, useState } from "react";
import type { ParentFormState } from "@/app/family/actions";
import { useLang } from "../i18n/LangProvider";
import { capitaliseField, matchesProfileName } from "@/lib/capitals";
import { isolate } from "@/lib/urdu-names";
import { RETRY_MINUTES, RING_MINUTES, SHORT_RING_MINUTES, type RingMinutes } from "@/lib/call-rules";
import { MAX_RELATION, OTHER_RELATION, RELATIONS, findRelation } from "@/lib/relations";

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
  language: "urdu" | "english" | "auto" | "punjabi";
  checkinTime: string;
  ringMinutes: RingMinutes;
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
  ringMinutes: RING_MINUTES,
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
  profileName?: string; // the account's name: "Your name" must be the same
};

export default function ParentForm({ action, values: initialValues, submitLabel, defaultChildName = "", profileName = "" }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const { lang, t } = useLang();
  const startRelation = state.values?.relation ?? initialValues.relation;
  // "Other" shows a box to write the relationship.
  const [relationChoice, setRelationChoice] = useState(() =>
    !startRelation ? "" : findRelation(startRelation) ? startRelation : OTHER_RELATION,
  );

  // Urdu names are typed by the family (optional). If the English name is changed, the Urdu
  // saved for the old name is emptied, so the screen can never show a different name.
  function keepUrduHonest(input: HTMLInputElement, urduField: string, saved: { name: string; urdu: string }) {
    const target = input.form?.elements.namedItem(urduField) as HTMLInputElement | null;
    if (!target || target.dataset.typed) return;
    const unchanged = input.value.trim().toLowerCase() === saved.name.trim().toLowerCase();
    target.value = unchanged ? saved.urdu : "";
  }
  // Remembers that the family wrote this Urdu themselves (emptying the box undoes that).
  function markTyped(input: HTMLInputElement) {
    input.dataset.typed = input.value ? "yes" : "";
  }
  // "Your name" as typed now (null = as shown when the form opened).
  const [typedChild, setTypedChild] = useState<string | null>(null);
  // Next.js keeps a page's form alive after you leave it. Reset it then, so opening it
  // again shows what is saved, not what was typed before.
  const resetOnLeave = useCallback((form: HTMLFormElement | null) => () => {
    form?.reset();
    setTypedChild(null);
  }, []);
  const savedNickname = { name: initialValues.nickname, urdu: initialValues.nicknameUr };
  const savedChild = { name: initialValues.childName, urdu: initialValues.childNameUr };

  // Picking a relationship fills in the gender and a suggested way to address them.
  function chooseRelation(select: HTMLSelectElement) {
    setRelationChoice(select.value);
    const relation = findRelation(select.value);
    if (!relation || !select.form) return;
    const field = (name: string) => select.form!.elements.namedItem(name) as HTMLInputElement;
    field("gender").value = relation.gender;
    const suggested = (value: string, key: "call" | "callUr") => !value || RELATIONS.some((x) => x[key] === value);
    if (relation.call && suggested(field("nickname").value, "call")) field("nickname").value = relation.call;
    keepUrduHonest(field("nickname"), "nickname_ur", savedNickname);
  }
  // After an error, show what was typed (the server sends it back), not the starting values.
  const values = state.values ?? { ...initialValues, childName: initialValues.childName || defaultChildName };
  // A new key re-creates the inputs so their default values update after each submit.
  const formKey = JSON.stringify(state.values ?? null);
  const shownChild = (typedChild ?? values.childName).trim();
  const differs = Boolean(shownChild) && !matchesProfileName(shownChild, profileName);
  function fillProfileName(form: HTMLFormElement | null) {
    if (!form) return;
    const input = form.elements.namedItem("child_name") as HTMLInputElement;
    input.value = profileName.slice(0, 40);
    keepUrduHonest(input, "child_name_ur", savedChild);
    setTypedChild(profileName.slice(0, 40));
  }
  const medicineRows = Array.from({ length: Math.max(MEDICINE_ROWS, values.medicines.length) }, (_, i) => values.medicines[i]);

  return (
    <form key={formKey} ref={resetOnLeave} action={formAction} onInput={capitaliseField} onBlur={capitaliseField} className="space-y-6">
      <fieldset className="ui-card p-5">
        <legend className="rounded-full bg-sage-soft px-3 py-0.5 font-display font-semibold text-emerald-900">{t("Family Member", "گھر کا فرد")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className={label}>{t("Full name", "پورا نام")}</label>
            <input id="name" name="name" data-cap="words" autoCapitalize="words" dir="auto" required maxLength={80} defaultValue={values.name} placeholder={t("e.g. Zubaida Begum", "مثلاً زبیدہ بیگم")} spellCheck={false} className={input} />
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
              <input name="relation_other" data-cap="first" autoCapitalize="sentences" dir="auto" maxLength={MAX_RELATION} defaultValue={findRelation(startRelation) ? "" : startRelation} placeholder={t("e.g. Neighbour, Teacher", "مثلاً پڑوسی، استاد")} aria-label={t("Write the relationship", "رشتہ لکھیں")} className={input} />
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
            <input id="nickname" name="nickname" data-cap="words" dir="auto" required maxLength={40} defaultValue={values.nickname} placeholder="Ammi, Phuppo, Appa…" className={input} autoCapitalize="words" spellCheck={false} onInput={(e) => keepUrduHonest(e.currentTarget, "nickname_ur", savedNickname)} />
            <p className={hint}>{t("Khairiyat will address them by this name.", "خیریت انہیں اسی نام سے پکارے گی۔")}</p>
          </div>
          <div>
            <label htmlFor="nickname_ur" className={label}>{t("Same in Urdu (optional)", "اردو میں (اختیاری)")}</label>
            <input id="nickname_ur" name="nickname_ur" dir="rtl" lang="ur" maxLength={40} defaultValue={values.nicknameUr} placeholder={t("Urdu name", "اردو نام")} className={`${input} font-urdu`} onInput={(e) => markTyped(e.currentTarget)} />
            <p className={hint}>{t("Type it with an Urdu keyboard, or leave it empty.", "اردو کی بورڈ سے لکھیں، یا خالی چھوڑ دیں۔")}</p>
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
            <p id="ring-label" className={label}>{t("How long a call rings", "کال کتنی دیر بجے")}</p>
            <div role="radiogroup" aria-labelledby="ring-label" className="mt-1 grid grid-cols-2 gap-2">
              {[RING_MINUTES, SHORT_RING_MINUTES].map((minutes) => (
                <label key={minutes} className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-stone-300 px-3 py-2.5 text-sm font-medium text-stone-700 has-checked:border-emerald-700 has-checked:bg-sage-soft has-checked:text-emerald-900">
                  <input type="radio" name="ring_minutes" value={minutes} defaultChecked={values.ringMinutes === minutes} className="size-4 accent-emerald-700" />
                  {t(`${minutes} minutes`, `${minutes} منٹ`)}
                </label>
              ))}
            </div>
            <p className={hint}>{t(`After no answer or "Later", it calls again ${RETRY_MINUTES} minutes after the first call. 2 minutes is handy for a live demo.`, `جواب نہ ملے یا "بعد میں" دبائیں تو پہلی کال کے ${RETRY_MINUTES} منٹ بعد دوبارہ کال آتی ہے۔ لائیو ڈیمو کے لیے 2 منٹ آسان ہے۔`)}</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="language" className={label}>{t("Language", "گفتگو کی زبان")}</label>
            <select id="language" name="language" defaultValue={values.language} className={input}>
              <option value="urdu">{t("Urdu (understands Punjabi too) — recommended", "اردو (پنجابی بھی سمجھتی ہے) — بہتر")}</option>
              <option value="english">{t("English", "انگریزی")}</option>
              <option value="auto">{t("Reply in the language they speak (Urdu or Punjabi)", "جس زبان میں بولیں اسی میں جواب (اردو یا پنجابی)")}</option>
              <option value="punjabi">{t("Always Punjabi (experimental)", "ہمیشہ پنجابی (آزمائشی)")}</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="ui-card p-5">
        <legend className="rounded-full bg-sage-soft px-3 py-0.5 font-display font-semibold text-emerald-900">{t("Medicines", "دوائیاں")}</legend>
        <p className={hint}>{t("Add a time next to a medicine and Khairiyat also calls at that time to ask about it. It never suggests new medicines.", "دوائی کے ساتھ وقت لکھیں تو خیریت اس وقت بھی کال کر کے اس کا پوچھے گی۔ نئی دوائی کبھی تجویز نہیں کرتی۔")}</p>
        <div className="mt-3 space-y-2">
          {medicineRows.map((med, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_9rem]">
              <input name={`med_name_${i}`} data-cap="first" autoCapitalize="sentences" dir="auto" maxLength={60} defaultValue={med?.name ?? ""} placeholder={i === 0 ? "BP ki goli" : t("Medicine", "دوائی")} aria-label={`${t("Medicine", "دوائی")} ${i + 1}`} className={input} />
              <input name={`med_when_${i}`} data-cap="first" autoCapitalize="sentences" dir="auto" maxLength={60} defaultValue={med?.when ?? ""} placeholder={i === 0 ? "subah nashte ke baad" : t("When", "کب")} aria-label={`${t("When to take medicine", "دوائی کا وقت")} ${i + 1}`} className={input} />
              <input name={`med_time_${i}`} type="time" defaultValue={med?.time ?? ""} aria-label={`${t("Call time for medicine", "دوائی کی کال کا وقت")} ${i + 1}`} title={t("Call time", "کال کا وقت")} className={`${input} col-span-2 sm:col-span-1`} />
            </div>
          ))}
        </div>
        <label htmlFor="topics" className={`${label} mt-4`}>{t("Things they enjoy talking about (comma separated)", "پسندیدہ موضوعات (کاما لگا کر لکھیں)")}</label>
        <input id="topics" name="topics" data-cap="first" autoCapitalize="sentences" dir="auto" maxLength={400} defaultValue={values.topics.join(", ")} placeholder="pote ki baatein, cricket, purane gaane" className={input} />
      </fieldset>

      <fieldset className="ui-card p-5">
        <legend className="rounded-full bg-sage-soft px-3 py-0.5 font-display font-semibold text-emerald-900">{t("Your Details", "آپ")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="child_name" className={label}>{t("Your name", "آپ کا نام")}</label>
            <input id="child_name" name="child_name" data-cap="words" dir="auto" required maxLength={40} defaultValue={values.childName} placeholder={t("e.g. Ali", "مثلاً علی")} className={input} autoCapitalize="words" spellCheck={false} onInput={(e) => { keepUrduHonest(e.currentTarget, "child_name_ur", savedChild); setTypedChild(e.currentTarget.value); }} />
            {differs && (
              <div role="alert" className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-stone-800">
                <p>{t(`Your profile name is ${profileName}, but here it says ${shownChild}. Use the same name, so they know the call is really from you. To change your name, go to Settings.`, `آپ کے پروفائل کا نام ${isolate(profileName)} ہے، مگر یہاں ${isolate(shownChild)} لکھا ہے۔ وہی نام لکھیں تاکہ انہیں پتا ہو کہ کال آپ ہی کی طرف سے ہے۔ نام بدلنے کے لیے ترتیبات میں جائیں۔`)}</p>
                <button type="button" onClick={(e) => fillProfileName(e.currentTarget.form)} className="mt-2 font-semibold text-emerald-700 underline">
                  {t(`Use my profile name: ${profileName}`, `پروفائل والا نام لکھیں: ${isolate(profileName)}`)}
                </button>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="child_name_ur" className={label}>{t("Your name in Urdu (optional)", "آپ کا نام اردو میں (اختیاری)")}</label>
            <input id="child_name_ur" name="child_name_ur" dir="rtl" lang="ur" maxLength={40} defaultValue={values.childNameUr} placeholder={t("Urdu name", "اردو نام")} className={`${input} font-urdu`} onInput={(e) => markTyped(e.currentTarget)} />
            <p className={hint}>{t("Type it with an Urdu keyboard, or leave it empty.", "اردو کی بورڈ سے لکھیں، یا خالی چھوڑ دیں۔")}</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="child_phone" className={label}>{t("Your phone (optional)", "آپ کا فون (اختیاری)")}</label>
            <input id="child_phone" name="child_phone" dir="ltr" type="tel" inputMode="tel" maxLength={30} defaultValue={values.childPhone} placeholder="+92 300 1234567" className={input} />
            <p className={hint}>{t("In an emergency, their screen shows a button to call you on this number.", "ایمرجنسی میں ان کی اسکرین پر اس نمبر پر آپ کو کال کرنے کا بٹن آئے گا۔")}</p>
          </div>
        </div>
      </fieldset>

      <label className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-stone-800">
        <input type="checkbox" name="consent" defaultChecked={values.consentGiven} className="mt-1 size-4 accent-emerald-700" />
        <span>
          {t("They know that Khairiyat is an AI, agree to talk with it, and agree that a short summary of each call is shared with the family. (Full conversations are never stored.)", "وہ جانتے ہیں کہ خیریت ایک AI ہے، اس سے بات کرنے پر راضی ہیں، اور اس پر بھی کہ ہر بات کا مختصر خلاصہ گھر والوں کو دیا جائے۔ (پوری گفتگو کبھی محفوظ نہیں ہوتی۔)")}
        </span>
      </label>

      {state.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="ui-btn ui-btn-primary">
        {pending ? t("Saving…", "محفوظ ہو رہا ہے…") : submitLabel}
      </button>
    </form>
  );
}
