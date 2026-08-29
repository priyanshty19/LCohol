import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeAnalyticsConsent } from "@/lib/analytics-consent";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function savedConsent(context: unknown): "granted" | "denied" | null {
  if (!context || typeof context !== "object" || Array.isArray(context)) return null;
  return normalizeAnalyticsConsent((context as { consent?: unknown }).consent);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, data: { consent: null } });
  }

  try {
    const preference = await prisma.userInteraction.findFirst({
      where: {
        userId: user.id,
        interactionType: "VIEW",
        targetType: "FEATURE",
        context: { path: ["feature"], equals: "analytics_consent" },
      },
      orderBy: { createdAt: "desc" },
      select: { context: true, createdAt: true },
    });
    return NextResponse.json({
      authenticated: true,
      data: {
        consent: savedConsent(preference?.context),
        updatedAt: preference?.createdAt ?? null,
      },
    });
  } catch (error) {
    if (isPoolExhausted(error)) return poolBusyResponse();
    console.error("[api/privacy/analytics] GET", error);
    return NextResponse.json({ error: "Couldn't load your privacy choice." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  if (!(await rateLimit(`analytics-consent:${user.id}`, 12, 60_000))) {
    return NextResponse.json(
      { error: "Too many preference changes. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const consent = normalizeAnalyticsConsent(body.consent);
  if (!consent) {
    return NextResponse.json({ error: "Choose essential only or allow analytics." }, { status: 400 });
  }

  try {
    const updated = await prisma.userInteraction.create({
      data: {
        userId: user.id,
        interactionType: "VIEW",
        targetType: "FEATURE",
        context: { feature: "analytics_consent", consent },
      },
      select: { context: true, createdAt: true },
    });

    return NextResponse.json({
      data: {
        consent: savedConsent(updated.context),
        updatedAt: updated.createdAt,
      },
    });
  } catch (error) {
    if (isPoolExhausted(error)) return poolBusyResponse();
    console.error("[api/privacy/analytics]", error);
    return NextResponse.json({ error: "Couldn't save your privacy choice." }, { status: 500 });
  }
}
