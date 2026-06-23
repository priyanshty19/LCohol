import { NextRequest, NextResponse } from "next/server";
import { getBars } from "@/lib/bars";

// Public bar directory — no per-user data, so cache it (browser/CDN).
// Query logic in src/lib/bars.ts (shared with the bars page).
const CACHE_HEADERS = { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" };

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const bars = await getBars({
    city: sp.get("city"),
    type: sp.get("type"),
    q: sp.get("q"),
  });
  return NextResponse.json({ data: bars }, { headers: CACHE_HEADERS });
}
