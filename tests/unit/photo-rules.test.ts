// Family member photos.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { looksLikeJpeg } from "../../src/lib/photo-rules";

describe("looksLikeJpeg", () => {
  it("accepts a JPEG header and refuses anything else", () => {
    assert.ok(looksLikeJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0])));
    assert.equal(looksLikeJpeg(new TextEncoder().encode("<svg onload=x>")), false);
    assert.equal(looksLikeJpeg(new Uint8Array()), false);
  });
});
