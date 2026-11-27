"use client";

import Link from "next/link";
import { useActionState } from "react";
import { openDemo, signIn, signUp, type AuthState } from "@/app/(auth)/actions";
import { useLang } from "../i18n/LangProvider";

const inputClass =
  "mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200";

// Sign-in or sign-up form for a family member (the son/daughter).
export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "signin" ? signIn : signUp, {});
  const isSignUp = mode === "signup";
  const { t } = useLang();

  return (
    <form action={action} className="w-full rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-stone-900">{isSignUp ? t("Create a family account", "فیملی اکاؤنٹ بنائیں") : t("Family sign in", "فیملی سائن اِن")}</h1>
      <p className="mt-1 text-sm text-stone-600">
        {isSignUp
          ? t("For the son or daughter who wants daily updates about their parent.", "اس بیٹے یا بیٹی کے لیے جو روز والدین کی خبر چاہتے ہیں۔")
          : t("See how your parent is doing, and manage their daily Khairiyat calls.", "والدین کا حال دیکھیں اور ان کی روز کی خیریت کال سنبھالیں۔")}
      </p>

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
        className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
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
    <form action={action} className="w-full rounded-2xl border border-dashed border-emerald-400 bg-emerald-50 p-5 text-center">
      <p className="text-sm text-stone-700">{t("Judging or just curious? See a family with sample data, no sign-up needed.", "جج ہیں یا بس دیکھنا چاہتے ہیں؟ نمونے کے ڈیٹا والا خاندان دیکھیں، اکاؤنٹ کی ضرورت نہیں۔")}</p>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-xl bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {pending ? t("Opening…", "کھل رہا ہے…") : t("Open the demo", "ڈیمو کھولیں")}
      </button>
      {state.error && <p role="alert" className="mt-2 text-sm text-rose-700">{state.error}</p>}
    </form>
  );
}
