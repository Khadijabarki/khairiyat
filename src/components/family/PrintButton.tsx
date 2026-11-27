"use client";

import { useLang } from "../i18n/LangProvider";

// Opens the browser's print window, where "Save as PDF" makes a file to send the doctor.
export default function PrintButton() {
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
    >
      🖨 {t("Print or save as PDF", "پرنٹ کریں یا PDF بنائیں")}
    </button>
  );
}
