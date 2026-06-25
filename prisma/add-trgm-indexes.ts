import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Adds pg_trgm GIN indexes for the leading-wildcard ILIKE substring searches the
// app actually runs. A plain btree index can't serve `contains` (leading %), so
// these are the real fix for search latency as tables grow. Idempotent (IF NOT
// EXISTS) and safe to re-run. Expressed as raw SQL because GIN trgm ops aren't
// cleanly modeled in the Prisma schema here.

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

const STATEMENTS: string[] = [
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  `CREATE INDEX IF NOT EXISTS idx_trgm_cocktail_name ON cocktail_creations USING gin (name gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_trgm_drink_name ON drinks USING gin (name gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_trgm_drink_brand ON drinks USING gin (brand gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_trgm_post_title ON posts USING gin (title gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_trgm_bar_name ON bars USING gin (name gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_trgm_profile_username ON profiles USING gin (username gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_trgm_profile_displayname ON profiles USING gin (display_name gin_trgm_ops)`,
];

async function main() {
  for (const sql of STATEMENTS) {
    process.stdout.write(`  ${sql.slice(0, 70)}… `);
    await prisma.$executeRawUnsafe(sql);
    console.log("ok");
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error("\nFAILED:", e?.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
