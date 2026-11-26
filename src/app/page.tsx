import Link from "next/link";
import { DemoButton } from "@/components/auth/AuthForm";

// Start page: what Khairiyat is, sign in / sign up for families, and a one-click demo.
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-amber-50 px-4 py-10 text-center">
      <div>
        <h1 className="font-urdu text-5xl leading-[1.8] text-emerald-800">خیریت</h1>
        <p className="mt-2 text-xl font-semibold text-stone-800">Khairiyat</p>
        <p className="mx-auto mt-2 max-w-md text-stone-600">
          An AI that checks on elderly parents every day in Urdu, remembers how they feel, and keeps their family
          informed.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/signup" className="rounded-full bg-emerald-700 px-6 py-3 font-medium text-white shadow-lg hover:bg-emerald-800">
          Create a family account
        </Link>
        <Link href="/login" className="rounded-full border border-stone-300 bg-white px-6 py-3 font-medium text-stone-800 hover:bg-stone-50">
          Sign in
        </Link>
      </div>

      <div className="w-full max-w-sm">
        <DemoButton />
        <p className="mt-3 text-sm text-stone-600">
          Or talk to Khairiyat as a demo parent:{" "}
          <Link href="/talk/demo-ammi" className="font-medium text-emerald-800 underline underline-offset-2">Ammi</Link>
          {" · "}
          <Link href="/talk/demo-abbu" className="font-medium text-emerald-800 underline underline-offset-2">Abbu</Link>
        </p>
      </div>
    </main>
  );
}
