import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { canonicalizeEmail } from "@/lib/email-normalize";

/**
 * Get the current authenticated user's DB record from the session cookie.
 * Returns null if not logged in. Includes `role` (scalar) and profile.
 * Ban handling is done by callers (page guards / mutation APIs), not here.
 *
 * Wrapped in React cache() so the root layout, the (main) layout guard, and the
 * page each calling it within one request share a single cookie read + DB query
 * instead of repeating it 3+ times.
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  // Canonicalize so sessions minted before the email backfill (raw, possibly
  // dotted Gmail) still resolve to the now-canonical user row.
  const user = await prisma.user.findFirst({
    where: { email: canonicalizeEmail(payload.email) },
    include: { profile: true },
  });
  if (!user) return null;

  // Per-user revocation: a bumped User.tokenEpoch invalidates all older tokens
  // (logout-everywhere / compromise) without rotating the global secret.
  if (user.tokenEpoch !== payload.epoch) return null;

  return user;
});
