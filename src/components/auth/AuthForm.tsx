"use client";

import Link from "next/link";
import { useActionState } from "react";
import { openDemo, signIn, signUp, type AuthState } from "@/app/(auth)/actions";
import { useLang } from "../i18n/LangProvider";
import { capitaliseField } from "@/lib/capitals";

const inputClass = "ui-input";

// Sign-in or sign-up form for a family member (the son/daughter).
export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "signin" ? signIn : signUp, {});
  const isSignUp = mode === "signup";
  const { t } = useLang();

  return (
    <form action={action} className="w-full ui-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-stone-900">{isSignUp ? t("Create a Family Account", "فیملی اکاؤنٹ بنائیں") : t("Family Sign In", "فیملی سائن اِن")}</h1>
      <p className="mt-1 text-sm text-stone-600">
        {isSignUp
          ? t("For anyone who wants daily updates about a loved one.", "ہر اس شخص کے لیے جو روز اپنوں کی خبر چاہتا ہے۔")
          : t("See how your family is doing, and manage their daily Khairiyat calls.", "گھر والوں کا حال دیکھیں اور ان کی روز کی خیریت کال سنبھالیں۔")}
      </p>

      {isSignUp && (
        <>
          <label htmlFor="full_name" className="mt-4 block text-sm font-medium text-stone-700">{t("Your Name", "آپ کا نام")}</label>
          <input id="full_name" name="full_name" data-cap="words" autoCapitalize="words" onInput={capitaliseField} onBlur={capitaliseField} dir="auto" autoComplete="name" maxLength={60} className={inputClass} />
        </>
      )}

      <label htmlFor="email" className="mt-4 block text-sm font-medium text-stone-700">{t("Email", "ای میل")}</label>
      <input dir="ltr" id="email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={state.email} className={inputClass} />

      <label htmlFor="password" className="mt-3 block text-sm font-medium text-stone-700">{t("Password", "پاس ورڈ")}</label>
      <input
        dir="ltr"
        id="password"
        name="password"
        type="password"
        autoComplete={isSignUp ? "new-password" : "current-password"}
        required
        minLength={isSignUp ? 8 : undefined}
        maxLength={72}
        className={inputClass}
      />
      {isSignUp && <p className="mt-1 text-xs text-stone-500">{t("At least 8 characters.", "کم از کم 8 حروف۔")}</p>}

      {state.error && <p role="alert" className="mt-3 text-sm text-rose-700">{state.error}</p>}
      {state.info && <p role="status" className="mt-3 text-sm text-emerald-800">{state.info}</p>}

      <button
        type="submit"
        disabled={pending}
        className="ui-btn ui-btn-primary mt-4 w-full"
      >
        {pending ? t("Please wait…", "انتظار کریں…") : isSignUp ? t("Create account", "اکاؤنٹ بنائیں") : t("Sign in", "سائن اِن")}
      </button>

      <p className="mt-4 text-center text-sm text-stone-600">
        {isSignUp ? (
          <>{t("Already have an account?", "پہلے سے اکاؤنٹ ہے؟")} <Link href="/login" className="font-medium text-emerald-800 hover:underline">{t("Sign in", "سائن اِن")}</Link></>
        ) : (
          <>{t("New here?", "نئے ہیں؟")} <Link href="/signup" className="font-medium text-emerald-800 hover:underline">{t("Create a family account", "فیملی اکاؤنٹ بنائیں")}</Link></>
        )}
      </p>
    </form>
  );
}

// One-click demo for judges and visitors: opens the shared demo family.
export function DemoButton() {
  const [state, action, pending] = useActionState<AuthState, FormData>(openDemo, {});
  const { t } = useLang();
  return (
    <form action={action} className="w-full rounded-2xl border border-dashed border-emerald-300 bg-sage-soft p-5 text-center">
      <p className="text-sm text-stone-700">{t("Judging or just curious? See a family with sample data, no sign-up needed.", "جج ہیں یا بس دیکھنا چاہتے ہیں؟ نمونے کے ڈیٹا والا خاندان دیکھیں، اکاؤنٹ کی ضرورت نہیں۔")}</p>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 ui-btn ui-btn-primary"
      >
        {pending ? t("Opening…", "کھل رہا ہے…") : t("Open the demo", "ڈیمو کھولیں")}
      </button>
      {state.error && <p role="alert" className="mt-2 text-sm text-rose-700">{state.error}</p>}
    </form>
  );
}
