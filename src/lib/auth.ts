// Family accounts (sign up / sign in) with Supabase Auth.
//
// - Sessions live in secure, httpOnly cookies managed by @supabase/ssr.
// - The browser never talks to Supabase directly: every sign-in, sign-up and data
//   request goes through our server, which then checks who is signed in.
// - We always confirm the user with Supabase (getUser), never trust the cookie alone.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type FamilyUser = { id: string; email: string };

function authSettings() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim(); // public key: safe, it only allows what our auth rules allow
  if (!url || !key) throw new Error("SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is not set");
  return { url, key };
}

// A Supabase client that reads and writes the session cookies of this request.
export async function authClient() {
  const { url, key } = authSettings();
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components can't set cookies; the proxy (src/proxy.ts) refreshes sessions instead.
        }
      },
    },
  });
}

// The signed-in family member, verified with Supabase, or null.
export async function currentUser(): Promise<FamilyUser | null> {
  try {
    const supabase = await authClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? "" };
  } catch {
    return null;
  }
}

// For pages that need a signed-in family member: sends everyone else to the sign-in page.
export async function requireUser(): Promise<FamilyUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

// The shared demo account that judges can open with one click (see scripts/setup-demo.mjs).
export function demoEmail(): string {
  return process.env.DEMO_EMAIL?.trim() || "demo@khairiyat.app";
}
