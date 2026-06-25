import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeCocktailCategory } from "../src/lib/cocktail-category";

// One-off backfill: populate CocktailCreation.slug (unique-in-practice) and
// categorySlug for rows that predate those columns. Idempotent — only sets a
// slug where one is missing; recomputes categorySlug every run. Safe to re-run.

function isLocalDb(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

function slugifyName(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

async function chunkedUpdate(
  updates: { id: string; slug?: string; categorySlug: string | null }[],
) {
  const SIZE = 50;
  let done = 0;
  for (let i = 0; i < updates.length; i += SIZE) {
    const batch = updates.slice(i, i + SIZE);
    await Promise.all(
      batch.map((u) =>
        prisma.cocktailCreation.update({
          where: { id: u.id },
          data: {
            ...(u.slug ? { slug: u.slug } : {}),
            categorySlug: u.categorySlug,
          },
        }),
      ),
    );
    done += batch.length;
    if (done % 500 === 0 || done === updates.length) {
      console.log(`  …${done}/${updates.length}`);
    }
  }
}

async function main() {
  const rows = await prisma.cocktailCreation.findMany({
    select: { id: true, name: true, category: true, slug: true },
  });
  console.log(`Loaded ${rows.length} cocktails.`);

  // Seed the used-slug set with any slugs already present so we never collide.
  const used = new Set<string>();
  for (const r of rows) if (r.slug) used.add(r.slug);

  const updates: { id: string; slug?: string; categorySlug: string | null }[] = [];
  for (const r of rows) {
    const categorySlug = normalizeCocktailCategory(r.category);
    let slug: string | undefined;
    if (!r.slug) {
      const base = slugifyName(r.name) || "cocktail";
      let candidate = base;
      let n = 2;
      while (used.has(candidate)) {
        candidate = `${base}-${n++}`;
      }
      used.add(candidate);
      slug = candidate;
    }
    updates.push({ id: r.id, slug, categorySlug });
  }

  const newSlugs = updates.filter((u) => u.slug).length;
  console.log(`Backfilling ${newSlugs} new slugs + ${updates.length} categorySlugs…`);
  await chunkedUpdate(updates);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
