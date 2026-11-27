import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ParentForm, { EMPTY_PARENT } from "@/components/family/ParentForm";
import { requireUser } from "@/lib/auth";
import { createParent } from "../actions";
import { getT } from "@/lib/i18n-server";

export const metadata: Metadata = { title: "Add a parent · Khairiyat", robots: { index: false, follow: false } };
export const instant = false;

export default function NewParentPage() {
  return (
    <main className="ui-page">
      <div className="mx-auto max-w-2xl">
        <Suspense fallback={<p className="text-stone-500">…</p>}>
          <SignedInForm />
        </Suspense>
      </div>
    </main>
  );
}

async function SignedInForm() {
  await requireUser();
  const t = await getT();
  return (
    <>
      <Link href="/family" className="text-sm text-stone-500 hover:underline">{t("← Your family", "→ آپ کا خاندان")}</Link>
      <h1 className="mt-1 text-3xl font-semibold text-stone-900">{t("Add a Family Member", "والدین شامل کریں")}</h1>
      <p className="mt-1 text-stone-600">{t("Takes about two minutes. You can change everything later.", "تقریباً دو منٹ لگیں گے۔ بعد میں سب کچھ بدلا جا سکتا ہے۔")}</p>
      <div className="mt-6">
        <ParentForm action={createParent} values={EMPTY_PARENT} submitLabel={t("Save and get their link", "محفوظ کریں اور لنک لیں")} />
      </div>
    </>
  );
}
