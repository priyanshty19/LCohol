import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const drink = await prisma.drink.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      category: true,
      subcategory: true,
      tasteProfile: true,
      occasions: true,
      moods: true,
      foodPairings: true,
      communityScores: true,
      _count: { select: { reviews: true, posts: true } },
    },
  });

  if (!drink) {
    return NextResponse.json({ error: "Drink not found" }, { status: 404 });
  }

  return NextResponse.json({ data: drink });
}
