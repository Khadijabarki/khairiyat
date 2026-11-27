// "Medicine Reminders": what the family listed, when Khairiyat calls about each one, and
// what was reported in the latest check-in.
import Link from "next/link";
import type { Parent } from "@/lib/data";
import { getLang } from "@/lib/i18n-server";
import { translator } from "@/lib/i18n";
import SectionHeading from "../ui/SectionHeading";

export default async function MedicineCard({ parent, latestTaken }: { parent: Parent; latestTaken: boolean | null }) {
  const t = translator(await getLang());
  return (
    <section className="ui-card mt-5 p-5">
      <SectionHeading
        icon="pill"
        title={t("Medicine Reminders", "دوائی کی یاد دہانی")}
        description={
          latestTaken === null
            ? undefined
            : latestTaken
              ? t("Latest check-in: medicine taken.", "تازہ بات: دوائی لے لی۔")
              : t("Latest check-in: medicine missed.", "تازہ بات: دوائی رہ گئی۔")
        }
        action={
          <Link href={`/family/${parent.id}/edit`} className="text-sm font-semibold text-emerald-700 hover:underline">
            {t("Manage", "تبدیل کریں")}
          </Link>
        }
      />
      {parent.medicines.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">{t("No medicines added yet.", "ابھی کوئی دوائی شامل نہیں۔")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-stone-200">
          {parent.medicines.map((m, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p dir="auto" className="font-semibold text-stone-900">{m.name}</p>
                {m.when && <p dir="auto" className="text-sm text-stone-600">{m.when}</p>}
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${m.time ? "bg-emerald-100 text-emerald-900" : "bg-stone-100 text-stone-600"}`}>
                {m.time ? <bdi dir="ltr">{m.time}</bdi> : t("No call time", "کال کا وقت نہیں")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
