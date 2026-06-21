import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { generateReferralCode, isTestReferralCode } from "@/lib/referral";
import { createConnectionTx } from "@/lib/connections";

/** Each user may hold at most this many active (PENDING, unexpired) invites. */
export const REFERRAL_MAX_ACTIVE = 5;
/** Invites expire this many days after they're generated. */
export const REFERRAL_TTL_DAYS = 3;

export function referralExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + REFERRAL_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Lazily flip PENDING invites whose deadline has passed to EXPIRED. This is how
 * the 3-day limit frees up a slot without a cron — call it before listing,
 * counting, creating, or accepting. Scope to one inviter when possible.
 */
export async function expireStaleReferrals(inviterId?: string): Promise<void> {
  await prisma.referral.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date() },
      ...(inviterId ? { inviterId } : {}),
    },
    data: { status: "EXPIRED" },
  });
}

/** How many active (PENDING, unexpired) invites an inviter currently holds. */
export async function countActiveReferrals(inviterId: string): Promise<number> {
  return prisma.referral.count({
    where: { inviterId, status: "PENDING", expiresAt: { gt: new Date() } },
  });
}

/**
 * Is this code redeemable at signup? Accepts:
 *   (a) a PENDING, unexpired per-invite Referral,
 *   (b) a configured test code (e.g. IEEE23), or
 *   (c) a legacy permanent User.referralCode belonging to an ADMIN (root invites).
 * Regular users' old permanent codes no longer gate signup. Read-only — used by
 * the pre-check; the actual claim happens atomically in acceptReferralTx.
 */
export async function isRedeemableReferralCode(code: string): Promise<boolean> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return false;
  if (isTestReferralCode(trimmed)) return true;

  const referral = await prisma.referral.findUnique({
    where: { code: trimmed },
    select: { status: true, expiresAt: true },
  });
  if (referral && referral.status === "PENDING" && referral.expiresAt > new Date()) {
    return true;
  }

  const adminInviter = await prisma.user.findFirst({
    where: { referralCode: trimmed, role: "ADMIN" },
    select: { id: true },
  });
  return Boolean(adminInviter);
}

/** A code that collides with neither an existing invite nor a user's own code. */
export async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateReferralCode();
    const [existingReferral, existingUser] = await Promise.all([
      prisma.referral.findUnique({ where: { code }, select: { id: true } }),
      prisma.user.findFirst({
        where: { referralCode: code },
        select: { id: true },
      }),
    ]);
    if (!existingReferral && !existingUser) return code;
  }
  // Vanishingly unlikely after 8 tries; widen the code rather than fail.
  return generateReferralCode(10);
}

/**
 * Atomically redeem an invite for a newly created user. Claims a PENDING,
 * unexpired Referral with a status-guarded updateMany (so two people racing the
 * same code can't both win), then forms the mutual connection. Returns the
 * inviter's id, or null when the code is invalid / already used / expired.
 *
 * Must run inside a transaction alongside the user.create.
 */
export async function acceptReferralTx(
  tx: Prisma.TransactionClient,
  code: string,
  newUserId: string,
): Promise<string | null> {
  const now = new Date();
  const claimed = await tx.referral.updateMany({
    where: { code, status: "PENDING", expiresAt: { gt: now } },
    data: { status: "ACCEPTED", acceptedById: newUserId, acceptedAt: now },
  });
  if (claimed.count === 0) return null;

  const referral = await tx.referral.findUnique({
    where: { code },
    select: { id: true, inviterId: true },
  });
  if (!referral) return null;

  await createConnectionTx(tx, referral.inviterId, newUserId, referral.id);
  return referral.inviterId;
}
