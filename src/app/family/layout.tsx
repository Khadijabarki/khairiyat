import { Suspense } from "react";
import LangShell from "@/components/i18n/LangShell";

// All family pages can be shown in English or Urdu.
export default function FamilyLayout({ children }: LayoutProps<"/family">) {
  return (
    <Suspense fallback={<main className="ui-page" />}>
      <LangShell background="bg-cream" nav>{children}</LangShell>
    </Suspense>
  );
}
