"use client";

import { useLang } from "../i18n/LangProvider";
import Icon from "../ui/Icon";

// Opens the browser's print window, where "Save as PDF" makes a file to send the doctor.
export default function PrintButton() {
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="ui-btn ui-btn-primary !min-h-10"
    >
      <Icon name="report" className="size-4" />
      {t("Print or save as PDF", "پرنٹ کریں یا PDF بنائیں")}
    </button>
  );
}
