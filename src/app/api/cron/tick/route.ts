// The call scheduler, run every few minutes by an outside timer (GitHub Actions, see
// .github/workflows/scheduler.yml) or Vercel Cron. It rings parents at their daily time
// and handles unanswered calls. Protected by CRON_SECRET, so nobody else can trigger calls.
import { timingSafeEqual } from "node:crypto";
import { runScheduler } from "@/lib/calls";
import { jsonError } from "@/lib/security";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const sent = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !sent) return false;
  const a = Buffer.from(sent);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b); // constant-time comparison
}

async function handle(request: Request) {
  if (!authorized(request)) return jsonError("Unauthorized", 401);
  const report = await runScheduler();
  return Response.json({ ok: true, ...report }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = handle; // Vercel Cron uses GET
export const POST = handle;
