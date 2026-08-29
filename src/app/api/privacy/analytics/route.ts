import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeAnalyticsConsent } from "@/lib/analytics-consent";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function consentLabel(value: boolean | null): "granted" | "denied" | null {
  return value === null ? null : value ? "granted" : "denied";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, data: { consent: null } });
  }

  return NextResponse.json({
    authenticated: true,
    data: {
      consent: consentLabel(user.analyticsConsent),
      updatedAt: user.analyticsConsentUpdatedAt,
    },
  });
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
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        analyticsConsent: consent === "granted",
        analyticsConsentUpdatedAt: new Date(),
      },
      select: { analyticsConsent: true, analyticsConsentUpdatedAt: true },
    });

    return NextResponse.json({
      data: {
        consent: consentLabel(updated.analyticsConsent),
        updatedAt: updated.analyticsConsentUpdatedAt,
      },
    });
  } catch (error) {
    if (isPoolExhausted(error)) return poolBusyResponse();
    console.error("[api/privacy/analytics]", error);
    return NextResponse.json({ error: "Couldn't save your privacy choice." }, { status: 500 });
  }
}
