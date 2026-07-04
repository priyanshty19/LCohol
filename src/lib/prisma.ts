import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function isLocalDb(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  // Local Postgres typically has no TLS; remote (Supabase pooler) presents a
  // cert that node-postgres (verify-full) rejects as self-signed, so require
  // encryption there but skip CA verification.
  const adapter = new PrismaPg({
    connectionString: url,
    ssl: isLocalDb(url) ? false : { rejectUnauthorized: false },
    // Per-instance pool size. DATABASE_URL now targets Supabase's TRANSACTION
    // pooler (port 6543), which multiplexes many client connections onto a small
    // server-side pool — so the old `max: 1` (needed for the session pooler's
    // 15-client cap on 5432) is obsolete AND harmful: it serialized the ~6
    // concurrent RSC prefetches Next fires on a cold start onto one connection,
    // so the queued ones hit connectionTimeoutMillis and tripped the 503 pool
    // guard (self-healing on retry, but visible). 5 lets a prefetch burst render
    // in parallel; the transaction pooler absorbs 5×(instances) fine.
    max: isLocalDb(url) ? 10 : 5,
    // Release the connection back to the pooler when idle so warm instances
    // don't sit on a slot longer than needed, and fail fast instead of hanging
    // when the pool is saturated.
    idleTimeoutMillis: isLocalDb(url) ? 0 : 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
