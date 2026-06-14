import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CATEGORIES, TAGS } from "../scripts/seed-categories";
import { DRINKS } from "../scripts/seed-drinks";

const dbUrl = process.env.DATABASE_URL!;
console.log(`Connecting to: ${dbUrl.replace(/\/\/.*@/, "//***@")}`);
const adapter = new PrismaPg({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...\n");

  // 1. Seed categories and subcategories
  console.log("📁 Seeding categories...");
  const categoryMap = new Map<string, string>();
  const subcategoryMap = new Map<string, string>();

  for (const cat of CATEGORIES) {
    const category = await prisma.drinkCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        sortOrder: cat.sortOrder,
      },
    });
    categoryMap.set(cat.slug, category.id);

    for (const sub of cat.subcategories) {
      const subcategory = await prisma.drinkSubcategory.upsert({
        where: { slug: sub.slug },
        update: {},
        create: {
          categoryId: category.id,
          name: sub.name,
          slug: sub.slug,
          sortOrder: sub.sortOrder,
        },
      });
      subcategoryMap.set(sub.slug, subcategory.id);
    }
  }
  console.log(`  ✓ ${CATEGORIES.length} categories, ${subcategoryMap.size} subcategories\n`);

  // 2. Seed tags
  console.log("🏷️  Seeding tags...");
  for (const tag of TAGS) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: {
        name: tag.name,
        slug: tag.slug,
        tagType: tag.tagType as any,
      },
    });
  }
  console.log(`  ✓ ${TAGS.length} tags\n`);

  // 3. Seed drinks
  console.log("🥃 Seeding drinks...");
  let drinkCount = 0;

  for (const drink of DRINKS) {
    const categoryId = categoryMap.get(drink.categorySlug);
    const subcategoryId = subcategoryMap.get(drink.subcategorySlug);

    if (!categoryId) {
      console.warn(`  ⚠ Skipping ${drink.name}: category "${drink.categorySlug}" not found`);
      continue;
    }

    const created = await prisma.drink.upsert({
      where: { slug: drink.slug },
      update: {},
      create: {
        name: drink.name,
        slug: drink.slug,
        brand: drink.brand,
        variant: drink.variant || null,
        categoryId,
        subcategoryId: subcategoryId || null,
        country: drink.country,
        abv: drink.abv,
        priceRange: drink.priceRange as any,
        description: drink.description || null,
        isVerified: true,
        tasteProfile: {
          create: drink.taste,
        },
        occasions: {
          create: drink.occasions.map((o) => ({ occasion: o as any })),
        },
        moods: {
          create: drink.moods.map((m) => ({ mood: m as any })),
        },
        foodPairings: {
          create: drink.foodPairings.map((f) => ({ food: f })),
        },
      },
    });

    drinkCount++;
    if (drinkCount % 10 === 0) {
      console.log(`  ... ${drinkCount} drinks seeded`);
    }
  }
  console.log(`  ✓ ${drinkCount} drinks total\n`);

  // 4. Seed ingredients for cocktail creator (Phase 1.5 ready)
  console.log("🧊 Seeding ingredients...");
  const ingredients = [
    // Spirits
    { name: "Vodka", slug: "vodka-spirit", category: "SPIRIT" },
    { name: "Gin", slug: "gin-spirit", category: "SPIRIT" },
    { name: "White Rum", slug: "white-rum-spirit", category: "SPIRIT" },
    { name: "Dark Rum", slug: "dark-rum-spirit", category: "SPIRIT" },
    { name: "Tequila", slug: "tequila-spirit", category: "SPIRIT" },
    { name: "Whisky", slug: "whisky-spirit", category: "SPIRIT" },
    { name: "Bourbon", slug: "bourbon-spirit", category: "SPIRIT" },
    { name: "Brandy", slug: "brandy-spirit", category: "SPIRIT" },
    // Mixers
    { name: "Tonic Water", slug: "tonic-water", category: "MIXER" },
    { name: "Soda Water", slug: "soda-water", category: "MIXER" },
    { name: "Cola", slug: "cola", category: "MIXER" },
    { name: "Ginger Ale", slug: "ginger-ale", category: "MIXER" },
    { name: "Ginger Beer", slug: "ginger-beer", category: "MIXER" },
    { name: "Red Bull", slug: "red-bull", category: "MIXER" },
    { name: "Coconut Water", slug: "coconut-water", category: "MIXER" },
    // Juices
    { name: "Orange Juice", slug: "orange-juice", category: "JUICE" },
    { name: "Cranberry Juice", slug: "cranberry-juice", category: "JUICE" },
    { name: "Lime Juice", slug: "lime-juice", category: "JUICE" },
    { name: "Lemon Juice", slug: "lemon-juice", category: "JUICE" },
    { name: "Pineapple Juice", slug: "pineapple-juice", category: "JUICE" },
    { name: "Tomato Juice", slug: "tomato-juice", category: "JUICE" },
    { name: "Mango Juice", slug: "mango-juice", category: "JUICE" },
    // Syrups
    { name: "Simple Syrup", slug: "simple-syrup", category: "SYRUP" },
    { name: "Grenadine", slug: "grenadine", category: "SYRUP" },
    { name: "Honey", slug: "honey", category: "SYRUP" },
    // Bitters
    { name: "Angostura Bitters", slug: "angostura-bitters", category: "BITTERS" },
    { name: "Orange Bitters", slug: "orange-bitters", category: "BITTERS" },
    // Garnish
    { name: "Lime Wedge", slug: "lime-wedge", category: "GARNISH" },
    { name: "Lemon Twist", slug: "lemon-twist", category: "GARNISH" },
    { name: "Mint Leaves", slug: "mint-leaves", category: "GARNISH" },
    { name: "Orange Slice", slug: "orange-slice", category: "GARNISH" },
    { name: "Maraschino Cherry", slug: "maraschino-cherry", category: "GARNISH" },
    { name: "Cucumber", slug: "cucumber", category: "GARNISH" },
    { name: "Salt Rim", slug: "salt-rim", category: "GARNISH" },
    // Ice
    { name: "Ice Cubes", slug: "ice-cubes", category: "ICE" },
    { name: "Crushed Ice", slug: "crushed-ice", category: "ICE" },
    // Other
    { name: "Tabasco", slug: "tabasco", category: "OTHER" },
    { name: "Worcestershire Sauce", slug: "worcestershire", category: "OTHER" },
    { name: "Cream", slug: "cream", category: "OTHER" },
    { name: "Egg White", slug: "egg-white", category: "OTHER" },
    { name: "Sugar", slug: "sugar", category: "OTHER" },
    { name: "Black Pepper", slug: "black-pepper", category: "OTHER" },
    { name: "Cinnamon", slug: "cinnamon", category: "OTHER" },
    { name: "Nutmeg", slug: "nutmeg", category: "OTHER" },
  ];

  for (const ing of ingredients) {
    await prisma.ingredient.upsert({
      where: { slug: ing.slug },
      update: {},
      create: {
        name: ing.name,
        slug: ing.slug,
        category: ing.category as any,
      },
    });
  }
  console.log(`  ✓ ${ingredients.length} ingredients\n`);

  console.log("✅ Seed complete!");
  console.log(`   ${CATEGORIES.length} categories`);
  console.log(`   ${subcategoryMap.size} subcategories`);
  console.log(`   ${drinkCount} drinks`);
  console.log(`   ${TAGS.length} tags`);
  console.log(`   ${ingredients.length} ingredients`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
