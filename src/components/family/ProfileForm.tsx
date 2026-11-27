"use client";

// Edit the name shown in the app.
import { useActionState } from "react";
import { updateName, type AuthState } from "@/app/(auth)/actions";
import { useLang } from "../i18n/LangProvider";

export default function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(updateName, {});
  const { t } = useLang();
  return (
    <form action={action} className="mt-3">
      <label htmlFor="full_name" className="block text-sm font-medium text-stone-700">{t("Your Name", "آپ کا نام")}</label>
      <div className="flex flex-wrap items-end gap-3">
        <input id="full_name" name="full_name" required maxLength={60} autoComplete="name" defaultValue={name} className="ui-input min-w-0 flex-1" />
        <button type="submit" disabled={pending} className="ui-btn ui-btn-primary">
          {pending ? t("Saving…", "محفوظ ہو رہا ہے…") : t("Save Name", "نام محفوظ کریں")}
        </button>
      </div>
      {state.error && <p role="alert" className="mt-2 text-sm text-rose-700">{state.error}</p>}
      {state.info && <p role="status" className="mt-2 text-sm font-medium text-emerald-800">{state.info}</p>}
    </form>
  );
}
