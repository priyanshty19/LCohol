import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// GET /api/ingredients → the picker dictionary for ingredient search.
// Sourced from the normalized Ingredient table (NOT loaded cocktail rows, which
// would be incomplete). Keep this request-time so builds never depend on a live
// preview database; the client query cache handles repeat picker requests.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ingredients = await prisma.ingredient.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { name: true, slug: true, category: true },
      take: 1000,
    });
    return NextResponse.json({ data: { ingredients } });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/ingredients GET] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/ingredients GET]", err);
    return NextResponse.json({ error: "Couldn't load ingredients." }, { status: 500 });
  }
}
