import { NextRequest, NextResponse } from "next/server";
import { getBars } from "@/lib/bars";

const CACHE_HEADERS = { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" };

/** Compatibility endpoint for older clients; city browsing stays in our directory. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const data = await getBars({
    city: params.get("city"),
    type: params.get("type"),
    q: params.get("q"),
  });
  return NextResponse.json({ data }, { headers: CACHE_HEADERS });
}
