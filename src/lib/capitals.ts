// Capital letters in text fields, while typing and when saving. Used by browser and server.
// Fields choose with data-cap: "words" for names, "first" for other text. Email, password
// and phone fields don't have it. Urdu has no capitals, so it is never changed.
import { capitalName } from "./urdu-names";

// "subah nashte ke baad" -> "Subah nashte ke baad"
export const capitalFirst = (text: string) =>
  text.replace(/^(\s*)([a-z])/, (_match, space: string, letter: string) => space + letter.toUpperCase());

// For a form's (or field's) onInput and onBlur.
export function capitaliseField(event: { target: EventTarget; nativeEvent: Event }): void {
  const box = event.target as HTMLInputElement;
  const mode = box.dataset?.cap;
  if (!mode) return;
  // A phone keyboard may still be building the word: changing it then would double letters.
  // It is done when the field is left.
  if ((event.nativeEvent as InputEvent).isComposing) return;
  const next = mode === "words" ? capitalName(box.value) : capitalFirst(box.value);
  if (next === box.value) return;
  const { selectionStart, selectionEnd } = box;
  box.value = next;
  // Only the letter case changed, so the cursor stays where it was.
  if (document.activeElement === box) box.setSelectionRange(selectionStart, selectionEnd);
}
