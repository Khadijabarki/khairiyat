import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cookies } from "next/headers";
import LangProvider from "@/components/i18n/LangProvider";
import TalkScreen from "@/components/TalkScreen";
import { TALK_LANG_COOKIE, readLang } from "@/lib/i18n";
import { vapidPublicKey } from "@/lib/push";
import { getParentByTalkToken } from "@/lib/data";
import { isValidTalkToken } from "@/lib/security";
import { currentUser } from "@/lib/auth";

// Each parent's page links to their own app manifest, so "add to home screen" installs
// an app that opens straight to this screen. noindex: never in search results.
export async function generateMetadata({ params }: PageProps<"/talk/[token]">): Promise<Metadata> {
  const { token } = await params;
  return {
    title: "خیریت",
    robots: { index: false, follow: false },
    manifest: isValidTalkToken(token) ? `/talk/${token}/manifest.webmanifest` : undefined,
    icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
    appleWebApp: { capable: true, title: "خیریت", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = { themeColor: "#047857" };

// Opened directly from a link, QR code or home-screen icon, and looked up on every visit.
export const instant = false;

// The parent's screen: one big button to start the daily conversation.
// The link contains a long random token, so only the family who shared it can open it.
export default function TalkPage({ params, searchParams }: PageProps<"/talk/[token]">) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-amber-50" />}>
      <ParentTalkScreen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

type ScreenProps = Pick<PageProps<"/talk/[token]">, "params" | "searchParams">;

async function ParentTalkScreen({ params, searchParams }: ScreenProps) {
  const { token } = await params;
  const parent = await getParentByTalkToken(token);
  if (!parent) notFound();
  const lang = readLang((await cookies()).get(TALK_LANG_COOKIE)?.value, "ur");
  // "Back" appears only when the family opened this screen from their dashboard. The shared
  // link, the QR code, a call and the installed app show just the talk screen, even on a
  // phone where the family is signed in.
  const fromDashboard = (await searchParams).from === "family";
  const viewer = fromDashboard ? await currentUser() : null;
  const backHref = viewer?.id === parent.familyId ? `/family/${parent.id}` : null;

  return (
    <LangProvider lang={lang}>
    <TalkScreen
      talkToken={parent.talkToken}
      nickname={parent.nickname}
      nicknameUr={parent.nicknameUr}
      childNameUr={parent.childNameUr}
      childPhone={parent.childPhone}
      vapidPublicKey={vapidPublicKey()}
      canSendMessage={!parent.isDemo}
      nameEn={parent.nickname}
      childNameEn={parent.childName}
      backHref={backHref}
    />
    </LangProvider>
  );
}
