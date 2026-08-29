import { NextResponse } from "next/server";
import { getDrinkFilters } from "@/lib/drinks";

// This database-backed endpoint must execute at request time. Prerendering it
// makes deployments fail whenever the preview database is intentionally asleep
// or network-restricted during the build. CDN headers still cache responses.
export const dynamic = "force-dynamic";
const CACHE_HEADERS = { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" };

export async function GET() {
  const filters = await getDrinkFilters();
  return NextResponse.json(filters, { headers: CACHE_HEADERS });
}
