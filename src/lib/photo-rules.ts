// Checks for a family member's photo. Pure functions, used by the browser and the server.
export const PHOTO_SIZE = 320; // saved as a square of this many pixels
export const MAX_PHOTO_BYTES = 140 * 1024;

// The first bytes must really be a JPEG, whatever the browser claims.
export function looksLikeJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}
