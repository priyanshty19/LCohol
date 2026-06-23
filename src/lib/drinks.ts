import { prisma } from "@/lib/prisma";
import { DRINKS_PAGE_SIZE } from "@/lib/constants";

// Shared drink-catalog queries, used by the API routes (client filters /
// pagination) and the drinks page server component (initial render).

export type DrinksQuery = {
  category?: string | null;
  subcategory?: string | null;
  brand?: string | null;
  priceRange?: string | null;
  search?: string | null;
  sort?: string;
  cursor?: string | null;
};

export async function getDrinks(opts: DrinksQuery = {}) {
  const sort = opts.sort || "name";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (opts.category) where.category = { slug: opts.category };
  if (opts.subcategory) where.subcategory = { slug: opts.subcategory };
  if (opts.brand) where.brand = opts.brand;
  if (opts.priceRange) where.priceRange = opts.priceRange;
  if (opts.search) {
    where.OR = [
      { name: { contains: opts.search, mode: "insensitive" } },
      { brand: { contains: opts.search, mode: "insensitive" } },
      { description: { contains: opts.search, mode: "insensitive" } },
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
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    include: {
      category: true,
      subcategory: true,
      tasteProfile: true,
      _count: { select: { reviews: true, posts: true } },
    },
  });

  const hasMore = drinks.length > DRINKS_PAGE_SIZE;
  const page = hasMore ? drinks.slice(0, DRINKS_PAGE_SIZE) : drinks;

  // Decimal → number so the result is serializable across the server→client
  // prop boundary (RSC rejects Prisma.Decimal class instances).
  const data = page.map((d) => ({ ...d, abv: d.abv == null ? null : Number(d.abv) }));

  return {
    data,
    hasMore,
    nextCursor: hasMore ? data[data.length - 1]?.id : undefined,
  };
}

export async function getDrinkFilters() {
  const [categories, brands] = await Promise.all([
    prisma.drinkCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        subcategories: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    prisma.drink.findMany({
      where: { brand: { not: null } },
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    }),
  ]);

  return {
    categories,
    brands: brands.map((b) => b.brand).filter(Boolean) as string[],
  };
}
