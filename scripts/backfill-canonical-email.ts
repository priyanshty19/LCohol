import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { canonicalizeEmail } from "../src/lib/email-normalize";

// Canonicalize existing user emails (+authId) so the new lookup path finds them.
// SAFE: dry-run by default; run with --apply to write. NEVER auto-collapses two
// real accounts that share a canonical form — those are flagged for manual merge.

const APPLY = process.argv.includes("--apply");

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, authId: true } });

  const byCanonical = new Map<string, { id: string; email: string; authId: string }[]>();
  for (const u of users) {
    const c = canonicalizeEmail(u.email);
    const arr = byCanonical.get(c) ?? [];
    arr.push(u);
    byCanonical.set(c, arr);
  }

  const collisions: string[] = [];
  const changes: { id: string; from: string; to: string }[] = [];
  for (const [canonical, group] of byCanonical) {
    if (group.length > 1) {
      collisions.push(`${canonical}  ←  [${group.map((g) => g.email).join(", ")}]`);
      continue; // two real accounts → manual merge, never auto-collapse
    }
    const u = group[0];
    if (u.email !== canonical || u.authId !== canonical) {
      changes.push({ id: u.id, from: u.email, to: canonical });
    }
  }

  console.log(`Users scanned: ${users.length}`);
  console.log(`\nCOLLISIONS — two accounts share a canonical email (MANUAL MERGE, untouched): ${collisions.length}`);
  collisions.forEach((c) => console.log("  ⚠ " + c));
  console.log(`\nCHANGES — canonicalize email + authId: ${changes.length}`);
  changes.forEach((c) => console.log(`  ${c.from}  →  ${c.to}`));

  if (!APPLY) {
    console.log("\nDRY RUN. Re-run with --apply to write the changes.");
  } else {
    for (const c of changes) {
      await prisma.user.update({ where: { id: c.id }, data: { email: c.to, authId: c.to } });
    }
    console.log(`\nAPPLIED ${changes.length} updates.`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("backfill failed:", e);
  process.exit(1);
});
