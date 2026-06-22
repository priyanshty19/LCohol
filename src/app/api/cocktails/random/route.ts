import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/cocktails/random — one curated pick at random for the home sidebar.
export async function GET() {
  try {
    const count = await prisma.cocktailCreation.count({ where: { isCurated: true, isPublic: true } });
    if (count === 0) return NextResponse.json({ data: { cocktail: null } });

    const skip = Math.floor(Math.random() * count);
    const cocktail = await prisma.cocktailCreation.findFirst({
      where: { isCurated: true, isPublic: true },
      skip,
      orderBy: { id: "asc" },
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
