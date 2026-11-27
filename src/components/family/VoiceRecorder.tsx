"use client";

// "Voice message": the son or daughter records up to a minute, listens, and sends it.
// Khairiyat plays it to the parent at the start of their next conversation.
import { useEffect, useRef, useState, useTransition } from "react";
import { removeVoiceMessage, sendVoiceMessage } from "@/app/family/actions";
import { MAX_VOICE_BYTES, MAX_VOICE_SECONDS } from "@/lib/voice-rules";
import { useLang } from "../i18n/LangProvider";

type Recording = { blob: Blob; url: string; seconds: number };

const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];

type Props = {
  parentId: string;
  nickname: string;
  waiting: boolean; // a message was sent and hasn't been heard yet
};

export default function VoiceRecorder({ parentId, nickname, waiting }: Props) {
  const { t } = useLang();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<Recording | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, startTransition] = useTransition();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);

  // Leaving the page switches the microphone off.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    };
  }, []);

  // Free the previous recording's preview when it is replaced or the page is left.
  useEffect(() => {
    if (!result) return;
    return () => URL.revokeObjectURL(result.url);
  }, [result]);

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function record() {
    if (startingRef.current || recording) return;
    startingRef.current = true;
    setProblem("");
    try {
      const mimeType = RECORDING_TYPES.find((t) => window.MediaRecorder?.isTypeSupported(t));
      if (!mimeType) return setProblem(t("This browser can't record audio. Try Chrome.", "اس براؤزر پر ریکارڈنگ نہیں ہو سکتی۔ Chrome استعمال کریں۔"));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const release = () => stream.getTracks().forEach((t) => t.stop());
      if (!mountedRef.current) return release();

      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32_000 });
      const chunks: Blob[] = [];
      const startedAt = Date.now();
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => {
        release();
        if (!mountedRef.current) return;
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType });
        const seconds = Math.min(MAX_VOICE_SECONDS, Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
        if (!blob.size || blob.size > MAX_VOICE_BYTES) return setProblem(t("The recording didn't work. Please try again.", "ریکارڈنگ نہیں ہو سکی۔ دوبارہ کوشش کریں۔"));
        setResult({ blob, url: URL.createObjectURL(blob), seconds });
      };
      recorderRef.current = recorder;
      recorder.start();
      setResult(null);
      setElapsed(0);
      setRecording(true);
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(s);
        if (s >= MAX_VOICE_SECONDS) stop();
      }, 500);
    } catch {
      setProblem(t("Allow the microphone for this site, then try again.", "اس سائٹ کو مائیک کی اجازت دیں، پھر کوشش کریں۔"));
    } finally {
      startingRef.current = false;
    }
  }

  function send() {
    if (!result) return;
    const form = new FormData();
    form.set("audio", new File([result.blob], "message", { type: result.blob.type }));
    form.set("seconds", String(result.seconds));
    startTransition(async () => {
      try {
        const { ok, error } = await sendVoiceMessage(parentId, form);
        if (ok) setResult(null);
        setProblem(ok ? "" : (error ?? t("Could not send. Please try again.", "بھیجا نہیں جا سکا۔ دوبارہ کوشش کریں۔")));
      } catch {
        setProblem(t("Could not send. Check the internet and try again.", "بھیجا نہیں جا سکا۔ انٹرنیٹ دیکھ کر دوبارہ کوشش کریں۔"));
      }
    });
  }

  const primary = "ui-btn ui-btn-primary";
  const secondary = "text-sm font-medium text-stone-600 underline-offset-2 hover:underline disabled:opacity-60";

  return (
    <div className="mt-3 space-y-3">
      {result && <audio controls src={result.url} className="w-full max-w-sm" aria-label={t("Your recording", "آپ کی ریکارڈنگ")} />}
      <div className="flex flex-wrap items-center gap-4">
        {recording ? (
          <button type="button" onClick={stop} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
            ■ {t("Stop", "روکیں")} <bdi dir="ltr">({elapsed}s / {MAX_VOICE_SECONDS}s)</bdi>
          </button>
        ) : result ? (
          <>
            <button type="button" onClick={send} disabled={busy} className={primary}>
              {busy ? t("Sending…", "بھیجا جا رہا ہے…") : t(`Send to ${nickname}`, `${nickname} کو بھیجیں`)}
            </button>
            <button type="button" onClick={record} disabled={busy} className={secondary}>
              {t("Record again", "دوبارہ ریکارڈ کریں")}
            </button>
            {/* Not happy with it: throw the recording away without sending. */}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setResult(null);
                setProblem("");
              }}
              className="text-sm font-medium text-rose-700 underline-offset-2 hover:underline disabled:opacity-60"
            >
              🗑 {t("Delete", "حذف کریں")}
            </button>
          </>
        ) : (
          <button type="button" onClick={record} disabled={busy} className={primary}>
            🎙 {t("Record a message", "پیغام ریکارڈ کریں")}
          </button>
        )}
        {waiting && !recording && !result && (
          <button
            type="button"
            disabled={busy}
            onClick={() => startTransition(() => removeVoiceMessage(parentId))}
            className={secondary}
          >
            {t("Delete the waiting message", "انتظار والا پیغام حذف کریں")}
          </button>
        )}
      </div>
      {problem && <p role="alert" className="text-sm text-rose-700">{problem}</p>}
    </div>
  );
}
