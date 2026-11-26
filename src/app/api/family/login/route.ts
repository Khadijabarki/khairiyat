// Checks the family access code from the sign-in form and sets the session cookie.
import { FAMILY_COOKIE, FAMILY_COOKIE_MAX_AGE, familySessionValue, isCorrectCode } from "@/lib/family-auth";
import { clientIp, isSameOrigin, rateLimit } from "@/lib/security";

// After the form is submitted, send the browser back to a page (303 = "now GET this page").
// Built by hand (not Response.redirect) because we may need to add a cookie header.
function redirectTo(request: Request, path: string, cookie?: string): Response {
  const headers = new Headers({ Location: new URL(path, request.url).toString(), "Cache-Control": "no-store" });
  if (cookie) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });

  // Slow down guessing: 10 attempts per 10 minutes per visitor.
  if (!rateLimit(`login:${clientIp(request)}`, 10, 10 * 60 * 1000)) {
    return redirectTo(request, "/family?error=wait");
  }

  const form = await request.formData().catch(() => null);
  const code = String(form?.get("code") ?? "").slice(0, 100);
  const session = familySessionValue();
  if (!session || !isCorrectCode(code)) return redirectTo(request, "/family?error=wrong");

  // Secure = only sent over HTTPS (on the live site); local http://localhost still works.
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return redirectTo(
    request,
    "/family",
    `${FAMILY_COOKIE}=${session}; Path=/; Max-Age=${FAMILY_COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${secure}`,
  );
}
