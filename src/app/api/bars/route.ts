import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TYPES = ["PUB", "BAR", "BYOB", "BREWERY", "LOUNGE", "CLUB"];

export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const city = sp.get("city")?.trim();
  const type = sp.get("type")?.trim();
  const q = sp.get("q")?.trim();

  const bars = await prisma.bar.findMany({
    where: {
      ...(city ? { city } : {}),
      ...(type && TYPES.includes(type) ? { type: type as "PUB" } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { address: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { bestsellers: { has: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ rating: "desc" }, { name: "asc" }],
    take: 120,
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      city: true,
      address: true,
      lat: true,
      lng: true,
      priceRange: true,
      rating: true,
      bestsellers: true,
      description: true,
    },
  });

  return NextResponse.json({ data: bars });
}
