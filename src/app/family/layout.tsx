import { Suspense } from "react";
import LangShell from "@/components/i18n/LangShell";

// All family pages can be shown in English or Urdu.
export default function FamilyLayout({ children }: LayoutProps<"/family">) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-stone-50" />}>
      <LangShell background="bg-stone-50">{children}</LangShell>
    </Suspense>
  );
}
