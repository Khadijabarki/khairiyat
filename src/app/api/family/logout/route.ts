// Signs the family out by clearing the session cookie.
import { FAMILY_COOKIE } from "@/lib/family-auth";
import { isSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const headers = new Headers({ Location: new URL("/family", request.url).toString(), "Cache-Control": "no-store" });
  headers.append("Set-Cookie", `${FAMILY_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  return new Response(null, { status: 303, headers });
}
