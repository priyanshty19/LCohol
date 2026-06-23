import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // `id` may be a UUID or a slug. Only probe the uuid column when it actually
  // looks like one — otherwise Postgres tries to cast the slug to uuid and the
  // whole query throws (P2007: invalid input syntax for type uuid).
  const drink = await prisma.drink.findFirst({
    where: UUID_RE.test(id) ? { OR: [{ id }, { slug: id }] } : { slug: id },
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
