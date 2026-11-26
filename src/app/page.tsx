import Link from "next/link";

// Simple start page. The family dashboard link will be added in a later step.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-amber-50 px-4 text-center">
      <div>
        <h1 className="font-urdu text-5xl leading-[1.8] text-emerald-800">خیریت</h1>
        <p className="mt-2 text-xl font-semibold text-stone-800">Khairiyat</p>
        <p className="mt-2 max-w-md text-stone-600">
          An AI that checks on elderly parents every day in Urdu and keeps their family informed.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/talk/ammi"
          className="rounded-full bg-emerald-600 px-8 py-3 text-lg font-medium text-white shadow-lg hover:bg-emerald-700"
        >
          Ammi&apos;s screen (daughter&apos;s voice)
        </Link>
        <Link
          href="/talk/abbu"
          className="rounded-full bg-sky-700 px-8 py-3 text-lg font-medium text-white shadow-lg hover:bg-sky-800"
        >
          Abbu&apos;s screen (son&apos;s voice)
        </Link>
      </div>
    </main>
  );
}
