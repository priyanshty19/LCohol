import { prisma } from "@/lib/prisma";

// Karma = an activity metric: circle friends + posts shared + posts interacted
// with (votes cast) + comments written. Stored on Profile.shots (DB col "karma")
// and recomputed on the actions that change it (cheap reads for lists).

export async function computeKarma(userId: string): Promise<number> {
  const [friends, shared, interacted, comments] = await Promise.all([
    prisma.connection.count({ where: { OR: [{ userAId: userId }, { userBId: userId }] } }),
    prisma.postShare.count({ where: { sharerId: userId } }),
    prisma.vote.count({ where: { userId } }),
    prisma.comment.count({ where: { authorId: userId, isDeleted: false } }),
  ]);
  return friends + shared + interacted + comments;
}

// Best-effort: a karma update must never break the action that triggered it.
export async function recomputeKarma(userId: string): Promise<void> {
  try {
    const karma = await computeKarma(userId);
    await prisma.profile.update({ where: { userId }, data: { shots: karma } });
  } catch (e) {
    console.error("[recomputeKarma]", e);
  }
}
