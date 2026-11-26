import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TalkScreen from "@/components/TalkScreen";
import { getParent, getParents } from "@/lib/data";

// noindex: a parent's personal talk page must never show up in Google search results.
export const metadata: Metadata = { title: "Khairiyat", robots: { index: false, follow: false } };

// This page is opened directly from a link or QR code, not by navigating inside the app,
// so it doesn't need Next.js's "instant navigation" check (which warned about reading params).
export const instant = false;

// Build the demo parents' pages ahead of time (/talk/ammi and /talk/abbu).
export async function generateStaticParams() {
  const parents = await getParents();
  return parents.map((p) => ({ parentId: p.id }));
}

// The parent's screen: one big button to start the daily conversation.
// Later this link is opened once on the parent's phone (for example from a QR code).
export default async function TalkPage({ params }: PageProps<"/talk/[parentId]">) {
  const { parentId } = await params;
  const parent = await getParent(parentId);
  if (!parent) notFound();

  return (
    <TalkScreen
      parentId={parent.id}
      nickname={parent.nickname}
      nicknameUr={parent.nicknameUr}
      childNameUr={parent.childNameUr}
      childPhone={parent.childPhone}
    />
  );
}
