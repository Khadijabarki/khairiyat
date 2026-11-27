"use client";

import { useActionState } from "react";
import type { CallNowState } from "@/app/family/actions";
import { useLang } from "../i18n/LangProvider";

// "Call Ammi now" button on the family dashboard.
export default function CallNowButton({ action, nickname }: { action: (state: CallNowState) => Promise<CallNowState>; nickname: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const { t } = useLang();
  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? t("Calling…", "کال جا رہی ہے…") : t(`📞 Call ${nickname} now`, `📞 ${nickname} کو ابھی کال کریں`)}
      </button>
      {state.message && (
        <p role="status" className={`text-sm ${state.ok ? "text-emerald-800" : "text-rose-700"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
