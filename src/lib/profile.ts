import { prisma } from "@/lib/prisma";
import { areConnected } from "@/lib/connections";

export type ViewerRelationship = "self" | "connected" | "incoming" | "outgoing" | "none";

// Profile + the viewer's relationship to it (for the circle action button).
// Shared by the API route and the profile page server component.
export async function getProfileWithViewer(username: string, viewerId?: string | null) {
  const profile = await prisma.profile.findUnique({
    where: { username },
    include: {
      user: {
        select: {
          createdAt: true,
          _count: { select: { posts: true, comments: true } },
        },
      },
      favoriteDrink: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!profile) return null;

  let relationship: ViewerRelationship = "none";
  let requestId: string | null = null;
  try {
    if (viewerId) {
      if (viewerId === profile.userId) {
        relationship = "self";
      } else if (await areConnected(viewerId, profile.userId)) {
        relationship = "connected";
      } else {
        const pending = await prisma.connectionRequest.findFirst({
          where: {
            status: "PENDING",
            OR: [
              { fromUserId: viewerId, toUserId: profile.userId },
              { fromUserId: profile.userId, toUserId: viewerId },
            ],
          },
          select: { id: true, fromUserId: true },
        });
        if (pending) {
          relationship = pending.fromUserId === viewerId ? "outgoing" : "incoming";
          requestId = pending.id;
        }
      }
    }
  } catch {
    relationship = "none";
  }

  return { ...profile, viewer: { relationship, requestId } };
}
