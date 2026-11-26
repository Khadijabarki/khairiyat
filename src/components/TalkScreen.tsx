"use client";

import { useEffect, useRef, useState } from "react";
import {
  FunctionResponseScheduling,
  GoogleGenAI,
  Modality,
  type FunctionCall,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { AudioPlayer, MicStream } from "@/lib/live-audio";
import { HELPLINES, detectByKeywords, getRule, type SafetyRule } from "@/lib/safety";
import { devanagariToRoman } from "@/lib/transliterate";

// An emergency or worry noticed during the call.
// source "ai" = the AI called raise_alert; "keywords" = our backup keyword check caught it.
export type RaisedAlert = { rule: SafetyRule; reason: string; source: "ai" | "keywords" };

type Status = "idle" | "connecting" | "listening" | "speaking" | "ending" | "done" | "error";

export type Turn = { role: "ammi" | "khairiyat"; text: string };

// Text shown in big Urdu letters for each state.
const STATUS_TEXT: Record<Status, string> = {
  idle: "بات کریں",
  connecting: "جوڑ رہے ہیں…",
  listening: "خیریت سن رہی ہے…",
  speaking: "خیریت بول رہی ہے…",
  ending: "اللہ حافظ…",
  done: "اللہ حافظ",
  error: "دوبارہ کوشش کریں",
};

const MAX_CALL_MS = 6 * 60 * 1000; // end the call automatically after 6 minutes

type Props = {
  parentId: string; // which parent is talking, e.g. "ammi" or "abbu"
  nickname: string; // used in the instruction to Gemini, e.g. "Ammi"
  nicknameUr: string; // shown on screen, e.g. "امی"
  childNameUr: string; // shown on screen, e.g. "علی"
  childPhone: string; // for the "call your son/daughter" button; empty = no button
};

// Name of the channel that browser tabs use to tell each other a call has started.
const CALL_CHANNEL = "khairiyat-call";

export default function TalkScreen({ parentId, nickname, nicknameUr, childNameUr, childPhone }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [errorText, setErrorText] = useState("");
  const [alerts, setAlerts] = useState<RaisedAlert[]>([]);
  const alertsRef = useRef<RaisedAlert[]>([]);

  // Everything that belongs to the call that is running right now.
  const sessionRef = useRef<Session | null>(null);
  const micRef = useRef<MicStream | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnsRef = useRef<Turn[]>([]);

  // Every call gets a new number. Anything from an older call (a late message,
  // a connection that finishes after the call was cancelled) is ignored and closed.
  // This guarantees only ONE call, and one voice, can ever be active on this page.
  const callIdRef = useRef(0);
  const activeRef = useRef(false); // true from the button press until the call ends
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Adds transcribed text to the conversation, joining pieces from the same speaker.
  // Any Hindi-script words are turned into Roman Urdu first (e.g. "सब" -> "sab").
  function addText(role: Turn["role"], rawText: string) {
    const text = devanagariToRoman(rawText);
    const list = turnsRef.current;
    const last = list[list.length - 1];
    if (last && last.role === role) {
      list[list.length - 1] = { role, text: last.text + text };
    } else {
      list.push({ role, text });
    }
    setTurns([...list]);
  }

  // Records an emergency or worry once per call (the AI and the keyword check
  // may both notice the same thing; the family should get one alert, not two).
  // The family alert itself is sent in the next step (/api/alert).
  function raiseAlert(rule: SafetyRule, reason: string, source: RaisedAlert["source"]) {
    if (alertsRef.current.some((a) => a.rule.id === rule.id)) return;
    alertsRef.current = [...alertsRef.current, { rule, reason, source }];
    setAlerts(alertsRef.current);
  }

  // The AI called its raise_alert tool. Show help, then tell the AI it worked.
  // WHEN_IDLE: the AI then goes on to comfort the parent and give the safety advice.
  // (SILENT was tested and made the AI stop talking after an alert, which is unsafe.)
  function handleToolCalls(calls: FunctionCall[]) {
    const responses = calls.map((call) => {
      const args = (call.args ?? {}) as { category?: string; reason?: string };
      const rule = call.name === "raise_alert" ? getRule(String(args.category)) : undefined;
      if (rule) raiseAlert(rule, String(args.reason ?? ""), "ai");
      return {
        id: call.id,
        name: call.name,
        response: rule ? { ok: true, shownOnScreen: true } : { ok: false, error: "unknown category" },
        scheduling: FunctionResponseScheduling.WHEN_IDLE,
      };
    });
    sessionRef.current?.sendToolResponse({ functionResponses: responses });
  }

  // Handles audio, text and tool calls arriving from Gemini for call number `callId`.
  function handleMessage(callId: number, msg: LiveServerMessage) {
    if (callId !== callIdRef.current) return; // message from an old call: ignore

    if (msg.toolCall?.functionCalls?.length) handleToolCalls(msg.toolCall.functionCalls);

    const content = msg.serverContent;
    if (!content) return;

    if (content.interrupted) playerRef.current?.interrupt();

    for (const part of content.modelTurn?.parts ?? []) {
      if (part.inlineData?.data) playerRef.current?.play(part.inlineData.data);
    }

    if (content.inputTranscription?.text) {
      addText("ammi", content.inputTranscription.text);
      // Backup safety check on what the parent has said in this turn so far.
      const lastTurn = turnsRef.current[turnsRef.current.length - 1];
      for (const rule of detectByKeywords(lastTurn.text)) raiseAlert(rule, "", "keywords");
    }
    if (content.outputTranscription?.text) addText("khairiyat", content.outputTranscription.text);
  }

  // Stops the current call completely: microphone, speaker, connection and timer.
  // Bumping callIdRef also cancels a call that is still connecting.
  function releaseCall() {
    callIdRef.current += 1;
    activeRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    micRef.current?.stop();
    sessionRef.current?.close();
    playerRef.current?.close();
    timerRef.current = null;
    micRef.current = null;
    sessionRef.current = null;
    playerRef.current = null;
  }

  function fail(message: string) {
    releaseCall();
    setErrorText(message);
    setStatus("error");
  }

  async function start() {
    if (activeRef.current) return; // already starting or in a call (e.g. a double click)
    activeRef.current = true;
    const callId = ++callIdRef.current;
    const isCurrent = () => callId === callIdRef.current;

    setErrorText("");
    setStatus("connecting");
    turnsRef.current = [];
    setTurns([]);
    alertsRef.current = [];
    setAlerts([]);

    // Tell other open Khairiyat tabs to end their call, so two voices never play together.
    channelRef.current?.postMessage("call-started");

    try {
      // 1. Ask our server for a one-time token (the real API key stays on the server).
      const res = await fetch("/api/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId }),
      });
      if (!isCurrent()) return; // cancelled while waiting
      if (!res.ok) throw new Error(`Token request failed (${res.status})`);
      const data: { token: string; model: string } = await res.json();

      // 2. Prepare the speaker (must happen right after the button click).
      const player = new AudioPlayer();
      playerRef.current = player;
      await player.resume();
      player.onSpeakingChange = (speaking) => {
        if (isCurrent()) setStatus(speaking ? "speaking" : "listening");
      };

      // 3. Connect to Gemini Live with the token.
      const ai = new GoogleGenAI({ apiKey: data.token, httpOptions: { apiVersion: "v1alpha" } });
      const session = await ai.live.connect({
        model: data.model,
        config: { responseModalities: [Modality.AUDIO] },
        callbacks: {
          onmessage: (msg) => handleMessage(callId, msg),
          onerror: () => {
            if (isCurrent()) fail("رابطہ ٹوٹ گیا۔ دوبارہ کوشش کریں۔");
          },
          onclose: (e) => {
            if (isCurrent() && e.code !== 1000) fail("رابطہ ختم ہو گیا۔ دوبارہ کوشش کریں۔");
          },
        },
      });
      if (!isCurrent()) {
        session.close(); // the call was cancelled while connecting: close this late connection
        return;
      }
      sessionRef.current = session;

      // 4. Start the microphone and stream it to Gemini.
      const mic = new MicStream();
      await mic.start((chunk) => {
        if (isCurrent()) {
          sessionRef.current?.sendRealtimeInput({ audio: { data: chunk, mimeType: "audio/pcm;rate=16000" } });
        }
      });
      if (!isCurrent()) {
        mic.stop();
        return;
      }
      micRef.current = mic;

      // 5. Ask Khairiyat to greet first, like a phone call.
      session.sendClientContent({
        turns: [{ role: "user", parts: [{ text: `(${nickname} ne baat shuru ki hai. Salam kar ke pyar se haal poocho.)` }] }],
        turnComplete: true,
      });

      setStatus("listening");
      timerRef.current = setTimeout(() => end(), MAX_CALL_MS);
    } catch (err) {
      if (!isCurrent()) return;
      // Log only the error type: never the message (it could contain the session token)
      // and never the conversation, to keep it private.
      console.error("Call failed:", err instanceof Error ? err.name : "unknown error");
      const micDenied = err instanceof DOMException && err.name === "NotAllowedError";
      fail(
        micDenied
          ? "مائیک کی اجازت نہیں ملی۔ براؤزر میں مائیک کی اجازت دیں۔"
          : "ابھی رابطہ نہیں ہو سکا۔ تھوڑی دیر بعد کوشش کریں۔"
      );
    }
  }

  async function end() {
    if (!activeRef.current) return;
    const finishedTurns = turnsRef.current;
    releaseCall();
    setStatus("ending");

    // Send the conversation to the server to make the family summary.
    // (The /api/checkin/finish route is built in the next step.)
    try {
      await fetch("/api/checkin/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId,
          turns: finishedTurns,
          alerts: alertsRef.current.map((a) => ({ category: a.rule.id, reason: a.reason, source: a.source })),
        }),
      });
    } catch {
      // Not ready yet or offline: the conversation still ends normally.
    }
    setStatus("done");
  }

  // Runs once when the page opens:
  // - listens for "a call started in another tab" and ends this tab's call if so
  // - releases the microphone and connection when the page is closed or left
  useEffect(() => {
    const channel = new BroadcastChannel(CALL_CHANNEL);
    channel.onmessage = () => {
      if (activeRef.current) end();
    };
    channelRef.current = channel;

    const onPageHide = () => releaseCall();
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      channel.close();
      channelRef.current = null;
      releaseCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set up once; the functions only use refs
  }, []);

  const inCall = status === "listening" || status === "speaking" || status === "connecting";
  const lastKhairiyat = [...turns].reverse().find((t) => t.role === "khairiyat");
  // The most recent urgent alert decides the red help panel; worries are listed in a small note.
  const urgent = [...alerts].reverse().find((a) => a.rule.level === "urgent");
  const concerns = alerts.filter((a) => a.rule.level === "concern");
  // An intruder needs the police (15); everything else goes to Rescue 1122.
  const helpline = urgent?.rule.id === "intruder" ? HELPLINES.police : HELPLINES.rescue;

  return (
    // Layout from top to bottom: header, big circle, what Khairiyat just said, end button, footer.
    // Everything fits on one screen so Ammi never has to scroll.
    <main dir="rtl" className="font-urdu flex min-h-dvh flex-col items-center bg-amber-50 px-4 pb-4 pt-6 text-stone-800">
      <header className="text-center">
        <h1 className="text-4xl leading-[2] text-emerald-800">خیریت</h1>
        <p className="text-lg leading-[2.2] text-stone-600">
          السلام علیکم {nicknameUr}! {childNameUr} نے آپ کا حال پوچھا ہے۔
        </p>
      </header>

      <section className="mt-4 flex w-full flex-1 flex-col items-center justify-center gap-5">
        {!inCall ? (
          <button
            onClick={start}
            disabled={status === "ending"}
            className="flex h-60 w-60 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-5xl leading-[2] text-white shadow-2xl transition active:scale-95 disabled:opacity-60 sm:h-72 sm:w-72"
          >
            {status === "done" ? "پھر بات کریں" : STATUS_TEXT[status === "error" ? "error" : "idle"]}
          </button>
        ) : (
          // Smaller circle during the call, so the words below have room.
          <div
            className={`flex h-44 w-44 shrink-0 items-center justify-center rounded-full text-2xl leading-[2] text-white shadow-2xl sm:h-52 sm:w-52 ${
              status === "speaking" ? "animate-pulse bg-emerald-500" : "bg-emerald-700"
            }`}
          >
            {STATUS_TEXT[status]}
          </div>
        )}

        {/* Red help panel for an urgent situation. It stays after the call ends,
            so the call buttons are always one tap away. */}
        {urgent && (
          <div role="alert" className="w-full max-w-xl rounded-3xl bg-rose-600 p-5 text-center text-white shadow-2xl">
            <p className="text-3xl leading-[2]">⚠️ {urgent.rule.titleUr}</p>
            {urgent.rule.tipsUr && <p className="mt-1 text-xl leading-[2]">{urgent.rule.tipsUr}</p>}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={`tel:${helpline.number}`}
                className="rounded-full bg-white px-6 py-2 text-2xl leading-[2] text-rose-700 shadow-lg active:scale-95"
              >
                📞 {helpline.labelUr} پر کال
              </a>
              {childPhone && (
                <a
                  href={`tel:${childPhone}`}
                  className="rounded-full bg-rose-900 px-6 py-2 text-2xl leading-[2] text-white shadow-lg active:scale-95"
                >
                  📞 {childNameUr} کو کال
                </a>
              )}
            </div>
            <p className="mt-3 text-lg leading-[2]">{childNameUr} کو بتایا جا رہا ہے۔</p>
          </div>
        )}

        {/* Small note for worries that the family should hear about today. */}
        {concerns.length > 0 && (
          <p className="max-w-xl rounded-2xl bg-amber-200 px-4 py-1 text-center text-lg leading-[2.2] text-amber-900">
            📝 {concerns.map((c) => c.rule.titleUr).join("، ")}: {childNameUr} کو بتا دیا جائے گا۔
          </p>
        )}

        {/* What Khairiyat just said (hidden while the red panel needs the space). */}
        {lastKhairiyat && inCall && !urgent && (
          // dir="auto" lets the browser pick the direction: Roman Urdu left-to-right, Urdu script right-to-left.
          <p dir="auto" className="max-h-40 max-w-xl overflow-y-auto text-center text-xl leading-[1.9]">
            {lastKhairiyat.text}
          </p>
        )}
        {status === "done" && (
          <p className="max-w-xl text-center text-2xl leading-[2.2]">
            شکریہ {nicknameUr}! اپنا خیال رکھیے گا۔
          </p>
        )}
        {errorText && <p className="text-center text-xl leading-[2.2] text-rose-700">{errorText}</p>}

        {inCall && (
          <button
            onClick={end}
            className="shrink-0 rounded-full bg-rose-600 px-10 py-2 text-2xl leading-[2] text-white shadow-lg active:scale-95"
          >
            بات ختم کریں
          </button>
        )}
      </section>

      <footer className="mt-4 text-center text-sm leading-[2.2] text-stone-500">
        خیریت ایک <bdi>AI</bdi> ساتھی ہے۔ ایمرجنسی میں <bdi>1122</bdi> پر کال کریں۔
      </footer>
    </main>
  );
}
