"use client";

import { useState } from "react";
import { useLang } from "../i18n/LangProvider";

// Copies text to the clipboard and briefly shows "Copied".
export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked (e.g. not https): the link is still visible to copy by hand.
        }
      }}
      className="shrink-0 rounded-lg border border-stone-300 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100"
    >
      {copied ? t("Copied ✓", "کاپی ہو گیا ✓") : t("Copy", "کاپی")}
    </button>
  );
}
