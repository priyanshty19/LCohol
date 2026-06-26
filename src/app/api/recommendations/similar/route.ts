import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { similarDrinks } from "@/lib/recommend";

// "More like this" for a drink (by slug). Public — no personalization, just
// item-item similarity, so it works for logged-out visitors too.
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ drinks: [] });

  const drink = await prisma.drink.findUnique({ where: { slug }, select: { id: true } });
  if (!drink) return NextResponse.json({ drinks: [] });

  const drinks = await similarDrinks(drink.id);
  return NextResponse.json({ drinks });
}
