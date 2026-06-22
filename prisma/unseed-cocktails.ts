import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { EDITORIAL_USERNAME } from "./seed-cocktails";

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

const args = new Set(process.argv.slice(2));
const ALL = args.has("--all");
const PURGE_USER = args.has("--purge-user");
const PURGE_INGREDIENTS = args.has("--purge-ingredients");

async function main() {
  console.log("🧹 Unseed cocktails…");
  console.log(`   flags: ${ALL ? "--all " : ""}${PURGE_USER ? "--purge-user " : ""}${PURGE_INGREDIENTS ? "--purge-ingredients" : ""}`.trim() || "   (default: synthetic only)");

  const user = await prisma.user.findFirst({
    where: { profile: { username: EDITORIAL_USERNAME } },
    select: { id: true },
  });
  if (!user) {
    console.log("   no sipstories user found — nothing to do.");
    return;
  }

  const where = ALL
    ? { authorId: user.id }
    : { authorId: user.id, isCurated: false };

  const target = await prisma.cocktailCreation.count({ where });
  console.log(`   deleting ${target} cocktail_creations rows (cocktail_ingredients cascade)…`);
  const del = await prisma.cocktailCreation.deleteMany({ where });
  console.log(`   ✓ deleted ${del.count}`);

  if (PURGE_USER) {
    if (!ALL) {
      console.log("   ⚠ --purge-user requires --all — skipping user purge.");
    } else {
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`   ✓ deleted user ${EDITORIAL_USERNAME}`);
    }
  }

  if (PURGE_INGREDIENTS) {
    // Drop orphaned ingredients (no remaining join rows).
    const orphans = await prisma.ingredient.findMany({
      where: { cocktailIngredients: { none: {} } },
      select: { id: true },
    });
    if (orphans.length > 0) {
      const ids = orphans.map((o) => o.id);
      const r = await prisma.ingredient.deleteMany({ where: { id: { in: ids } } });
      console.log(`   ✓ removed ${r.count} orphan ingredients`);
    } else {
      console.log("   no orphan ingredients to remove");
    }
  }

  console.log("\n✅ Done.");
}

main()
  .catch((e) => {
    console.error("❌ Unseed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
