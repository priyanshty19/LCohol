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

  // Pseudonymity: only the owner sees their private fields. Strip emergency
  // phone, taste prefs and notification settings for every other viewer — this
  // object is embedded in the profile page's SSR/RSC payload.
  const isOwner = !!viewerId && viewerId === profile.userId;
  const safe = isOwner
    ? profile
    : {
        ...profile,
        emergencyPhone: null,
        preferredSpirits: [] as string[],
        preferredFlavours: [] as string[],
        intensity: null,
        intent: null,
        emailNotifications: false,
        geoDismissedAt: null,
      };

  return { ...safe, viewer: { relationship, requestId } };
}
