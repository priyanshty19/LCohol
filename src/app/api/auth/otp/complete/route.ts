import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateReferralCode, isTestReferralCode } from "@/lib/referral";
import { isAdminEmail } from "@/lib/rbac";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifiedEmailFromClerkToken, clerkBackend } from "@/lib/clerk";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";

function ageFromDob(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

/**
 * Final step of the email-OTP flow. The client has already verified the email
 * with Clerk and passes the resulting Clerk session token. We:
 *   1. verify that token server-side (proves the email was OTP-verified),
 *   2. revoke the Clerk session (we only use our own cookie),
 *   3. signup → create the Prisma member (referral + 21+ enforced here),
 *      signin → look up the existing member,
 *   4. mint our `ss_auth` cookie.
 */
export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(`otp-complete:${clientIp(request)}`, 10, 60_000)) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a minute." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "signup" ? "signup" : "signin";
    const clerkToken = (body.clerkToken ?? "").trim();
    if (!clerkToken) {
      return NextResponse.json(
        { error: "Missing verification token." },
        { status: 400 },
      );
    }

    // Security boundary: only the email Clerk says it verified is trusted.
    const verified = await verifiedEmailFromClerkToken(clerkToken);
    if (!verified) {
      return NextResponse.json(
        { error: "Email verification failed. Please try again." },
        { status: 401 },
      );
    }
    const email = verified.email;

    // We don't keep Clerk sessions around — fire-and-forget revoke.
    if (verified.sessionId) {
      clerkBackend.sessions
        .revokeSession(verified.sessionId)
        .catch(() => {});
    }

    const mintFor = (username: string | null, status = 200) =>
      createSessionToken(email).then((token) => {
        const res = NextResponse.json({ ok: true, user: { email, username } }, { status });
        res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
        return res;
      });

    // Already a member? Log them in regardless of mode (the email is verified).
    const existing = await prisma.user.findFirst({
      where: { email },
      include: { profile: true },
    });
    if (existing) {
      if (existing.isBanned) {
        return NextResponse.json(
          { error: "This account has been suspended." },
          { status: 403 },
        );
      }
      if (isAdminEmail(email) && existing.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: "ADMIN" },
        });
      }
      return mintFor(existing.profile?.username ?? null);
    }

    // No account yet → this must be a signup with the required fields.
    if (mode !== "signup") {
      return NextResponse.json(
        { error: "No account for this email. Please sign up.", code: "NO_ACCOUNT" },
        { status: 404 },
      );
    }

    const username = (body.username ?? "").trim();
    const dobStr: string = body.dob ?? "";
    const referralCode = (body.referralCode ?? "").trim().toUpperCase();
    const consent = body.consent === true;
    const favoriteDrinkId: string | null = body.favoriteDrinkId || null;

    if (!username || !dobStr) {
      return NextResponse.json(
        { error: "Username and date of birth are required." },
        { status: 400 },
      );
    }
    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: "Username must be 3–30 characters." },
        { status: 400 },
      );
    }
    if (!consent) {
      return NextResponse.json(
        { error: "You must confirm you are 21 or older." },
        { status: 400 },
      );
    }
    if (!referralCode) {
      return NextResponse.json(
        { error: "A referral code is required — SIPSTORIES is invite-only." },
        { status: 400 },
      );
    }

    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) {
      return NextResponse.json({ error: "Invalid date of birth." }, { status: 400 });
    }
    if (ageFromDob(dob) < 21) {
      return NextResponse.json(
        { error: "You must be 21 or older to join SIPSTORIES." },
        { status: 403 },
      );
    }

    // Test codes (e.g. IEEE23) are accepted with no inviter; real codes must
    // belong to an existing member.
    let invitedById: string | undefined;
    if (!isTestReferralCode(referralCode)) {
      const inviter = await prisma.user.findFirst({
        where: { referralCode },
        select: { id: true },
      });
      if (!inviter) {
        return NextResponse.json(
          { error: "That referral code isn't valid." },
          { status: 403 },
        );
      }
      invitedById = inviter.id;
    }

    if (
      await prisma.profile.findFirst({ where: { username }, select: { id: true } })
    ) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 },
      );
    }

    let favDrinkId: string | undefined;
    if (favoriteDrinkId) {
      const d = await prisma.drink.findUnique({
        where: { id: favoriteDrinkId },
        select: { id: true },
      });
      favDrinkId = d?.id;
    }

    let code = generateReferralCode();
    if (
      await prisma.user.findFirst({ where: { referralCode: code }, select: { id: true } })
    ) {
      code = generateReferralCode();
    }

    await prisma.user.create({
      data: {
        authId: email,
        email,
        dob,
        isVerified: true, // email proven via OTP
        consentedAt: new Date(),
        referralCode: code,
        invitedById,
        role: isAdminEmail(email) ? "ADMIN" : "USER",
        profile: {
          create: {
            username,
            displayName: username,
            favoriteDrinkId: favDrinkId,
            theme: "light",
          },
        },
      },
    });

    return mintFor(username, 201);
  } catch (err) {
    console.error("[auth/otp/complete]", err);
    return NextResponse.json(
      { error: "Sign-in failed. Please try again." },
      { status: 500 },
    );
  }
}
