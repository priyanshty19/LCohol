// Clerk is used ONLY for email-OTP delivery + verification. We do not adopt
// Clerk sessions: after Clerk confirms the email, the backend verifies the
// short-lived Clerk session token here, extracts the verified email, and the
// caller mints our own `ss_auth` cookie (see lib/session.ts). The Clerk session
// is then revoked. This keeps all authz (roles, bans, referral, profile) on our
// Prisma `User`, unchanged.
import { verifyToken, createClerkClient } from "@clerk/backend";

const secretKey = process.env.CLERK_SECRET_KEY ?? "";

export const clerkBackend = createClerkClient({ secretKey });

export type VerifiedClerkEmail = { email: string; sessionId?: string };
export class ClerkVerificationUnavailableError extends Error {}

/**
 * Verify a Clerk session token with our secret key and return the user's
 * verified primary email. Invalid credentials return null; service outages
 * throw so callers can offer a retry without blaming a successfully entered OTP.
 */
export async function verifiedEmailFromClerkToken(
  token: string,
): Promise<VerifiedClerkEmail | null> {
  if (!secretKey) throw new ClerkVerificationUnavailableError("CLERK_SECRET_KEY is not set");
  try {
    const payload = await verifyToken(token, { secretKey });
    const userId = payload.sub;
    const sessionId = typeof payload.sid === "string" ? payload.sid : undefined;
    if (!userId) return null;

    const user = await clerkBackend.users.getUser(userId);
    const primary = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId,
    );
    if (!primary || primary.verification?.status !== "verified") return null;

    return { email: primary.emailAddress.toLowerCase(), sessionId };
  } catch (error) {
    const failure = error as { reason?: string; status?: number; code?: string };
    if (failure.reason?.startsWith("token-") || failure.reason === "jwk-kid-mismatch" || failure.status === 404) {
      return null;
    }
    console.error("[auth/clerk] Verification service unavailable", {
      reason: failure.reason,
      status: failure.status,
      code: failure.code,
    });
    throw new ClerkVerificationUnavailableError("Clerk verification is unavailable");
  }
}
