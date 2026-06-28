import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";
import {
  REFERRAL_MAX_ACTIVE,
  countActiveReferrals,
  expireStaleReferrals,
  generateUniqueReferralCode,
  referralExpiry,
} from "@/lib/referrals";

const referralSelect = {
  id: true,
  code: true,
  label: true,
  status: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
  acceptedBy: { select: { profile: { select: { username: true } } } },
} as const;

// GET /api/referrals — my invites + how many active slots are in use.
export async function GET() {
  const guard = await requireRole("USER");
  if (!guard.ok) return guard.response;

  try {
    await expireStaleReferrals(guard.user.id);

    const [referrals, activeCount] = await Promise.all([
      prisma.referral.findMany({
        where: { inviterId: guard.user.id },
        orderBy: { createdAt: "desc" },
        select: referralSelect,
      }),
      countActiveReferrals(guard.user.id),
    ]);

    return NextResponse.json({
      data: { referrals, activeCount, maxActive: REFERRAL_MAX_ACTIVE },
    });
  } catch (err) {
    console.error("[api/referrals GET]", err);
    return NextResponse.json(
      { error: "Couldn't load invites." },
      { status: 500 },
    );
  }
}

// POST /api/referrals — generate a new invite (capped at 5 active).
export async function POST(request: NextRequest) {
  const guard = await requireRole("USER");
  if (!guard.ok) return guard.response;

  if (!rateLimit(`referral-create:${guard.user.id}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Too many invites. Please wait a minute." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const rawLabel = typeof body.label === "string" ? body.label.trim() : "";
  const label = rawLabel ? rawLabel.slice(0, 50) : null;

  try {
    await expireStaleReferrals(guard.user.id);
    const active = await countActiveReferrals(guard.user.id);
    if (active >= REFERRAL_MAX_ACTIVE) {
      return NextResponse.json(
        {
          error: `You have ${REFERRAL_MAX_ACTIVE} active invites. Revoke one or let it expire to make a new one.`,
        },
        { status: 409 },
      );
    }

    const code = await generateUniqueReferralCode();
    const referral = await prisma.referral.create({
      data: {
        code,
        label,
        inviterId: guard.user.id,
        expiresAt: referralExpiry(),
      },
      select: referralSelect,
    });

    return NextResponse.json({ data: referral }, { status: 201 });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/referrals POST] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/referrals POST]", err);
    return NextResponse.json(
      { error: "Couldn't create invite." },
      { status: 500 },
    );
  }
}
