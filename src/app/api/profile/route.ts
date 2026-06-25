import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProfileWithViewer } from "@/lib/profile";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const me = await getCurrentUser();
  const data = await getProfileWithViewer(username, me?.id ?? null);

  if (!data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
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
    emailNotifications,
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
      ...(typeof emailNotifications === "boolean" ? { emailNotifications } : {}),
      ...(onboarded ? { onboardedAt: new Date() } : {}),
      ...(geoDismissed ? { geoDismissedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ data: updated });
}
