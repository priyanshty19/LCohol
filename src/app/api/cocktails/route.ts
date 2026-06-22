import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

const DEFAULT_TAKE = 24;
const MAX_TAKE = 100;

// GET /api/cocktails?category=&barId=&q=&take=&cursor=&include=
//   include=discover → also returns synthetic (isCurated=false) rows
//   default scope is curated only
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const barId = searchParams.get("barId");
  const q = searchParams.get("q")?.trim();
  const includeDiscover = searchParams.get("include") === "discover";
  const cursor = searchParams.get("cursor");
  const takeRaw = Number(searchParams.get("take") ?? DEFAULT_TAKE);
  const take = Math.min(MAX_TAKE, Math.max(1, Number.isFinite(takeRaw) ? takeRaw : DEFAULT_TAKE));

  const where: Record<string, unknown> = {
    isPublic: true,
  };
  if (!includeDiscover) where.isCurated = true;
  if (category) where.category = category;
  if (barId) where.sourceBarId = barId;
  if (q) where.name = { contains: q, mode: "insensitive" };

  try {
    const rows = await prisma.cocktailCreation.findMany({
      where,
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: [{ isCurated: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        category: true,
        glass: true,
        garnish: true,
        instructions: true,
        sourceLabel: true,
        isCurated: true,
        sourceBar: { select: { id: true, name: true, slug: true, city: true } },
        ingredients: {
          orderBy: { sortOrder: "asc" },
          select: {
            sortOrder: true,
            ingredient: { select: { name: true, slug: true, category: true } },
            drink: { select: { name: true, slug: true } },
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (rows.length > take) {
      const next = rows.pop()!;
      nextCursor = next.id;
    }

    return NextResponse.json({ data: { cocktails: rows, nextCursor } });
  } catch (err) {
    console.error("[api/cocktails GET]", err);
    return NextResponse.json({ error: "Couldn't load cocktails." }, { status: 500 });
  }
}
