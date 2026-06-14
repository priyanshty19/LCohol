import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const bar = await prisma.bar.findUnique({
    where: { slug },
    include: {
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
          author: { select: { profile: { select: { username: true } } } },
        },
      },
    },
  });

  if (!bar) {
    return NextResponse.json({ error: "Bar not found." }, { status: 404 });
  }

  const communityAvg =
    bar.reviews.length > 0
      ? bar.reviews.reduce((s, r) => s + r.rating, 0) / bar.reviews.length
      : null;

  return NextResponse.json({ data: { ...bar, communityAvg } });
}
