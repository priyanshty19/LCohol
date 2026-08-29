import { NextResponse } from "next/server";
import { getDrinks } from "@/lib/drinks";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// Public reference data (the drink catalog) — safe to cache in the browser/CDN.
// Query logic lives in src/lib/drinks.ts (shared with the drinks page).
const CACHE_HEADERS = { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" };

export async function GET(request: Request) {
  // `?search=` runs unindexed ILIKE; varying it bypasses the CDN cache. Throttle
  // per IP and cap the term length. (pg_trgm index + WAF are the durable fixes.)
  if (!(await rateLimit(`drinks-list:${clientIp(request)}`, 60, 60_000))) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  const { searchParams } = new URL(request.url);

  // Accept `take` (or legacy `limit`) so light callers fetch only what they need.
  const takeParam = searchParams.get("take") ?? searchParams.get("limit");
  const take = takeParam ? Number(takeParam) : undefined;
  const searchRaw = searchParams.get("search");
  const search = searchRaw ? searchRaw.slice(0, 100) : null;
  const slugs = (searchParams.get("slugs") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter((slug) => /^[a-z0-9][a-z0-9-]{0,219}$/.test(slug))
    .slice(0, 24);

  try {
    const result = await getDrinks({
      slugs,
      category: searchParams.get("category"),
      subcategory: searchParams.get("subcategory"),
      brand: searchParams.get("brand"),
      priceRange: searchParams.get("priceRange"),
      search,
      sort: searchParams.get("sort") || "name",
      cursor: searchParams.get("cursor"),
      take: Number.isFinite(take) ? take : undefined,
    });

    return NextResponse.json(result, { headers: CACHE_HEADERS });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/drinks GET]", err);
    return NextResponse.json({ error: "Couldn't load drinks." }, { status: 500 });
  }
}
