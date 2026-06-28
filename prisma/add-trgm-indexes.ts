import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Adds pg_trgm GIN indexes for the leading-wildcard ILIKE substring searches the
// app runs. A plain btree index can't serve `contains` (leading %), so these are
// the real fix for search latency as tables grow (~10k cocktails). Idempotent
// (IF NOT EXISTS), safe to re-run. Raw SQL because GIN trgm ops aren't cleanly
// modeled in schema.prisma, and the project uses `db push` (no migrations dir).
//
// RUN AGAINST PROD (operator step — agent does not write prod):
//   npx tsx prisma/add-trgm-indexes.ts
//
// IMPORTANT:
// - Uses DIRECT_URL (session/5432) — CREATE INDEX CONCURRENTLY cannot run over
//   the transaction pooler (6543), and CONCURRENTLY avoids locking the table
//   while the index builds on a live prod table.
// - CONCURRENTLY must not run inside a transaction; $executeRawUnsafe issues each
//   statement on its own, so that holds here.

function isLocalDb(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

// Prefer the direct/session connection: CONCURRENTLY needs a real session, not
// the transaction pooler.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const adapter = new PrismaPg({
  connectionString: url,
  ssl: isLocalDb(url) ? false : { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

const STATEMENTS: string[] = [
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  // Cocktails
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_cocktail_name ON cocktail_creations USING gin (name gin_trgm_ops)`,
  // Drinks — name, brand, and description (the search ORs over all three)
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_drink_name ON drinks USING gin (name gin_trgm_ops)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_drink_brand ON drinks USING gin (brand gin_trgm_ops)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_drink_description ON drinks USING gin (description gin_trgm_ops)`,
  // Posts
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_post_title ON posts USING gin (title gin_trgm_ops)`,
  // Bars — name, address, description
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_bar_name ON bars USING gin (name gin_trgm_ops)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_bar_address ON bars USING gin (address gin_trgm_ops)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_bar_description ON bars USING gin (description gin_trgm_ops)`,
  // Profiles
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_profile_username ON profiles USING gin (username gin_trgm_ops)`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trgm_profile_displayname ON profiles USING gin (display_name gin_trgm_ops)`,
];

async function main() {
  if (!url) {
    console.error("No DIRECT_URL or DATABASE_URL set.");
    process.exit(1);
  }
  for (const sql of STATEMENTS) {
    process.stdout.write(`  ${sql.slice(0, 78)}… `);
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("ok");
    } catch (e) {
      // CONCURRENTLY can leave an INVALID index if interrupted; report and continue.
      console.log("FAILED:", (e as Error)?.message ?? e);
    }
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("\nFAILED:", e?.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
