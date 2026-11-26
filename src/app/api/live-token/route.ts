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
import { clientIp, isSameOrigin, isValidId, jsonError, rateLimit, readJson } from "@/lib/security";

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

// Abuse limits. A real check-in needs one token, so these are generous for normal
// use but stop a script from using up our free Gemini quota.
const PER_IP_LIMIT = 10; // tokens per visitor...
const PER_IP_WINDOW_MS = 10 * 60 * 1000; // ...every 10 minutes
const GLOBAL_LIMIT = 200; // tokens for everyone together...
const GLOBAL_WINDOW_MS = 60 * 60 * 1000; // ...every hour

// Gives the browser a short-lived token for one Gemini Live conversation.
// The real GEMINI_API_KEY never leaves the server. The token is locked to our
// model, voice and system prompt, so the browser can't change them.
export async function POST(request: Request) {
  // 1. Only our own pages may ask for a token.
  if (!isSameOrigin(request)) return jsonError("Forbidden", 403);

  // 2. Rate limits: per visitor, and for the whole app.
  if (!rateLimit(`token:${clientIp(request)}`, PER_IP_LIMIT, PER_IP_WINDOW_MS) ||
      !rateLimit("token:all", GLOBAL_LIMIT, GLOBAL_WINDOW_MS)) {
    return jsonError("Too many requests, please try again later", 429);
  }

  // 3. Check the input: a small JSON body with a valid parent id.
  const body = await readJson(request, 1024);
  if (!body || !isValidId(body.parentId)) return jsonError("Invalid request", 400);
  const parent = await getParent(body.parentId);
  if (!parent) return jsonError("Not found", 404);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("live-token: GEMINI_API_KEY is not set");
    return jsonError("Service not configured", 500);
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

    // no-store: a token must never be saved by the browser or any proxy.
    return Response.json({ token: token.name, model: LIVE_MODEL }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Log only the error message: never the prompt, which contains the parent's details.
    console.error("live-token: Gemini token request failed:", err instanceof Error ? err.message : "unknown error");
    return jsonError("Could not start the conversation", 502);
  }
}
