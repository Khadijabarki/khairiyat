"use client";

import { useEffect } from "react";
import { useLang } from "../i18n/LangProvider";

// Full-screen "Khairiyat is calling" screen, like a real incoming phone call:
// a ringing sound, vibration (on Android), and big Answer / Later buttons.

// A soft two-tone ring made with the Web Audio API (no sound file needed).
// Browsers may block sound until the screen is touched; vibration and the screen still work.
function startRinging(): () => void {
  let ctx: AudioContext | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  try {
    ctx = new AudioContext();
    const ring = () => {
      if (!ctx) return;
      for (const [start, freq] of [[0, 880], [0.25, 660], [0.5, 880], [0.75, 660]] as const) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + 0.24);
      }
    };
    ctx.resume().catch(() => {});
    ring();
    timer = setInterval(ring, 2500);
  } catch {
    // No audio available: the vibration and the screen are enough.
  }
  if ("vibrate" in navigator) navigator.vibrate([800, 400, 800, 400, 800, 400, 800, 400, 800, 400, 800]);
  return () => {
    if (timer) clearInterval(timer);
    ctx?.close().catch(() => {});
    if ("vibrate" in navigator) navigator.vibrate(0);
  };
}

type Props = {
  childName: string;
  onAnswer: () => void;
  onLater: () => void;
};

export default function IncomingCall({ childName, onAnswer, onLater }: Props) {
  const { lang, t } = useLang();
  const ur = lang === "ur";
  useEffect(() => startRinging(), []);

  return (
    <div
      dir={ur ? "rtl" : "ltr"}
      role="alertdialog"
      aria-label={t("Khairiyat is calling", "خیریت کال کر رہی ہے")}
      className={`${ur ? "font-urdu " : ""}fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-emerald-800 to-emerald-950 px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] text-white`}
    >
      <div className="text-center">
        <p className="text-[clamp(1.1rem,5vw,1.4rem)] leading-[2] text-emerald-200">{t("Incoming call…", "کال آ رہی ہے…")}</p>
        <div className="relative mx-auto mt-6 flex size-[min(48vw,30dvh,12rem)] items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" aria-hidden />
          <span className="relative flex size-full items-center justify-center rounded-full bg-emerald-600 text-[clamp(2rem,10vw,3.2rem)] leading-[2] shadow-2xl">
            خیریت
          </span>
        </div>
        <p className="mt-6 text-[clamp(1.2rem,5.5vw,1.6rem)] leading-[2.1]">{t(`${childName} asked how you are`, `${childName} نے آپ کا حال پوچھا ہے`)}</p>
      </div>

      <div className="flex w-full max-w-sm items-end justify-between gap-6">
        <button onClick={onLater} className="flex flex-1 flex-col items-center gap-1 active:scale-95">
          <span className="flex size-20 items-center justify-center rounded-full bg-rose-600 text-3xl shadow-xl" aria-hidden>
            ✕
          </span>
          <span className="text-[clamp(1.05rem,4.8vw,1.3rem)] leading-[2]">{t("Later", "بعد میں")}</span>
        </button>
        <button onClick={onAnswer} className="flex flex-1 flex-col items-center gap-1 active:scale-95">
          <span className="flex size-24 animate-bounce items-center justify-center rounded-full bg-emerald-500 text-4xl shadow-xl" aria-hidden>
            📞
          </span>
          <span className="text-[clamp(1.15rem,5.2vw,1.45rem)] leading-[2]">{t("Answer", "اٹھائیں")}</span>
        </button>
      </div>
    </div>
  );
}
