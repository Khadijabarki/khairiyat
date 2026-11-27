// Safety settings for the family sign-in cookie. The library's default leaves the cookie
// readable by page scripts, so we must set these ourselves.
// httpOnly: scripts can't read it. secure: sent only over HTTPS (browsers also allow localhost).
// Remembers which saved alert device this browser is.
export const FAMILY_DEVICE_COOKIE = "khairiyat_device";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
