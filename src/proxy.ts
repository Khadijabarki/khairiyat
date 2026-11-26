// Runs before family pages load and keeps the sign-in session fresh.
// Supabase sessions use short-lived access tokens; this quietly renews them
// (Server Components can read cookies but not write them, so it has to happen here).
// It does NOT decide who may see what: every page and action checks the user itself.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser(); // renews the session cookies if needed
  return response;
}

// Only the pages that use family sign-in.
export const config = {
  matcher: ["/family/:path*", "/login", "/signup"],
};
