// Simple access code for the family dashboard (it shows health information).
//
// How it works:
// - The family enters the access code (FAMILY_ACCESS_CODE in the server's settings).
// - If it matches, we set an httpOnly cookie holding a signature of the code,
//   never the code itself. Browser JavaScript can't read the cookie.
// - Changing FAMILY_ACCESS_CODE instantly signs everyone out.
//
// Production would use proper family accounts (Supabase Auth); for the prototype
// one shared code keeps the dashboard private without slowing the demo down.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const FAMILY_COOKIE = "khairiyat_family";
export const FAMILY_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // stay signed in for 7 days

function accessCode(): string | null {
  return process.env.FAMILY_ACCESS_CODE?.trim() || null;
}

// The cookie value: a signature derived from the access code.
export function familySessionValue(): string | null {
  const code = accessCode();
  return code ? createHmac("sha256", code).update("khairiyat-family-session-v1").digest("base64url") : null;
}

// Compares in constant time, so the answer can't be guessed by measuring response times.
function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function isCorrectCode(attempt: string): boolean {
  const code = accessCode();
  return Boolean(code) && safeEqual(attempt.trim(), code!);
}

export async function isFamilySignedIn(): Promise<boolean> {
  const expected = familySessionValue();
  const actual = (await cookies()).get(FAMILY_COOKIE)?.value;
  return Boolean(expected && actual && safeEqual(actual, expected));
}
