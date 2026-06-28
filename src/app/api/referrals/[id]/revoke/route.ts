import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// POST /api/referrals/[id]/revoke — cancel one of your own pending invites,
// freeing a slot. Only PENDING invites you own can be revoked.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("USER");
  if (!guard.ok) return guard.response;

  if (!rateLimit(`referral-revoke:${guard.user.id}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "You're doing that too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { id } = await params;

  try {
    const referral = await prisma.referral.findUnique({
      where: { id },
      select: { id: true, inviterId: true, status: true },
    });
    if (!referral || referral.inviterId !== guard.user.id) {
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    }
    if (referral.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending invites can be revoked." },
        { status: 409 },
      );
    }

    await prisma.referral.update({
      where: { id },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    return NextResponse.json({ data: { id, status: "REVOKED" } });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/referrals/[id]/revoke]", err);
    return NextResponse.json({ error: "Couldn't revoke invite." }, { status: 500 });
  }
}
