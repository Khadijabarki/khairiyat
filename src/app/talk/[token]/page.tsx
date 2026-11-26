import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import TalkScreen from "@/components/TalkScreen";
import { getParentByTalkToken } from "@/lib/data";

// noindex: a parent's personal talk page must never show up in search results.
export const metadata: Metadata = { title: "Khairiyat", robots: { index: false, follow: false } };

// Opened directly from a link or QR code (not by navigating inside the app),
// and looked up in the database on every visit.
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
    />
  );
}
