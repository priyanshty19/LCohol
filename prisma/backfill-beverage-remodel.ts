import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// P0 Stage 1b — backfill the additive re-model tables (Category, Beverage,
// DrinkProfile, Recipe, BeverageIngredient) from the legacy Drink /
// CocktailCreation / CocktailIngredient rows. Idempotent + reversible:
//   - Beverages keyed by legacyDrinkId / legacyCocktailId (createMany skipDuplicates)
//   - DrinkProfile / Recipe / BeverageIngredient are cleared + rebuilt (only this
//     script writes them), so re-running converges.
// Reads NOTHING from these tables in the app yet — this only stages data.

function isLocalDb(url: string | undefined): boolean {
  if (!url) return false;
  try { return ["localhost", "127.0.0.1"].includes(new URL(url).hostname); } catch { return false; }
}
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalDb(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

function catKind(name: string): string {
  const n = name.toLowerCase();
  if (/beer|lager|\bale\b|stout|cider/.test(n)) return "beer";
  if (/wine|champagne|sparkling|prosecco|sake/.test(n)) return "wine";
  if (/liqueur/.test(n)) return "liqueur";
  return "spirit";
}

async function chunked<T>(rows: T[], size: number, fn: (batch: T[]) => Promise<void>) {
  for (let i = 0; i < rows.length; i += size) await fn(rows.slice(i, i + size));
}

async function main() {
  // 1) Categories (from the drink taxonomy + distinct cocktail category slugs)
  const catBySlug = new Map<string, string>();
  const drinkCats = await prisma.drinkCategory.findMany({ select: { name: true, slug: true, sortOrder: true } });
  for (const dc of drinkCats) {
    const c = await prisma.category.upsert({
      where: { slug: dc.slug },
      update: { name: dc.name, kind: catKind(dc.name) },
      create: { name: dc.name, slug: dc.slug, kind: catKind(dc.name), sortOrder: dc.sortOrder ?? 0 },
    });
    catBySlug.set(dc.slug, c.id);
  }
  const cocktailCats = await prisma.cocktailCreation.findMany({
    where: { categorySlug: { not: null } },
    select: { categorySlug: true, category: true },
    distinct: ["categorySlug"],
  });
  for (const cc of cocktailCats) {
    const slug = cc.categorySlug!;
    if (catBySlug.has(slug)) continue;
    const c = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name: cc.category ?? slug, slug, kind: "theme" },
    });
    catBySlug.set(slug, c.id);
  }
  console.log(`Categories: ${catBySlug.size}`);

  // 2) Beverages — drinks first (own slugs), then cocktails (suffix on collision)
  const used = new Set<string>();
  const drinks = await prisma.drink.findMany({
    select: { id: true, name: true, slug: true, imageUrl: true, isUserSubmitted: true,
      brand: true, abv: true, priceRange: true, basePriceInr: true, country: true,
      category: { select: { slug: true } } },
  });
  const drinkBevRows = drinks.map((d) => {
    used.add(d.slug);
    return {
      kind: "DRINK", name: d.name, slug: d.slug,
      categoryId: d.category ? catBySlug.get(d.category.slug) ?? null : null,
      imageUrl: d.imageUrl, isCurated: !d.isUserSubmitted, isPublic: true, legacyDrinkId: d.id,
    };
  });

  const cocktails = await prisma.cocktailCreation.findMany({
    select: { id: true, name: true, slug: true, imageUrl: true, isCurated: true, isPublic: true,
      authorId: true, categorySlug: true, instructions: true, glass: true, garnish: true,
      sourceBarId: true, sourceLabel: true },
  });
  const cocktailBevRows = cocktails.map((c) => {
    let slug = c.slug || `cocktail-${c.id.slice(0, 8)}`;
    if (used.has(slug)) slug = `${slug}-mix`;
    let s = slug; let n = 2;
    while (used.has(s)) s = `${slug}-${n++}`;
    used.add(s);
    return {
      kind: "COCKTAIL", name: c.name, slug: s,
      categoryId: c.categorySlug ? catBySlug.get(c.categorySlug) ?? null : null,
      imageUrl: c.imageUrl, isCurated: c.isCurated, isPublic: c.isPublic,
      authorId: c.authorId, legacyCocktailId: c.id,
    };
  });

  await prisma.beverage.createMany({ data: drinkBevRows, skipDuplicates: true });
  await chunked(cocktailBevRows, 1000, (b) => prisma.beverage.createMany({ data: b, skipDuplicates: true }).then(() => {}));
  console.log(`Beverages: ${drinkBevRows.length} drinks + ${cocktailBevRows.length} cocktails`);

  // 3) Map legacy ids -> beverage ids
  const bevs = await prisma.beverage.findMany({ select: { id: true, legacyDrinkId: true, legacyCocktailId: true } });
  const bevByDrink = new Map<string, string>();
  const bevByCocktail = new Map<string, string>();
  for (const b of bevs) {
    if (b.legacyDrinkId) bevByDrink.set(b.legacyDrinkId, b.id);
    if (b.legacyCocktailId) bevByCocktail.set(b.legacyCocktailId, b.id);
  }

  // 4) Clear + rebuild the 1:1 / child tables (only this script writes them)
  await prisma.beverageIngredient.deleteMany({});
  await prisma.drinkProfile.deleteMany({});
  await prisma.recipe.deleteMany({});

  const profileRows = drinks
    .map((d) => {
      const id = bevByDrink.get(d.id);
      return id ? { beverageId: id, brand: d.brand, abv: d.abv, priceRange: d.priceRange, basePriceInr: d.basePriceInr, country: d.country } : null;
    })
    .filter(Boolean) as object[];
  await chunked(profileRows, 1000, (b) => prisma.drinkProfile.createMany({ data: b as never }).then(() => {}));

  const recipeRows = cocktails
    .map((c) => {
      const id = bevByCocktail.get(c.id);
      return id ? { beverageId: id, instructions: c.instructions, glass: c.glass, garnish: c.garnish, sourceBarId: c.sourceBarId, sourceLabel: c.sourceLabel } : null;
    })
    .filter(Boolean) as object[];
  await chunked(recipeRows, 1000, (b) => prisma.recipe.createMany({ data: b as never }).then(() => {}));
  console.log(`DrinkProfiles: ${profileRows.length} · Recipes: ${recipeRows.length}`);

  // 5) BeverageIngredient from CocktailIngredient
  const cis = await prisma.cocktailIngredient.findMany({
    select: { cocktailId: true, drinkId: true, quantity: true, unit: true, sortOrder: true,
      ingredient: { select: { name: true } } },
  });
  const biRows = cis
    .map((ci) => {
      const recipeBevId = bevByCocktail.get(ci.cocktailId);
      if (!recipeBevId) return null;
      const ingredientBevId = ci.drinkId ? bevByDrink.get(ci.drinkId) ?? null : null;
      return {
        recipeBevId,
        ingredientBevId,
        freeText: ingredientBevId ? null : ci.ingredient?.name ?? null,
        quantity: ci.quantity, unit: ci.unit, sortOrder: ci.sortOrder,
      };
    })
    .filter(Boolean) as object[];
  await chunked(biRows, 1000, (b) => prisma.beverageIngredient.createMany({ data: b as never }).then(() => {}));
  console.log(`BeverageIngredients: ${biRows.length}`);

  // 6) Verify
  const [bevCount, drinkCount, cocktailCount] = await Promise.all([
    prisma.beverage.count(),
    prisma.drink.count(),
    prisma.cocktailCreation.count(),
  ]);
  console.log(`\nVERIFY: beverages=${bevCount} (expected ~${drinkCount + cocktailCount}) · drinks=${drinkCount} · cocktails=${cocktailCount}`);
  console.log("Stage 1b backfill done. App still reads legacy tables — nothing switched.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
