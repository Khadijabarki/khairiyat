import type { Metadata } from "next";
import { Suspense } from "react";
import ParentForm, { EMPTY_PARENT } from "@/components/family/ParentForm";
import { requireUser } from "@/lib/auth";
import { createParent } from "../actions";
import { getT } from "@/lib/i18n-server";
import SidePanel from "@/components/ui/SidePanel";
import BackLink from "@/components/ui/BackLink";

export const metadata: Metadata = { title: "Add Family Member · Khairiyat", robots: { index: false, follow: false } };
export const instant = false;

export default function NewParentPage() {
  return (
    <main className="ui-page">
      <div className="mx-auto max-w-2xl lg:max-w-5xl">
        <Suspense fallback={<p className="text-stone-500">…</p>}>
          <SignedInForm />
        </Suspense>
      </div>
    </main>
  );
}

async function SignedInForm() {
  const user = await requireUser();
  const t = await getT();
  return (
    <>
      <BackLink href="/family" label={t("Back", "واپس")} />
      <h1 className="mt-1 text-3xl font-semibold text-stone-900">{t("Add a Family Member", "والدین شامل کریں")}</h1>
      <p className="mt-1 text-stone-600">{t("Takes about two minutes. You can change everything later.", "تقریباً دو منٹ لگیں گے۔ بعد میں سب کچھ بدلا جا سکتا ہے۔")}</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ParentForm action={createParent} values={EMPTY_PARENT} defaultChildName={user.name} submitLabel={t("Save and get their link", "محفوظ کریں اور لنک لیں")} />
        <SidePanel
          title={t("Care That Feels Like Family", "اپنوں جیسا خیال")}
          points={[
            t("Add anyone you care for: a parent, a sister, Phuppo or Chacha.", "کسی بھی اپنے کو شامل کریں: والدین، بہن، پھوپھو یا چچا۔"),
            t("Khairiyat calls them by the name you use.", "خیریت انہیں اسی نام سے پکارتی ہے جو آپ لیتے ہیں۔"),
            t("You get a link to open on their phone.", "ان کے فون کے لیے ایک لنک ملے گا۔"),
          ]}
        />
      </div>
    </>
  );
}
