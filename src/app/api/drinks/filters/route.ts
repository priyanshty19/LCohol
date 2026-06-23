import { NextResponse } from "next/server";
import { getDrinkFilters } from "@/lib/drinks";

// Categories + brand list change very rarely — cache aggressively (a day),
// serve stale while revalidating. Query logic in src/lib/drinks.ts.
export const revalidate = 86400;
const CACHE_HEADERS = { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" };

export async function GET() {
  const filters = await getDrinkFilters();
  return NextResponse.json(filters, { headers: CACHE_HEADERS });
}
