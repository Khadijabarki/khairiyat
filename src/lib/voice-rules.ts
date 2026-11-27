// Checks for a family voice message. Pure functions (no database), so they can be
// unit-tested and used by both the browser (recorder) and the server.

export const MAX_VOICE_SECONDS = 60;
// 60 seconds of speech at 32 kbit/s is about 240 KB. Server Actions accept up to 1 MB.
export const MAX_VOICE_BYTES = 700 * 1024;

export const VOICE_TYPES = ["audio/webm", "audio/mp4", "audio/ogg"] as const;
export type VoiceType = (typeof VOICE_TYPES)[number];

// "audio/webm;codecs=opus" -> "audio/webm"; anything else we don't accept -> null.
export function voiceType(mimeType: string): VoiceType | null {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  return VOICE_TYPES.find((t) => t === base) ?? null;
}

// The first bytes must really be that kind of audio file, whatever the browser claims.
export function looksLikeAudio(bytes: Uint8Array, type: VoiceType): boolean {
  const at = (offset: number, expected: number[]) => expected.every((b, i) => bytes[offset + i] === b);
  if (type === "audio/webm") return at(0, [0x1a, 0x45, 0xdf, 0xa3]); // EBML header
  if (type === "audio/ogg") return at(0, [0x4f, 0x67, 0x67, 0x53]); // "OggS"
  return at(4, [0x66, 0x74, 0x79, 0x70]); // MP4: "ftyp"
}

// A whole number of seconds from 1 to the limit (plus a little slack), or null.
export function voiceSeconds(value: unknown): number | null {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 && n <= MAX_VOICE_SECONDS + 5 ? n : null;
}
