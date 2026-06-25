import { NextResponse } from "next/server";
import { searchByIngredients } from "@/lib/cocktails";

// GET /api/cocktails/by-ingredients?slugs=gin,lime-juice&include=discover&take=24
// Deterministic ingredient→cocktail matching. Public catalog data, lightly cached.
export const revalidate = 120;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugs = (searchParams.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const includeDiscover = searchParams.get("include") === "discover";
  const takeRaw = searchParams.get("take");
  const take = takeRaw && Number.isFinite(Number(takeRaw)) ? Number(takeRaw) : undefined;

  const result = await searchByIngredients(slugs, { includeDiscover, take });
  return NextResponse.json({ data: result });
}
