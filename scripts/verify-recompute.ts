import "dotenv/config";
import { recomputeSignals } from "../src/lib/signals/recompute";
import { prisma } from "../src/lib/prisma";

async function main() {
  const t0 = Date.now();
  const result = await recomputeSignals();
  const ms = Date.now() - t0;
  const taste = await prisma.userTasteVector.count();
  const sims = await prisma.itemSimilarity.count();
  console.log("recompute result:", JSON.stringify(result));
  console.log(`tables → userTasteVector=${taste} itemSimilarity=${sims} (took ${ms}ms)`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("RECOMPUTE FAILED:", e);
  process.exit(1);
});
