import BackLink from "@/components/ui/BackLink";

// A wrong or old link: say so kindly and offer the way back.
export default function NotFound() {
  return (
    <main className="ui-page flex flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-3xl font-semibold text-stone-900">Page Not Found</h1>
      <p lang="ur" dir="rtl" className="font-urdu text-xl leading-[2.2] text-stone-700">یہ صفحہ نہیں ملا۔</p>
      <p className="max-w-sm text-stone-600">This link may be old or mistyped.</p>
      <BackLink href="/" label="Back to Home" />
    </main>
  );
}
