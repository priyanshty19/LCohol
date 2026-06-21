import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Connections (the "circle") are stored once per pair in canonical order
 * (userAId < userBId) so the unique pair index blocks duplicates regardless of
 * who invited whom.
 */
export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Create the mutual connection for a pair if it doesn't already exist. */
export async function createConnectionTx(
  tx: Prisma.TransactionClient,
  a: string,
  b: string,
  referralId?: string,
): Promise<void> {
  if (a === b) return;
  const [userAId, userBId] = canonicalPair(a, b);
  await tx.connection.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId, referralId },
    update: {},
  });
}

/** Whether two users are already in each other's circle. */
export async function areConnected(a: string, b: string): Promise<boolean> {
  if (a === b) return true;
  const [userAId, userBId] = canonicalPair(a, b);
  const row = await prisma.connection.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true },
  });
  return Boolean(row);
}

/** All user ids connected to `userId` (the other side of each connection). */
export async function getConnectionUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.connection.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    select: { userAId: true, userBId: true },
  });
  return rows.map((r) => (r.userAId === userId ? r.userBId : r.userAId));
}
