import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ParentForm from "@/components/family/ParentForm";
import { requireUser } from "@/lib/auth";
import { getFamilyParent } from "@/lib/data";
import { deleteParent, updateParent } from "../../actions";
import { getLang } from "@/lib/i18n-server";
import { parentNames, translator } from "@/lib/i18n";

export const metadata: Metadata = { title: "Edit · Khairiyat", robots: { index: false, follow: false } };
export const instant = false;

export default function EditParentPage({ params }: PageProps<"/family/[parentId]/edit">) {
  return (
    <main className="min-h-dvh bg-stone-50 px-4 py-6 text-stone-800">
      <div className="mx-auto max-w-2xl">
        <Suspense fallback={<p className="text-stone-500">…</p>}>
          <EditForm params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function EditForm({ params }: { params: PageProps<"/family/[parentId]/edit">["params"] }) {
  const { parentId } = await params;
  const user = await requireUser();
  const parent = await getFamilyParent(user.id, parentId); // only this family's parents
  if (!parent) notFound();
  const lang = await getLang();
  const t = translator(lang);
  const { nickname } = parentNames(parent, lang);

  return (
    <>
      <Link href={`/family/${parent.id}`} className="text-sm text-stone-500 hover:underline">{lang === "ur" ? "→" : "←"} {nickname}</Link>
      <h1 className="mt-1 text-2xl font-semibold text-stone-900">{t(`Edit ${nickname}`, `${nickname} کی معلومات بدلیں`)}</h1>
      {parent.isDemo && (
        <p className="mt-3 rounded-xl bg-amber-100 p-3 text-sm text-amber-900">
          {t("This is a demo parent, so changes can't be saved. Create your own account to add your parents.", "یہ ڈیمو والدین ہیں، تبدیلی محفوظ نہیں ہوگی۔ اپنے والدین کے لیے اپنا اکاؤنٹ بنائیں۔")}
        </p>
      )}
      <div className="mt-6">
        <ParentForm
          action={updateParent.bind(null, parent.id)}
          values={{ ...parent, companionGender: parent.companion.gender }}
          submitLabel={t("Save changes", "تبدیلی محفوظ کریں")}
        />
      </div>
      {!parent.isDemo && (
        <form action={deleteParent.bind(null, parent.id)} className="mt-10 rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <h2 className="font-semibold text-rose-900">{t(`Remove ${nickname}`, `${nickname} کو ہٹائیں`)}</h2>
          <p className="mt-1 text-sm text-rose-900">
            {t(`Deletes ${nickname} and all their check-ins for good. Their talk link stops working.`, `${nickname} اور ان کی تمام باتیں ہمیشہ کے لیے حذف ہو جائیں گی۔ ان کا لنک بند ہو جائے گا۔`)}
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm text-rose-900">
            <input type="checkbox" required className="size-4 accent-rose-700" />
            {t(`Yes, remove ${nickname} and all their data`, `ہاں، ${nickname} اور ان کا سارا ڈیٹا ہٹا دیں`)}
          </label>
          <button type="submit" className="mt-3 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100">
            {t("Remove permanently", "ہمیشہ کے لیے ہٹائیں")}
          </button>
        </form>
      )}
    </>
  );
}
