// The app manifest for one parent's Khairiyat app.
// Each parent gets their own, so the home-screen icon opens straight to THEIR talk screen
// and the app looks like a real app (full screen, no browser bar).
import { isValidTalkToken } from "@/lib/security";

export async function GET(_request: Request, { params }: RouteContext<"/talk/[token]/manifest.webmanifest">) {
  const { token } = await params;
  if (!isValidTalkToken(token)) return new Response("Not found", { status: 404 });

  const manifest = {
    id: `/talk/${token}`,
    name: "خیریت",
    short_name: "خیریت",
    description: "Khairiyat: roz ki baat-cheet",
    start_url: `/talk/${token}`,
    scope: `/talk/${token}`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#fffbeb",
    theme_color: "#047857",
    lang: "ur",
    dir: "rtl",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "private, max-age=3600" },
  });
}
