import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Get the current authenticated user's DB record from the session cookie.
 * Returns null if not logged in. Includes `role` (scalar) and profile.
 * Ban handling is done by callers (page guards / mutation APIs), not here.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const email = await verifySessionToken(token);
  if (!email) return null;

  return prisma.user.findFirst({
    where: { email },
    include: { profile: true },
  });
}
