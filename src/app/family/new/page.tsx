import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ParentForm, { EMPTY_PARENT } from "@/components/family/ParentForm";
import { requireUser } from "@/lib/auth";
import { createParent } from "../actions";

export const metadata: Metadata = { title: "Add a parent · Khairiyat", robots: { index: false, follow: false } };
export const instant = false;

export default function NewParentPage() {
  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-800">
      <div className="mx-auto max-w-2xl">
        <Link href="/family" className="text-sm text-stone-500 hover:underline">← Your family</Link>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">Add a parent</h1>
        <p className="mt-1 text-stone-600">Takes about two minutes. You can change everything later.</p>
        <div className="mt-6">
          <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
            <SignedInForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function SignedInForm() {
  await requireUser();
  return <ParentForm action={createParent} values={EMPTY_PARENT} submitLabel="Save and get their link" />;
}
