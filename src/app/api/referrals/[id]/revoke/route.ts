import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";

// POST /api/referrals/[id]/revoke — cancel one of your own pending invites,
// freeing a slot. Only PENDING invites you own can be revoked.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("USER");
  if (!guard.ok) return guard.response;

  const { id } = await params;

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
}
