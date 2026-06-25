import { NextResponse } from "next/server";
import { getDrinks } from "@/lib/drinks";

// Public reference data (the drink catalog) — safe to cache in the browser/CDN.
// Query logic lives in src/lib/drinks.ts (shared with the drinks page).
const CACHE_HEADERS = { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" };

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Accept `take` (or legacy `limit`) so light callers fetch only what they need.
  const takeParam = searchParams.get("take") ?? searchParams.get("limit");
  const take = takeParam ? Number(takeParam) : undefined;

  const result = await getDrinks({
    category: searchParams.get("category"),
    subcategory: searchParams.get("subcategory"),
    brand: searchParams.get("brand"),
    priceRange: searchParams.get("priceRange"),
    search: searchParams.get("search"),
    sort: searchParams.get("sort") || "name",
    cursor: searchParams.get("cursor"),
    take: Number.isFinite(take) ? take : undefined,
  });

  return NextResponse.json(result, { headers: CACHE_HEADERS });
}
