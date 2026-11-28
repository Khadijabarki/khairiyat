"use client";

import { useActionState } from "react";
import type { CallNowState } from "@/app/family/actions";
import { useLang } from "../i18n/LangProvider";
import { CallIcon } from "../ui/Icon";

type Props = {
  action: (state: CallNowState) => Promise<CallNowState>;
  nickname: string;
  busy: "ringing" | "talking" | null; // a call is going on right now
  note: string; // the line under the button, from the call's current state
};

// "Call Ammi now" button on the family dashboard. It is blocked while a call is ringing or
// being talked on; the line under it always follows what the server says right now.
export default function CallNowButton({ action, nickname, busy, note }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const { t } = useLang();
  const label =
    busy === "ringing"
      ? t("Ringing…", "گھنٹی بج رہی ہے…")
      : busy === "talking"
        ? t("Call in progress", "کال جاری ہے")
        : pending
          ? t("Calling…", "کال جا رہی ہے…")
          : t(`Call ${nickname} now`, `${nickname} کو ابھی کال کریں`);
  // Only problems come back from the action; they are hidden once a call is going on.
  const problem = !busy && !pending && !state.ok ? state.message : undefined;
  return (
    <form action={formAction} className="flex max-w-xs flex-col items-start gap-1">
      <button type="submit" disabled={pending || busy !== null} className="ui-btn ui-btn-primary">
        <CallIcon className="size-4" />
        {label}
      </button>
      <p role="status" className={`text-sm ${problem ? "text-rose-700" : "text-emerald-800"}`}>
        {problem ?? note}
      </p>
    </form>
  );
}
