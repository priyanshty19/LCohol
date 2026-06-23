import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client";

type NotifyInput = {
  userId: string; // recipient
  actorId?: string | null;
  type: NotificationType;
  postId?: string | null;
  commentId?: string | null;
  partyId?: string | null;
};

// Create a notification. Never notifies a user about their own action, and is
// best-effort (a failed notification must never break the action that caused it).
export async function notify(input: NotifyInput): Promise<void> {
  if (input.actorId && input.actorId === input.userId) return;
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        actorId: input.actorId ?? null,
        type: input.type,
        postId: input.postId ?? null,
        commentId: input.commentId ?? null,
        partyId: input.partyId ?? null,
      },
    });
  } catch (e) {
    console.error("[notify]", e);
  }
}

export async function notifyMany(
  recipientIds: string[],
  base: Omit<NotifyInput, "userId">
): Promise<void> {
  const unique = Array.from(new Set(recipientIds)).filter(
    (id) => id !== base.actorId
  );
  if (!unique.length) return;
  try {
    await prisma.notification.createMany({
      data: unique.map((userId) => ({
        userId,
        actorId: base.actorId ?? null,
        type: base.type,
        postId: base.postId ?? null,
        commentId: base.commentId ?? null,
        partyId: base.partyId ?? null,
      })),
    });
  } catch (e) {
    console.error("[notifyMany]", e);
  }
}
