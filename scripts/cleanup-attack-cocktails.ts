import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// One-off cleanup for the abuse test that spammed ~1000 CocktailCreation rows
// named "FUCKER" via POST /api/cocktails/create (no rate limit at the time).
// CocktailIngredient has onDelete: Cascade on cocktailId, so deleting the parent
// removes its layers too.
//
// SAFE BY DEFAULT: dry-run unless you pass --apply. Scoped tightly to the attack
// signature (exact name, user-created only) so it can't touch curated catalog.
//
//   npx tsx scripts/cleanup-attack-cocktails.ts            # dry run (counts only)
//   npx tsx scripts/cleanup-attack-cocktails.ts --apply    # actually delete
//
// Override the signature:
//   ATTACK_NAME="FUCKER" ...                  # exact name match (default "FUCKER")
//   ATTACK_NAME_PREFIX="loadtest-" ...        # prefix match (e.g. k6 harness rows)

const APPLY = process.argv.includes("--apply");
const ATTACK_NAME = process.env.ATTACK_NAME ?? "FUCKER";
const ATTACK_NAME_PREFIX = process.env.ATTACK_NAME_PREFIX ?? "";

async function main() {
  // Prefix match (load-test sweep) takes precedence when set; else exact name.
  const where = ATTACK_NAME_PREFIX
    ? ({ name: { startsWith: ATTACK_NAME_PREFIX }, isCurated: false } as const)
    : ({ name: ATTACK_NAME, isCurated: false } as const);

  const matches = await prisma.cocktailCreation.findMany({
    where,
    select: { id: true, slug: true, authorId: true, isPublic: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Signature: name="${ATTACK_NAME}" AND isCurated=false`);
  console.log(`Matched rows: ${matches.length}`);
  if (matches.length) {
    const authors = new Set(matches.map((m) => m.authorId));
    console.log(`Distinct authors: ${authors.size}`);
    console.log("Sample:", matches.slice(0, 3).map((m) => ({ slug: m.slug, isPublic: m.isPublic })));
  }

  if (!APPLY) {
    console.log("\nDRY RUN — nothing deleted. Re-run with --apply to delete.");
    await prisma.$disconnect();
    return;
  }

  if (!matches.length) {
    console.log("Nothing to delete.");
    await prisma.$disconnect();
    return;
  }

  // deleteMany on the parent; ingredient layers cascade.
  const result = await prisma.cocktailCreation.deleteMany({ where });
  console.log(`\nDeleted ${result.count} rows (ingredient layers cascaded).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("cleanup failed:", e);
  process.exit(1);
});
