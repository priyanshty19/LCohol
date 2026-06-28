import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProfileWithViewer } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

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
  if (dbUser.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  if (!rateLimit(`profile-update:${dbUser.id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "You're updating your profile too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
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

  try {
    const updated = await prisma.profile.update({
      where: { id: dbUser.profile.id },
      data: {
        ...(displayName !== undefined
          ? { displayName: typeof displayName === "string" ? displayName.slice(0, 80) : displayName }
          : {}),
        ...(bio !== undefined
          ? { bio: typeof bio === "string" ? bio.slice(0, 500) : bio }
          : {}),
        ...(drinkingStyle !== undefined ? { drinkingStyle } : {}),
        ...(city !== undefined
          ? { city: typeof city === "string" ? city.slice(0, 80) : city }
          : {}),
        ...(state !== undefined
          ? { state: typeof state === "string" ? state.slice(0, 80) : state }
          : {}),
        ...(emergencyPhone !== undefined
          ? { emergencyPhone: typeof emergencyPhone === "string" ? emergencyPhone.slice(0, 20) : emergencyPhone }
          : {}),
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
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/profile PATCH] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/profile PATCH]", err);
    return NextResponse.json({ error: "Couldn't update your profile." }, { status: 500 });
  }
}
