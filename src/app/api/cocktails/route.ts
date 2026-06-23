import { NextResponse } from "next/server";
import { getCocktails, COCKTAILS_DEFAULT_TAKE } from "@/lib/cocktails";

export const revalidate = 300;

// GET /api/cocktails?category=&barId=&q=&take=&cursor=&include=
//   include=discover → also returns synthetic (isCurated=false) rows
//   default scope is curated only. Query logic lives in src/lib/cocktails.ts
//   (shared with the cocktails page's server-side initial fetch).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const takeRaw = Number(searchParams.get("take") ?? COCKTAILS_DEFAULT_TAKE);

  try {
    const { cocktails, nextCursor } = await getCocktails({
      category: searchParams.get("category"),
      barId: searchParams.get("barId"),
      q: searchParams.get("q")?.trim(),
      includeDiscover: searchParams.get("include") === "discover",
      cursor: searchParams.get("cursor"),
      take: Number.isFinite(takeRaw) ? takeRaw : COCKTAILS_DEFAULT_TAKE,
    });

    return NextResponse.json({ data: { cocktails, nextCursor } });
  } catch (err) {
    console.error("[api/cocktails GET]", err);
    return NextResponse.json({ error: "Couldn't load cocktails." }, { status: 500 });
  }
}
