import { NextResponse } from "next/server";
import { recomputeSignals } from "@/lib/signals/recompute";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Nightly rebuild of the personalization signals (UserTasteVector + ItemSimilarity),
// run by Vercel Cron (see vercel.json). CRON_SECRET-gated: it does heavy DB writes,
// so it stays disabled (503) until the secret is set and rejects unauthenticated calls.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron disabled (set CRON_SECRET)" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await recomputeSignals();
  return NextResponse.json({ ok: true, ...result });
}
