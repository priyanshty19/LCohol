import { prisma } from "@/lib/prisma";

// Shared bar-directory query — used by the API route (client filters) and the
// bars page server component (initial render).

const TYPES = ["PUB", "BAR", "BYOB", "BREWERY", "LOUNGE", "CLUB"];

export type BarsQuery = { city?: string | null; type?: string | null; q?: string | null };

export async function getBars(opts: BarsQuery = {}) {
  const city = opts.city?.trim();
  const type = opts.type?.trim();
  const q = opts.q?.trim();

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

  // Decimal → number so the result is serializable across the server→client
  // prop boundary (RSC rejects Prisma.Decimal class instances).
  return bars.map((b) => ({ ...b, rating: b.rating == null ? null : Number(b.rating) }));
}

/**
 * Full venue record for the authenticated bar-detail page. Keep this projection
 * deliberately serializable because it crosses the Server Component boundary.
 */
export async function getBarBySlug(slug: string) {
  const bar = await prisma.bar.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      city: true,
      state: true,
      address: true,
      lat: true,
      lng: true,
      priceRange: true,
      rating: true,
      bestsellers: true,
      description: true,
      isVerified: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
          author: {
            select: {
              profile: { select: { username: true, displayName: true } },
            },
          },
        },
      },
    },
  });

  if (!bar) return null;

  const communityRating = bar.reviews.length
    ? bar.reviews.reduce((sum, review) => sum + review.rating, 0) / bar.reviews.length
    : null;

  return {
    ...bar,
    rating: bar.rating == null ? null : Number(bar.rating),
    communityRating,
    reviews: bar.reviews.map((review) => ({
      ...review,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}

export type BarDetailData = NonNullable<Awaited<ReturnType<typeof getBarBySlug>>>;
