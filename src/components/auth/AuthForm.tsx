"use client";

import Link from "next/link";
import { useActionState } from "react";
import { openDemo, signIn, signUp, type AuthState } from "@/app/(auth)/actions";

const inputClass =
  "mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200";

// Sign-in or sign-up form for a family member (the son/daughter).
export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "signin" ? signIn : signUp, {});
  const isSignUp = mode === "signup";

  return (
    <form action={action} className="w-full rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-stone-900">{isSignUp ? "Create a family account" : "Family sign in"}</h1>
      <p className="mt-1 text-sm text-stone-600">
        {isSignUp
          ? "For the son or daughter who wants daily updates about their parent."
          : "See how your parent is doing, and manage their daily Khairiyat calls."}
      </p>

      <label htmlFor="email" className="mt-4 block text-sm font-medium text-stone-700">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={state.email} className={inputClass} />

      <label htmlFor="password" className="mt-3 block text-sm font-medium text-stone-700">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete={isSignUp ? "new-password" : "current-password"}
        required
        minLength={isSignUp ? 8 : undefined}
        maxLength={72}
        className={inputClass}
      />
      {isSignUp && <p className="mt-1 text-xs text-stone-500">At least 8 characters.</p>}

      {state.error && <p role="alert" className="mt-3 text-sm text-rose-700">{state.error}</p>}
      {state.info && <p role="status" className="mt-3 text-sm text-emerald-800">{state.info}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
      </button>

      <p className="mt-4 text-center text-sm text-stone-600">
        {isSignUp ? (
          <>Already have an account? <Link href="/login" className="font-medium text-emerald-800 hover:underline">Sign in</Link></>
        ) : (
          <>New here? <Link href="/signup" className="font-medium text-emerald-800 hover:underline">Create a family account</Link></>
        )}
      </p>
    </form>
  );
}

// One-click demo for judges and visitors: opens the shared demo family.
export function DemoButton() {
  const [state, action, pending] = useActionState<AuthState, FormData>(openDemo, {});
  return (
    <form action={action} className="w-full rounded-2xl border border-dashed border-emerald-400 bg-emerald-50 p-5 text-center">
      <p className="text-sm text-stone-700">Judging or just curious? See a family with sample data, no sign-up needed.</p>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-xl bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {pending ? "Opening…" : "Open the demo"}
      </button>
      {state.error && <p role="alert" className="mt-2 text-sm text-rose-700">{state.error}</p>}
    </form>
  );
}
