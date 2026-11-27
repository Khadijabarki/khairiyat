// A family member's photo, only for the signed-in family they belong to.
import { currentUser } from "@/lib/auth";
import { getFamilyParent } from "@/lib/data";
import { photoBytes } from "@/lib/photos";
import { jsonError } from "@/lib/security";

export async function GET(_request: Request, { params }: RouteContext<"/family/[parentId]/photo">) {
  const { parentId } = await params;
  const user = await currentUser();
  if (!user) return jsonError("Not signed in", 401);
  const parent = await getFamilyParent(user.id, parentId); // ownership check
  const bytes = parent ? await photoBytes(parent.id) : null;
  if (!bytes) return jsonError("Not found", 404);
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
  });
}
