// Settings that are easy to change in one place.
// Values come from .env.local when set, otherwise these defaults are used.

// The Gemini Live model used for the real-time Urdu conversation.
export const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live";

// Voices are set per parent in src/lib/data.ts (VOICES).
