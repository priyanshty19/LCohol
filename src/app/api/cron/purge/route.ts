import { NextResponse } from "next/server";
import { runRetentionPurge } from "@/lib/retention";

export const dynamic = "force-dynamic";

// Daily retention purge, run by Vercel Cron (see vercel.json). Vercel automatically
// sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in the project
// env. We REQUIRE it — this endpoint deletes data, so it stays disabled until the
// secret is configured, and rejects any request that doesn't present it.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron disabled (set CRON_SECRET)" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runRetentionPurge();
  return NextResponse.json({ ok: true, ...result });
}
