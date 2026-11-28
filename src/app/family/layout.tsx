import { Suspense } from "react";
import LangShell from "@/components/i18n/LangShell";
import Loading from "@/components/ui/Loading";

// All family pages can be shown in English or Urdu.
export default function FamilyLayout({ children }: LayoutProps<"/family">) {
  return (
    <Suspense fallback={<Loading full />}>
      <LangShell background="bg-cream" nav>{children}</LangShell>
    </Suspense>
  );
}
