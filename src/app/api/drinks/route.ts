import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DRINKS_PAGE_SIZE } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
  const brand = searchParams.get("brand");
  const priceRange = searchParams.get("priceRange");
  const search = searchParams.get("search");
  const cursor = searchParams.get("cursor");
  const sort = searchParams.get("sort") || "name";

  const where: any = {};

  if (category) where.category = { slug: category };
  if (subcategory) where.subcategory = { slug: subcategory };
  if (brand) where.brand = brand;
  if (priceRange) where.priceRange = priceRange as any;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy =
    sort === "popular"
      ? [{ posts: { _count: "desc" as const } }]
      : sort === "newest"
        ? [{ createdAt: "desc" as const }]
        : sort === "price_low"
          ? [{ basePriceInr: { sort: "asc" as const, nulls: "last" as const } }]
          : sort === "price_high"
            ? [{ basePriceInr: { sort: "desc" as const, nulls: "last" as const } }]
            : [{ name: "asc" as const }];

  const drinks = await prisma.drink.findMany({
    where,
    orderBy,
    take: DRINKS_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      category: true,
      subcategory: true,
      tasteProfile: true,
      _count: { select: { reviews: true, posts: true } },
    },
  });

  const hasMore = drinks.length > DRINKS_PAGE_SIZE;
  const data = hasMore ? drinks.slice(0, DRINKS_PAGE_SIZE) : drinks;

  return NextResponse.json({
    data,
    hasMore,
    nextCursor: hasMore ? data[data.length - 1]?.id : undefined,
  });
}
