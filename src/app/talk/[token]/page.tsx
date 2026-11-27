import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import TalkScreen from "@/components/TalkScreen";
import { vapidPublicKey } from "@/lib/push";
import { getParentByTalkToken } from "@/lib/data";
import { isValidTalkToken } from "@/lib/security";

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
export default function TalkPage({ params }: PageProps<"/talk/[token]">) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-amber-50" />}>
      <ParentTalkScreen params={params} />
    </Suspense>
  );
}

async function ParentTalkScreen({ params }: { params: PageProps<"/talk/[token]">["params"] }) {
  const { token } = await params;
  const parent = await getParentByTalkToken(token);
  if (!parent) notFound();

  return (
    <TalkScreen
      talkToken={parent.talkToken}
      nickname={parent.nickname}
      nicknameUr={parent.nicknameUr}
      childNameUr={parent.childNameUr}
      childPhone={parent.childPhone}
      vapidPublicKey={vapidPublicKey()}
    />
  );
}
