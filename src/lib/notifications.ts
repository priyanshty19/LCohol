import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPush } from "@/lib/push";
import { sendNotificationEmail } from "@/lib/email";
import type { NotificationType } from "@/generated/prisma/client";

type NotifyInput = {
  userId: string; // recipient
  actorId?: string | null;
  type: NotificationType;
  postId?: string | null;
  commentId?: string | null;
  partyId?: string | null;
};

// Human-readable phrasing per type (used for push body + email subject). Mirrors
// the bell's client-side labels.
const NOTIF_LABELS: Record<NotificationType, string> = {
  MENTION: "mentioned you in a comment",
  TAG: "tagged you in a post",
  SHARE: "shared your post",
  SEND: "sent you a post",
  PARTY_INVITE: "invited you to a party",
  RSVP: "responded to your party",
  CIRCLE_POST: "shared a new post",
};

// High-value events that also go to email (push covers everything). Keeps inboxes
// quiet — only invites, RSVPs, and new circle/private-feed posts email.
const EMAIL_TYPES = new Set<NotificationType>(["PARTY_INVITE", "RSVP", "CIRCLE_POST"]);

function urlFor(base: Pick<NotifyInput, "type" | "postId" | "partyId">): string {
  if (base.type === "PARTY_INVITE" || base.type === "RSVP") {
    return base.partyId ? `/parties/${base.partyId}` : "/parties";
  }
  return base.postId ? `/post/${base.postId}` : "/";
}

async function actorName(actorId: string): Promise<string> {
  const p = await prisma.profile.findUnique({
    where: { userId: actorId },
    select: { displayName: true, username: true },
  });
  return p?.displayName ?? p?.username ?? "Someone";
}

// Fan a created notification out to Web Push (all recipients) + email (high-value
// only), AFTER the HTTP response is sent so the triggering action is never slowed.
function fanOut(recipientIds: string[], base: Omit<NotifyInput, "userId">) {
  const ids = Array.from(new Set(recipientIds)).filter((id) => id !== base.actorId);
  if (!ids.length) return;
  try {
    after(async () => {
      try {
        const name = base.actorId ? await actorName(base.actorId) : "Someone";
        const label = NOTIF_LABELS[base.type] ?? "sent you a notification";
        const url = urlFor(base);
        const payload = { title: "Sip Stories", body: `${name} ${label}`, url, tag: base.type };
        await Promise.all(ids.map((id) => sendPush(id, payload)));
        if (EMAIL_TYPES.has(base.type)) {
          await Promise.all(
            ids.map((id) => sendNotificationEmail(id, { actorName: name, label, url })),
          );
        }
      } catch (e) {
        console.error("[fanOut]", e);
      }
    });
  } catch {
    // after() requires a request scope; if absent, the DB notification still
    // exists (the bell works) — only push/email is skipped.
  }
}

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
    fanOut([input.userId], input);
  } catch (e) {
    console.error("[notify]", e);
  }
}

export async function notifyMany(
  recipientIds: string[],
  base: Omit<NotifyInput, "userId">,
): Promise<void> {
  const unique = Array.from(new Set(recipientIds)).filter((id) => id !== base.actorId);
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
    fanOut(unique, base);
  } catch (e) {
    console.error("[notifyMany]", e);
  }
}
