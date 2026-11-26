// "Set up on their phone": the parent's private talk link, as a QR code and a copyable link.
import { headers } from "next/headers";
import QRCode from "qrcode";
import { renewTalkLink } from "@/app/family/actions";
import type { Parent } from "@/lib/data";
import CopyButton from "./CopyButton";

// Our site's own address (works locally and on Vercel).
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function ShareLink({ parent }: { parent: Parent }) {
  const link = `${await siteOrigin()}/talk/${parent.talkToken}`;
  // The QR code is drawn on our server from our own link, so the SVG is safe to insert.
  const qrSvg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1917", light: "#ffffff" } });

  return (
    <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="font-semibold text-stone-900">Set up on {parent.nickname}&apos;s phone</h2>
      <div className="mt-3 flex flex-col gap-5 sm:flex-row">
        <div className="size-40 shrink-0 rounded-xl border border-stone-200 p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label="QR code of the talk link" role="img" />
        <div className="min-w-0 space-y-3 text-sm text-stone-700">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Scan this QR code with {parent.nickname}&apos;s phone (or send them the link).</li>
            <li>Allow the microphone, then add it to the home screen.</li>
            <li>That&apos;s it: {parent.nickname} only ever presses one big button.</li>
          </ol>
          <div className="flex items-center gap-2">
            <code className="block min-w-0 truncate rounded-lg bg-stone-100 px-2 py-1 text-xs text-stone-700">{link}</code>
            <CopyButton text={link} />
          </div>
          <p className="text-xs text-stone-500">
            This link is private: anyone who has it can talk as {parent.nickname}. Share it only with them.
          </p>
          {!parent.isDemo && (
            <form action={renewTalkLink.bind(null, parent.id)}>
              <button type="submit" className="text-xs font-medium text-rose-700 underline-offset-2 hover:underline">
                Lost the phone? Make a new link (the old one stops working)
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
