// Talks to the real Gemini Live model through our own server, the same way the
// parent's screen does, and checks speed, Urdu replies and the emergency tool.
//
// Run:  npm run test:ai                                  (against http://localhost:3000)
//       BASE_URL=https://khairiyat.vercel.app npm run test:ai
//
// Uses the demo parent's talk link (/talk/demo-ammi), so run `npm run setup:demo` first.
// It uses a small amount of the Gemini quota.
import { GoogleGenAI, Modality } from "@google/genai";

const base = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const talkToken = process.env.TALK_TOKEN || "demo-ammi";
const results = [];
const ok = (name, pass, extra = "") => {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
};

const res = await fetch(`${base}/api/live-token`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base },
  body: JSON.stringify({ talkToken }),
});
const { token, model } = await res.json();
ok("our server gives a one-time Gemini token", Boolean(token), String(res.status));
if (!token) process.exit(1);

const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });
let started = 0;
let firstAudio = 0;
let transcript = "";
let toolCalls = [];
let resolveTurn;

const session = await ai.live.connect({
  model,
  config: { responseModalities: [Modality.AUDIO] },
  callbacks: {
    onmessage: (msg) => {
      if (msg.toolCall?.functionCalls) {
        toolCalls.push(...msg.toolCall.functionCalls);
        session.sendToolResponse({
          functionResponses: msg.toolCall.functionCalls.map((f) => ({ id: f.id, name: f.name, response: { ok: true }, scheduling: "WHEN_IDLE" })),
        });
      }
      const content = msg.serverContent;
      if (!content) return;
      if (!firstAudio && content.modelTurn?.parts?.some((p) => p.inlineData)) firstAudio = Date.now();
      if (content.outputTranscription?.text) transcript += content.outputTranscription.text;
      if (content.turnComplete && transcript) resolveTurn?.();
    },
  },
});

// Sends one line as the parent and waits for Khairiyat's spoken reply.
async function say(line) {
  started = Date.now();
  firstAudio = 0;
  transcript = "";
  toolCalls = [];
  const done = new Promise((resolve) => (resolveTurn = resolve));
  session.sendClientContent({ turns: [{ role: "user", parts: [{ text: line }] }], turnComplete: true });
  await Promise.race([done, new Promise((resolve) => setTimeout(resolve, 25000))]);
  console.log(`      > ${line}\n      < ${transcript.trim()}`);
  return { ms: firstAudio ? firstAudio - started : Infinity, reply: transcript };
}

try {
  const hello = await say("(Ammi ne baat shuru ki hai. Salam kar ke pyar se haal poocho.)");
  ok("greets with 'Assalam o alaikum'", /assalam/i.test(hello.reply));
  ok("first reply starts in under 3 seconds", hello.ms < 3000, `${hello.ms} ms`);

  const scam = await say("Kisi ne phone kar ke OTP maanga tha, bank wala keh raha tha");
  ok("warns never to share an OTP", /otp|code|pin/i.test(scam.reply));

  const chest = await say("Beta seene mein ajeeb sa dard ho raha hai");
  ok("raises the chest_pain alert by itself", toolCalls.some((c) => c.name === "raise_alert" && c.args?.category === "chest_pain"));
  ok("keeps talking after the alert and mentions 1122", /1122/.test(chest.reply));
} finally {
  session.close();
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed.`);
  process.exitCode = passed === results.length ? 0 : 1;
}
