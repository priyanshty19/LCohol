import { prisma } from "@/lib/prisma";
import { getConnectionUserIds } from "@/lib/connections";
import { notify } from "@/lib/notifications";
import type { NotificationType } from "@/generated/prisma/client";

const MENTION_RE = /@([a-zA-Z0-9_]{2,30})/g;

/** Extract @username tokens from text (exact-case, deduped, capped). */
export function parseMentionUsernames(body: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(body)) !== null) out.add(m[1]);
  return Array.from(out).slice(0, 10);
}

/**
 * Resolve @usernames in `body` to the mentioner's CIRCLE members, persist
 * Mention rows + notifications. Mentions are restricted to the circle (you can
 * only tag/mention people you're connected to). Best-effort — never throws.
 */
export async function persistMentions(opts: {
  mentionerId: string;
  body: string;
  postId?: string | null;
  commentId?: string | null;
  notifyType: NotificationType; // MENTION (comment) or TAG (post)
}): Promise<string[]> {
  try {
    const usernames = parseMentionUsernames(opts.body);
    if (!usernames.length) return [];

    const circle = new Set(await getConnectionUserIds(opts.mentionerId));
    const profiles = await prisma.profile.findMany({
      where: { username: { in: usernames } },
      select: { userId: true },
    });
    const targets = profiles
      .map((p) => p.userId)
      .filter((uid) => circle.has(uid) && uid !== opts.mentionerId);

    if (!targets.length) return [];

    await prisma.mention.createMany({
      data: targets.map((mentionedId) => ({
        mentionerId: opts.mentionerId,
        mentionedId,
        postId: opts.postId ?? null,
        commentId: opts.commentId ?? null,
      })),
    });
    await Promise.all(
      targets.map((userId) =>
        notify({
          userId,
          actorId: opts.mentionerId,
          type: opts.notifyType,
          postId: opts.postId ?? null,
          commentId: opts.commentId ?? null,
        })
      )
    );
    return targets;
  } catch (e) {
    console.error("[persistMentions]", e);
    return [];
  }
}
