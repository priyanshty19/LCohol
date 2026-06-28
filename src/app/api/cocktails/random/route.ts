import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/cocktails/random — one curated pick at random for the home sidebar.
export async function GET() {
  try {
    const ids = await prisma.cocktailCreation.findMany({
      where: { isCurated: true, isPublic: true },
      select: { id: true },
    });
    if (ids.length === 0) return NextResponse.json({ data: { cocktail: null } });

    const pickedId = ids[Math.floor(Math.random() * ids.length)].id;
    const cocktail = await prisma.cocktailCreation.findFirst({
      where: { id: pickedId, isCurated: true, isPublic: true },
      select: {
        id: true,
        name: true,
        category: true,
        glass: true,
        garnish: true,
        instructions: true,
        sourceLabel: true,
        sourceBar: { select: { id: true, name: true, slug: true, city: true } },
        ingredients: {
          orderBy: { sortOrder: "asc" },
          select: {
            ingredient: { select: { name: true, slug: true } },
          },
        },
      },
    });
    return NextResponse.json({ data: { cocktail } });
  } catch (err) {
    console.error("[api/cocktails/random GET]", err);
    return NextResponse.json({ error: "Couldn't pick a cocktail." }, { status: 500 });
  }
}
