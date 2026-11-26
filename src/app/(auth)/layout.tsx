import Link from "next/link";

// Shared frame for the sign-in and sign-up pages.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-stone-50 px-4 py-10 text-stone-800">
      <Link href="/" className="text-center">
        <span className="font-urdu block text-4xl leading-[1.9] text-emerald-800">خیریت</span>
        <span className="text-sm font-semibold tracking-wide text-stone-700">Khairiyat</span>
      </Link>
      <div className="mt-6 flex w-full max-w-sm flex-col gap-4">{children}</div>
    </main>
  );
}
