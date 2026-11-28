// "Set up on their phone": the parent's private talk link, as a QR code and a copyable link.
import { headers } from "next/headers";
import QRCode from "qrcode";
import { renewTalkLink } from "@/app/family/actions";
import type { Parent } from "@/lib/data";
import CopyButton from "./CopyButton";
import { getLang } from "@/lib/i18n-server";
import { parentNames, translator } from "@/lib/i18n";
import SectionHeading from "../ui/SectionHeading";

// Our site's own address (works locally and on Vercel).
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function ShareLink({ parent }: { parent: Parent }) {
  const link = `${await siteOrigin()}/talk/${parent.talkToken}`;
  const lang = await getLang();
  const t = translator(lang);
  const { nickname } = parentNames(parent, lang);
  // The QR code is drawn on our server from our own link, so the SVG is safe to insert.
  const qrSvg = await QRCode.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1c1917", light: "#ffffff" } });

  return (
    <section className="mt-6 ui-card p-5">
      <SectionHeading icon="screen" title={t(`Set Up ${nickname}'s Phone`, `${nickname} کے فون پر لگائیں`)} />
      <div className="mt-3 flex flex-col gap-5 sm:flex-row">
        <div className="size-40 shrink-0 rounded-xl border border-stone-200 p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} aria-label={t("QR code of the talk link", "لنک کا QR کوڈ")} role="img" />
        <div className="min-w-0 space-y-3 text-sm text-stone-700">
          <ol className="list-decimal space-y-1 ps-5">
            <li>{t(`Scan this QR code with ${nickname}'s phone (or send them the link).`, `${nickname} کے فون سے یہ QR کوڈ اسکین کریں (یا لنک بھیج دیں)۔`)}</li>
            <li>{t("Allow the microphone, then add it to the home screen.", "مائیک کی اجازت دیں، پھر ہوم اسکرین پر لگائیں۔")}</li>
            <li>{t(`That's it: ${nickname} only needs to press one big button.`, `بس: ${nickname} کو صرف ایک بڑا بٹن دبانا ہے۔`)}</li>
          </ol>
          <div className="flex items-center gap-2">
            <code dir="ltr" className="block min-w-0 truncate rounded-lg bg-stone-100 px-2 py-1 text-xs text-stone-700">{link}</code>
            <CopyButton text={link} />
          </div>
          <p className="text-xs text-stone-500">
            {t(`This link is private: anyone who has it can talk as ${nickname}. Share it only with them.`, `یہ لنک نجی ہے: جس کے پاس ہو وہ ${nickname} بن کر بات کر سکتا ہے۔ صرف انہیں دیں۔`)}
          </p>
          {!parent.isDemo && (
            <form action={renewTalkLink.bind(null, parent.id)}>
              <button type="submit" className="text-xs font-medium text-rose-700 underline-offset-2 hover:underline">
                {t("Lost the phone? Make a new link (the old one stops working)", "فون گم ہو گیا؟ نیا لنک بنائیں (پرانا بند ہو جائے گا)")}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
