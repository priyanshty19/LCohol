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
