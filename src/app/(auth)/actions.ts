"use server";
// Sign up, sign in, sign out and "open the demo" for family accounts.
// Server Actions: Next.js only accepts them from our own pages (built-in origin check).

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient, currentUser, demoEmail } from "@/lib/auth";
import { removeFamilyDevices } from "@/lib/family-devices";
import { FAMILY_DEVICE_COOKIE } from "@/lib/session-cookie";
import { ipFromHeaders, rateLimit } from "@/lib/security";
import { say } from "@/lib/server-messages";
import { revalidatePath } from "next/cache";

// email is sent back after an error so the form can show it again (never the password).
export type AuthState = { error?: string; info?: string; email?: string };

const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

function readCredentials(form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  return { email, password };
}

// Slows down password guessing and mass sign-ups from one address.
async function allowAttempt(kind: string): Promise<boolean> {
  return rateLimit(`${kind}:${ipFromHeaders(await headers())}`, 10, 10 * 60 * 1000);
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!(await allowAttempt("signup"))) return { error: await say("Too many attempts. Please wait a few minutes.") };
  const { email, password } = readCredentials(form);
  if (!EMAIL_PATTERN.test(email)) return { error: await say("Please enter a valid email address."), email };
  if (password.length < 8 || password.length > 72) return { error: await say("Password must be 8 to 72 characters."), email };

  const supabase = await authClient();
  const fullName = String(form.get("full_name") ?? "").trim().slice(0, 60);
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
  if (error) {
    // Don't reveal whether an email is already registered.
    console.error("signUp: failed", error.status ?? "");
    return { error: await say("Could not create the account. Try another email or sign in."), email };
  }
  // If email confirmation is switched on in Supabase, there is no session yet.
  if (!data.session) return { info: await say("Account created. Please confirm your email, then sign in.") };
  redirect("/family");
}

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  if (!(await allowAttempt("signin"))) return { error: await say("Too many attempts. Please wait a few minutes.") };
  const { email, password } = readCredentials(form);
  if (!email || !password) return { error: await say("Please enter your email and password."), email };

  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // One message for every failure, so attackers can't tell which emails exist.
  if (error) return { error: await say("Email or password is not correct."), email };
  redirect("/family");
}

// One click for judges: signs in to the shared demo account (sample parents and data).
export async function openDemo(): Promise<AuthState> {
  if (!(await allowAttempt("demo"))) return { error: await say("Too many attempts. Please wait a few minutes.") };
  const password = process.env.DEMO_PASSWORD?.trim();
  if (!password) return { error: await say("The demo is not set up on this server.") };

  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({ email: demoEmail(), password });
  if (error) return { error: await say("The demo is not available right now.") };
  redirect("/family");
}

// The name shown in the app instead of the email address.
export async function updateName(_prev: AuthState, form: FormData): Promise<AuthState> {
  const user = await currentUser();
  if (!user) redirect("/login");
  // The demo account is shared by everyone, so nobody may rename it.
  if (user.email === demoEmail()) return { error: await say("The demo account can't be changed.") };
  if (!(await allowAttempt("profile"))) return { error: await say("Too many attempts. Please wait a few minutes.") };
  const fullName = String(form.get("full_name") ?? "").trim().slice(0, 60);
  if (!fullName) return { error: await say("Please write your name.") };
  const supabase = await authClient();
  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
  if (error) return { error: await say("Could not save. Please try again.") };
  revalidatePath("/family", "layout");
  return { info: await say("Your name is saved.") };
}

export async function signOut(): Promise<void> {
  const supabase = await authClient();
  // Stop alerts on this device: someone signed out must not keep receiving the family's news.
  const user = await currentUser();
  const store = await cookies();
  const deviceId = store.get(FAMILY_DEVICE_COOKIE)?.value;
  if (user && deviceId && /^[0-9a-f-]{36}$/.test(deviceId)) await removeFamilyDevices(user.id, [deviceId]);
  store.delete(FAMILY_DEVICE_COOKIE);
  await supabase.auth.signOut();
  redirect("/login");
}
