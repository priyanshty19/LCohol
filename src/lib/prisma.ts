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
    // Serverless: cap the pool so concurrent Vercel function instances
    // don't exhaust Supabase's session-mode limit (pool_size=15).
    max: isLocalDb(url) ? 10 : 1,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
