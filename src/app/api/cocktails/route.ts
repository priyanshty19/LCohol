import { NextResponse } from "next/server";
import { getCocktailsCached, COCKTAILS_DEFAULT_TAKE } from "@/lib/cocktails";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// GET /api/cocktails?category=&barId=&q=&take=&cursor=&include=
//   include=discover → also returns synthetic (isCurated=false) rows
//   default scope is curated only. Query logic lives in src/lib/cocktails.ts
//   (shared with the cocktails page's server-side initial fetch).
//
// NOTE: this route is DYNAMIC (it reads the query string), so a route-level
// `export const revalidate` would be silently ignored — caching is done at the
// data layer via getCocktailsCached instead.
export async function GET(request: Request) {
  // Each distinct ?q= is a cache miss → unindexed ILIKE over ~10k rows. Throttle
  // per IP and ignore sub-2-char queries so a varied-query loop can't seq-scan
  // the table on every request. (pg_trgm index + WAF are the durable fixes.)
  if (!(await rateLimit(`cocktails-list:${clientIp(request)}`, 60, 60_000))) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  const { searchParams } = new URL(request.url);
  const takeRaw = Number(searchParams.get("take") ?? COCKTAILS_DEFAULT_TAKE);
  const qRaw = searchParams.get("q")?.trim();
  const q = qRaw && qRaw.length >= 2 ? qRaw.slice(0, 100) : undefined;

  try {
    const { cocktails, nextCursor } = await getCocktailsCached({
      category: searchParams.get("category"),
      barId: searchParams.get("barId"),
      q,
      includeDiscover: searchParams.get("include") === "discover",
      cursor: searchParams.get("cursor"),
      take: Number.isFinite(takeRaw) ? takeRaw : COCKTAILS_DEFAULT_TAKE,
    });

    return NextResponse.json({ data: { cocktails, nextCursor } });
  } catch (err) {
    // Pool saturated → shed gracefully so clients back off instead of retrying
    // into the wall and deepening the storm.
    if (isPoolExhausted(err)) {
      console.warn("[api/cocktails GET] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/cocktails GET]", err);
    return NextResponse.json({ error: "Couldn't load cocktails." }, { status: 500 });
  }
}
