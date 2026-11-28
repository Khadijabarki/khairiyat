import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ParentForm from "@/components/family/ParentForm";
import { requireUser } from "@/lib/auth";
import { getFamilyParent } from "@/lib/data";
import { deleteParent, updateParent } from "../../actions";
import PhotoUpload from "@/components/family/PhotoUpload";
import Avatar from "@/components/ui/Avatar";
import { photoUrls } from "@/lib/photos";
import { getLang } from "@/lib/i18n-server";
import { parentNames, translator } from "@/lib/i18n";
import SidePanel from "@/components/ui/SidePanel";
import BackLink from "@/components/ui/BackLink";

export const metadata: Metadata = { title: "Edit · Khairiyat", robots: { index: false, follow: false } };
export const instant = false;

export default function EditParentPage({ params }: PageProps<"/family/[parentId]/edit">) {
  return (
    <main className="ui-page">
      <div className="mx-auto max-w-2xl lg:max-w-5xl">
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
  const photos = await photoUrls([parent.id]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div className="min-w-0">
      <BackLink href={`/family/${parent.id}`} label={t("Back", "واپس")} />
      <h1 className="mt-1 text-3xl font-semibold text-stone-900">{t(`Edit ${nickname}`, `${nickname} کی معلومات بدلیں`)}</h1>
      {parent.isDemo && (
        <p className="mt-3 rounded-xl bg-amber-100 p-3 text-sm text-amber-900">
          {t("This is a demo profile, so changes can't be saved. Create your own account to add your family.", "یہ ڈیمو پروفائل ہے، تبدیلی محفوظ نہیں ہوگی۔ اپنے گھر والوں کے لیے اپنا اکاؤنٹ بنائیں۔")}
        </p>
      )}
      <section className="ui-card mt-6 flex flex-wrap items-center gap-5 p-5">
        <Avatar name={parent.nickname} gender={parent.gender} photoUrl={photos.urls[parent.id]} size="xl" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-stone-900">{t("Profile Photo", "پروفائل تصویر")}</h2>
          {parent.isDemo ? (
            <p className="text-sm text-stone-600">{t("Photos can't be changed in the shared demo.", "مشترکہ ڈیمو میں تصویر نہیں بدلی جا سکتی۔")}</p>
          ) : !photos.ready ? (
            <p className="text-sm text-amber-900">{t("Photos aren't set up yet: run supabase/schema.sql in Supabase.", "تصویریں ابھی تیار نہیں: Supabase میں supabase/schema.sql چلائیں۔")}</p>
          ) : (
            <div className="mt-2">
              <PhotoUpload parentId={parent.id} hasPhoto={Boolean(photos.urls[parent.id])} />
            </div>
          )}
        </div>
      </section>
      <div className="mt-6">
        <ParentForm
          // Saved changes make a new form, so it never shows the old values.
          key={JSON.stringify(parent)}
          profileName={parent.isDemo ? "" : user.name}
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
          <button type="submit" className="mt-3 ui-btn ui-btn-danger">
            {t("Remove permanently", "ہمیشہ کے لیے ہٹائیں")}
          </button>
        </form>
      )}
    </div>
      <SidePanel
        title={t(`Caring for ${nickname}`, `${nickname} کا خیال`)}
        points={[
          t("Add a photo to find this profile at a glance.", "تصویر لگائیں تو یہ پروفائل ایک نظر میں مل جائے گی۔"),
          t("Set a time for a medicine, and Khairiyat will call then to ask about it.", "دوائی کا وقت لکھیں تو خیریت اس وقت کال کر کے اس کا پوچھے گی۔"),
        ]}
      />
    </div>
  );
}
