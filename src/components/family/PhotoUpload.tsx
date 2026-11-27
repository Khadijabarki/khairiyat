"use client";

// Choose, change or remove a family member's photo. The picture is cropped to a square and
// made small in the browser, so only a light copy is ever sent.
import { useRef, useState, useTransition } from "react";
import { removePhoto, uploadPhoto } from "@/app/family/actions";
import { PHOTO_SIZE } from "@/lib/photo-rules";
import { useLang } from "../i18n/LangProvider";
import Icon from "../ui/Icon";

async function toSquareJpeg(file: File): Promise<Blob> {
  const image = await createImageBitmap(file);
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PHOTO_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas");
  context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  image.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("no image");
  return blob;
}

export default function PhotoUpload({ parentId, hasPhoto }: { parentId: string; hasPhoto: boolean }) {
  const { t } = useLang();
  const [busy, startTransition] = useTransition();
  const [problem, setProblem] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function choose(file: File | undefined) {
    if (!file) return;
    setProblem("");
    startTransition(async () => {
      try {
        const form = new FormData();
        form.set("photo", new File([await toSquareJpeg(file)], "photo.jpg", { type: "image/jpeg" }));
        const { ok, error } = await uploadPhoto(parentId, form);
        if (!ok) setProblem(error ?? "");
      } catch {
        setProblem(t("This picture couldn't be used. Please try another.", "یہ تصویر استعمال نہیں ہو سکی۔ دوسری آزمائیں۔"));
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" id={`photo-${parentId}`} onChange={(e) => choose(e.target.files?.[0])} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="ui-btn ui-btn-secondary">
          <Icon name="camera" className="size-4" />
          {busy ? t("Please wait…", "انتظار کریں…") : hasPhoto ? t("Change Photo", "تصویر بدلیں") : t("Add Photo", "تصویر لگائیں")}
        </button>
        {hasPhoto && (
          <button type="button" disabled={busy} onClick={() => startTransition(() => removePhoto(parentId))} className="ui-btn ui-btn-danger">
            {t("Remove", "ہٹائیں")}
          </button>
        )}
      </div>
      {problem && <p role="alert" className="text-sm text-rose-700">{problem}</p>}
    </div>
  );
}
