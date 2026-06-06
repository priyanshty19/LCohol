import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const drinks = await prisma.drink.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 10,
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      imageUrl: true,
      category: { select: { name: true } },
    },
  });

  return NextResponse.json({ data: drinks });
}
