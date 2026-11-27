// Plays one of a parent's voice messages, only to the signed-in family that parent belongs to.
import { currentUser } from "@/lib/auth";
import { getFamilyParent } from "@/lib/data";
import { parentMessageAudio } from "@/lib/parent-messages";
import { jsonError } from "@/lib/security";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function GET(_request: Request, { params }: RouteContext<"/family/[parentId]/messages/[messageId]">) {
  const { parentId, messageId } = await params;
  const user = await currentUser();
  if (!user) return jsonError("Not signed in", 401);
  const parent = await getFamilyParent(user.id, parentId); // ownership check
  const audio = parent && UUID.test(messageId) ? await parentMessageAudio(parent.id, messageId) : null;
  if (!audio) return jsonError("Not found", 404);

  // private, no-store: a family recording must never be kept by a shared cache.
  return new Response(new Uint8Array(audio.bytes), {
    headers: {
      "Content-Type": audio.mimeType,
      "Content-Length": String(audio.bytes.length),
      "Cache-Control": "private, no-store",
    },
  });
}
