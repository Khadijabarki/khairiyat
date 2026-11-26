import {
  Behavior,
  GoogleGenAI,
  Modality,
  type FunctionDeclaration,
  type LiveConnectConfig,
} from "@google/genai";
import { LIVE_MODEL } from "@/lib/config";
import { getParent, getRecentCheckins } from "@/lib/data";
import { buildSystemPrompt } from "@/lib/prompt";
import { SAFETY_RULES } from "@/lib/safety";

// The tool the AI calls by itself when it hears an emergency or a worry.
// NON_BLOCKING: the conversation keeps going while the app shows help and alerts the family.
const RAISE_ALERT: FunctionDeclaration = {
  name: "raise_alert",
  description:
    "Call this immediately when the parent mentions an emergency or a health/safety worry from the safety list. " +
    "The app then shows emergency buttons on the parent's screen and alerts the family.",
  behavior: Behavior.NON_BLOCKING,
  parametersJsonSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: SAFETY_RULES.map((r) => r.id),
        description: "Which situation from the safety list this is.",
      },
      reason: {
        type: "string",
        description: "One short Roman Urdu line for the family, e.g. 'Ammi ne seene mein dard ka bataya.'",
      },
    },
    required: ["category", "reason"],
  },
};

// Gives the browser a short-lived token for one Gemini Live conversation.
// The real GEMINI_API_KEY never leaves the server. The token is locked to our
// model, voice and system prompt, so the browser can't change them.
export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY is missing in .env.local" }, { status: 500 });
  }

  // Which parent is talking (e.g. "ammi" or "abbu"), sent by the talk screen.
  const body = await request.json().catch(() => ({}));
  const parent = await getParent(String(body.parentId ?? ""));
  if (!parent) {
    return Response.json({ error: "Parent not found" }, { status: 404 });
  }
  const recent = await getRecentCheckins(parent.id);

  const liveConfig: LiveConnectConfig = {
    responseModalities: [Modality.AUDIO],
    systemInstruction: buildSystemPrompt(parent, recent),
    // A daughter's (female) or son's (male) voice, chosen per parent.
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: parent.companion.voice } } },
    tools: [{ functionDeclarations: [RAISE_ALERT] }],
    // Ask Gemini to also send the text of what was said, so we can make a summary later.
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };

  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1alpha" } });
    const now = Date.now();
    const token = await ai.authTokens.create({
      config: {
        uses: 1, // one conversation per token
        newSessionExpireTime: new Date(now + 60 * 1000).toISOString(), // must connect within 1 minute
        expireTime: new Date(now + 15 * 60 * 1000).toISOString(), // conversation can last up to 15 minutes
        liveConnectConstraints: { model: LIVE_MODEL, config: liveConfig },
      },
    });

    return Response.json({ token: token.name, model: LIVE_MODEL });
  } catch (err) {
    console.error("live-token error:", err);
    return Response.json({ error: "Could not create a Gemini Live token" }, { status: 502 });
  }
}
