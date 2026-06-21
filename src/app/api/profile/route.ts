import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { areConnected } from "@/lib/connections";

type ViewerRelationship = "self" | "connected" | "incoming" | "outgoing" | "none";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { username },
    include: {
      user: {
        select: {
          createdAt: true,
          _count: { select: { posts: true, comments: true } },
        },
      },
      favoriteDrink: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Relationship of the signed-in viewer to this profile, so the page can show
  // the right circle action. Wrapped defensively so a DB without the social
  // tables still serves the profile.
  let relationship: ViewerRelationship = "none";
  let requestId: string | null = null;
  try {
    const me = await getCurrentUser();
    if (me) {
      if (me.id === profile.userId) {
        relationship = "self";
      } else if (await areConnected(me.id, profile.userId)) {
        relationship = "connected";
      } else {
        const pending = await prisma.connectionRequest.findFirst({
          where: {
            status: "PENDING",
            OR: [
              { fromUserId: me.id, toUserId: profile.userId },
              { fromUserId: profile.userId, toUserId: me.id },
            ],
          },
          select: { id: true, fromUserId: true },
        });
        if (pending) {
          relationship = pending.fromUserId === me.id ? "outgoing" : "incoming";
          requestId = pending.id;
        }
      }
    }
  } catch {
    relationship = "none";
  }

  return NextResponse.json({
    data: { ...profile, viewer: { relationship, requestId } },
  });
}

export async function PATCH(request: Request) {
  const dbUser = await getCurrentUser();
  if (!dbUser || !dbUser.profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    displayName,
    bio,
    drinkingStyle,
    city,
    state,
    emergencyPhone,
    preferredSpirits,
    preferredFlavours,
    intensity,
    intent,
    theme,
    onboarded,
    geoDismissed,
  } = body;

  // Whitelist the theme value so a client can't write arbitrary data-theme.
  const ALLOWED_THEMES = new Set([
    "dark",
    "light",
    "party",
    "chill",
    "date-night",
    "celebrate",
    "solo",
    "budget",
  ]);

  const updated = await prisma.profile.update({
    where: { id: dbUser.profile.id },
    data: {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(drinkingStyle !== undefined ? { drinkingStyle } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(state !== undefined ? { state } : {}),
      ...(emergencyPhone !== undefined ? { emergencyPhone } : {}),
      ...(Array.isArray(preferredSpirits)
        ? { preferredSpirits: preferredSpirits.slice(0, 12).map(String) }
        : {}),
      ...(Array.isArray(preferredFlavours)
        ? { preferredFlavours: preferredFlavours.slice(0, 16).map(String) }
        : {}),
      ...(typeof intensity === "string" ? { intensity: intensity.slice(0, 20) } : {}),
      ...(typeof intent === "string" ? { intent: intent.slice(0, 20) } : {}),
      ...(typeof theme === "string" && ALLOWED_THEMES.has(theme) ? { theme } : {}),
      ...(onboarded ? { onboardedAt: new Date() } : {}),
      ...(geoDismissed ? { geoDismissedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}
