import { NextResponse } from "next/server";
import { searchCatalog } from "@/lib/james/search";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// GET /api/catalog/search?q=negroni → merged drink+cocktail matches ({kind,id,name,...}).
// Reuses James's searchCatalog (the existing unified search) so the party picker
// and any future global catalog search share one ranking.
export async function GET(request: Request) {
  // This was the one search route with no limiter at all, while drinks-search,
  // drinks-list and cocktails-list all had one — drift, not a decision. It runs
  // a text search over the whole catalogue, so unthrottled it is a cheap way to
  // load the database from outside.
  const me = await getCurrentUser();
  const perAccount = me ? await rateLimit(`catalog-search:${me.id}`, 60, 60_000) : true;
  const perIp = await rateLimit(`catalog-search-ip:${clientIp(request)}`, 120, 60_000);
  if (!perAccount || !perIp) {
    return NextResponse.json(
      { error: "Too many searches. Please slow down.", data: { results: [] } },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ data: { results: [] } });
  const { results } = await searchCatalog(q);
  return NextResponse.json({ data: { results } });
}
