"use client";

// One voice message from a parent: play it (which marks it as heard) or delete it.
import { useTransition } from "react";
import { heardParentMessage, removeParentMessage } from "@/app/family/actions";

type Props = { parentId: string; messageId: string; label: string; heard: boolean };

export default function ParentMessagePlayer({ parentId, messageId, label, heard }: Props) {
  const [busy, startTransition] = useTransition();
  return (
    <li className="rounded-xl border border-stone-200 p-3">
      <p className="flex flex-wrap items-center gap-2 text-sm text-stone-700">
        {label}
        {!heard && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">New</span>}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {/* preload="none": the recording is only downloaded when someone presses play */}
        <audio
          controls
          preload="none"
          src={`/family/${parentId}/messages/${messageId}`}
          className="w-full max-w-sm"
          aria-label={label}
          onPlay={() => {
            if (!heard) startTransition(() => heardParentMessage(parentId, messageId));
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm("Delete this voice message? This can't be undone.")) {
              startTransition(() => removeParentMessage(parentId, messageId));
            }
          }}
          className="text-sm font-medium text-stone-600 underline-offset-2 hover:underline disabled:opacity-60"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
