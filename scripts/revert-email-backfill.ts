import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// One-off: undo the premature canonical-email backfill (restore original dotted
// Gmail addresses) until the canonicalizing code is deployed. Re-run
// backfill-canonical-email.ts --apply AFTER the PR ships.
const REVERT: [string, string][] = [
  ["priyanshtyagiwork@gmail.com", "priyanshtyagi.work@gmail.com"],
  ["bhancbhokda@gmail.com", "bhanc.bhokda@gmail.com"],
  ["bhardwajnidhi2001@gmail.com", "bhardwaj.nidhi2001@gmail.com"],
  ["hemangsinhaphotos@gmail.com", "hemangsinha.photos@gmail.com"],
];

async function main() {
  let n = 0;
  for (const [current, original] of REVERT) {
    const u = await prisma.user.findFirst({ where: { email: current }, select: { id: true } });
    if (!u) {
      console.log(`skip (not found): ${current}`);
      continue;
    }
    await prisma.user.update({ where: { id: u.id }, data: { email: original, authId: original } });
    console.log(`reverted ${current} → ${original}`);
    n++;
  }
  console.log(`\nReverted ${n} rows.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("revert failed:", e);
  process.exit(1);
});
