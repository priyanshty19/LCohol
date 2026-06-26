import { NextResponse } from "next/server";
import { getCocktailsCached, COCKTAILS_DEFAULT_TAKE } from "@/lib/cocktails";
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
  const { searchParams } = new URL(request.url);
  const takeRaw = Number(searchParams.get("take") ?? COCKTAILS_DEFAULT_TAKE);

  try {
    const { cocktails, nextCursor } = await getCocktailsCached({
      category: searchParams.get("category"),
      barId: searchParams.get("barId"),
      q: searchParams.get("q")?.trim(),
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
