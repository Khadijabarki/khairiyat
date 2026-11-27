// Checks on family voice messages.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { looksLikeAudio, voiceSeconds, voiceType } from "../../src/lib/voice-rules";

const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0]);
const ogg = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0, 0]);
const mp4 = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x4d]);

describe("voiceType", () => {
  it("accepts the formats browsers record, ignoring codec details", () => {
    assert.equal(voiceType("audio/webm;codecs=opus"), "audio/webm");
    assert.equal(voiceType("audio/mp4"), "audio/mp4");
    assert.equal(voiceType("audio/ogg; codecs=opus"), "audio/ogg");
  });

  it("refuses everything else", () => {
    for (const bad of ["", "video/webm", "text/html", "audio/wav", "audio/webm-x"]) assert.equal(voiceType(bad), null);
  });
});

describe("looksLikeAudio", () => {
  it("recognises real file headers", () => {
    assert.ok(looksLikeAudio(webm, "audio/webm"));
    assert.ok(looksLikeAudio(ogg, "audio/ogg"));
    assert.ok(looksLikeAudio(mp4, "audio/mp4"));
  });

  it("refuses a file that only claims to be audio", () => {
    const html = new TextEncoder().encode("<html><script>");
    for (const type of ["audio/webm", "audio/ogg", "audio/mp4"] as const) assert.equal(looksLikeAudio(html, type), false);
    assert.equal(looksLikeAudio(new Uint8Array(), "audio/webm"), false);
  });
});

describe("voiceSeconds", () => {
  it("allows 1 to about 60 seconds", () => {
    assert.equal(voiceSeconds("1"), 1);
    assert.equal(voiceSeconds("59.6"), 60);
    for (const bad of ["0", "-5", "66", "abc", null]) assert.equal(voiceSeconds(bad), null);
  });
});
