"use client";

// The parent's own voice message to their son or daughter. It is separate from talking with
// Khairiyat: the recording goes straight to the family and the AI never hears it.
// Big Urdu buttons: record -> stop -> listen -> send.
import { useEffect, useRef, useState } from "react";
import { MAX_VOICE_BYTES, MAX_VOICE_SECONDS } from "@/lib/voice-rules";
import { useLang } from "../i18n/LangProvider";

type Step = "idle" | "recording" | "review" | "sending" | "sent";
type Recording = { blob: Blob; url: string; seconds: number };

const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];

type Props = {
  talkToken: string;
  childName: string;
  afterCall: boolean; // a conversation has just ended: invite them to send a message too
  onBusyChange: (busy: boolean) => void; // true while the microphone or a recording is in use
};

export default function ParentMessage({ talkToken, childName, afterCall, onBusyChange }: Props) {
  const { t } = useLang();
  const [step, setStep] = useState<Step>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [problem, setProblem] = useState<[en: string, ur: string] | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);

  const busy = step === "recording" || step === "review" || step === "sending";
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);

  // Leaving the screen (or starting a conversation) switches the microphone off.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    return () => URL.revokeObjectURL(recording.url);
  }, [recording]);

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function record() {
    if (startingRef.current) return;
    startingRef.current = true;
    setProblem(null);
    try {
      const mimeType = RECORDING_TYPES.find((t) => window.MediaRecorder?.isTypeSupported(t));
      if (!mimeType) return setProblem(["This phone can't record a message.", "اس فون پر پیغام ریکارڈ نہیں ہو سکتا۔"]);
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
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType });
        const seconds = Math.min(MAX_VOICE_SECONDS, Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
        if (!blob.size || blob.size > MAX_VOICE_BYTES) {
          setProblem(["The recording didn't work. Please try again.", "ریکارڈنگ نہیں ہو سکی۔ دوبارہ کوشش کریں۔"]);
          return setStep("idle");
        }
        setRecording({ blob, url: URL.createObjectURL(blob), seconds });
        setStep("review");
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(null);
      setElapsed(0);
      setStep("recording");
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(s);
        if (s >= MAX_VOICE_SECONDS) stop();
      }, 500);
    } catch {
      setProblem(["The microphone isn't allowed. Please allow it in the browser.", "مائیک کی اجازت نہیں ملی۔ براؤزر میں مائیک کی اجازت دیں۔"]);
    } finally {
      startingRef.current = false;
    }
  }

  async function send() {
    if (!recording) return;
    setStep("sending");
    setProblem(null);
    const form = new FormData();
    form.set("talkToken", talkToken);
    form.set("audio", new File([recording.blob], "message", { type: recording.blob.type }));
    form.set("seconds", String(recording.seconds));
    try {
      const res = await fetch("/api/parent-message", { method: "POST", body: form, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error("not sent");
      if (!mountedRef.current) return;
      setRecording(null);
      setStep("sent");
    } catch {
      if (!mountedRef.current) return;
      setProblem(["The message didn't go. Check the internet and send it again.", "پیغام نہیں جا سکا۔ انٹرنیٹ دیکھ کر دوبارہ بھیجیں۔"]);
      setStep("review"); // the recording is still here
    }
  }

  const big = "w-full rounded-2xl px-5 py-2 text-[clamp(1.1rem,5vw,1.35rem)] leading-[2] shadow active:scale-95 disabled:opacity-60";
  const small = "px-3 text-[clamp(1rem,4.2vw,1.15rem)] leading-[2.2] text-stone-600 underline disabled:opacity-60";
  const note = "text-[clamp(0.9rem,3.8vw,1.05rem)] leading-[2.2] text-stone-600";

  return (
    <div className="w-full max-w-md space-y-2 rounded-3xl border border-sky-200 bg-white/80 p-3 text-center">
      {step === "sent" && (
        <p role="status" className="text-[clamp(1rem,4.5vw,1.2rem)] leading-[2.2] text-emerald-800">
          ✓ {t(`Your message was sent to ${childName}.`, `آپ کا پیغام ${childName} کو بھیج دیا گیا۔`)}
        </p>
      )}
      {(step === "idle" || step === "sent") && (
        <>
          {step === "idle" && (
            <p className={note}>
              {afterCall
                ? t(`Talk finished. If you like, also send ${childName} a message in your voice.`, `بات ہو گئی۔ اب چاہیں تو ${childName} کو اپنی آواز میں پیغام بھی بھیجیں۔`)
                : t(`This is separate from talking with Khairiyat. The message goes straight to ${childName}.`, `خیریت سے بات الگ ہے۔ یہ پیغام سیدھا ${childName} کو جائے گا۔`)}
            </p>
          )}
          <button type="button" onClick={record} className={`${big} bg-sky-700 text-white`}>
            🎙 {t(`Voice message to ${childName}`, `${childName} کو آواز کا پیغام`)}
          </button>
        </>
      )}
      {step === "recording" && (
        <>
          <p role="status" className={note}>
            {t("Speak…", "بولیں…")} <bdi dir="ltr">{elapsed} / {MAX_VOICE_SECONDS}</bdi>
          </p>
          <button type="button" onClick={stop} className={`${big} bg-rose-600 text-white`}>
            ■ {t("Stop recording", "ریکارڈنگ ختم کریں")}
          </button>
        </>
      )}
      {(step === "review" || step === "sending") && recording && (
        <>
          <audio controls src={recording.url} className="w-full" aria-label={t("Your message", "آپ کا پیغام")} />
          <button type="button" onClick={send} disabled={step === "sending"} className={`${big} bg-emerald-700 text-white`}>
            {step === "sending" ? t("Sending…", "بھیجا جا رہا ہے…") : t(`📤 Send to ${childName}`, `📤 ${childName} کو بھیجیں`)}
          </button>
          <div className="flex justify-center gap-4">
            <button type="button" onClick={record} disabled={step === "sending"} className={small}>
              {t("Record again", "دوبارہ بولیں")}
            </button>
            <button
              type="button"
              onClick={() => {
                setRecording(null);
                setProblem(null);
                setStep("idle");
              }}
              disabled={step === "sending"}
              className={small}
            >
              🗑 {t("Delete", "حذف کریں")}
            </button>
          </div>
        </>
      )}
      {problem && <p role="alert" className="text-sm leading-[2.2] text-rose-700">{t(...problem)}</p>}
    </div>
  );
}
