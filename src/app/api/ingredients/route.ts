import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/ingredients → the picker dictionary for ingredient search.
// Sourced from the normalized Ingredient table (NOT loaded cocktail rows, which
// would be incomplete). Cached — this list changes rarely.
export const revalidate = 600;

export async function GET() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { name: true, slug: true, category: true },
    take: 1000,
  });
  return NextResponse.json({ data: { ingredients } });
}
