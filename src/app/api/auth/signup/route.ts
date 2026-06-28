import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { canonicalizeEmail } from "@/lib/email-normalize";
import { isTestReferralCode } from "@/lib/referral";
import {
  acceptReferralTx,
  generateUniqueReferralCode,
} from "@/lib/referrals";
import { createConnectionTx } from "@/lib/connections";
import { isAdminEmail } from "@/lib/rbac";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";
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

// Thrown inside the signup transaction when a per-invite code can't be claimed.
class ReferralUnavailableError extends Error {}

export async function POST(request: NextRequest) {
  try {
    if (!rateLimit(`signup:${clientIp(request)}`, 5, 60_000)) {
      return NextResponse.json(
        { error: "Too many attempts. Please wait a minute." },
        { status: 429 }
      );
    }
    const body = await request.json();
    const email = canonicalizeEmail(
      typeof body.email === "string" ? body.email.slice(0, 254) : body.email
    );
    const password: string = body.password ?? "";
    const username = (body.username ?? "").trim();
    const dobStr: string = body.dob ?? "";
    const referralCode = (body.referralCode ?? "").trim().toUpperCase();
    const consent = body.consent === true;
    const favoriteDrinkId: string | null = body.favoriteDrinkId || null;

    // --- Validation (compliance: hard 21+ + mandatory referral) ---
    if (!email || !password || !username || !dobStr) {
      return NextResponse.json(
        { error: "Email, username, password and date of birth are required." },
        { status: 400 }
      );
    }
    if (!consent) {
      return NextResponse.json(
        { error: "You must confirm you are 21 or older." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }
    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: "Username must be 3–30 characters." },
        { status: 400 }
      );
    }
    if (!referralCode) {
      return NextResponse.json(
        { error: "A referral code is required — SIPSTORIES is invite-only." },
        { status: 400 }
      );
    }

    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) {
      return NextResponse.json(
        { error: "Invalid date of birth." },
        { status: 400 }
      );
    }
    if (ageFromDob(dob) < 21) {
      return NextResponse.json(
        { error: "You must be 21 or older to join SIPSTORIES." },
        { status: 403 }
      );
    }

    // Resolve the invite category: test code (no inviter), legacy admin root
    // code, or a per-invite referral (claimed atomically below).
    const isTest = isTestReferralCode(referralCode);
    let adminInviterId: string | null = null;
    if (!isTest) {
      const adminInviter = await prisma.user.findFirst({
        where: { referralCode, role: "ADMIN" },
        select: { id: true },
      });
      adminInviterId = adminInviter?.id ?? null;
    }

    // Uniqueness checks.
    if (await prisma.user.findFirst({ where: { email }, select: { id: true } })) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    if (
      await prisma.profile.findFirst({ where: { username }, select: { id: true } })
    ) {
      return NextResponse.json(
        { error: "That username is already taken." },
        { status: 409 }
      );
    }

    // Favorite drink is an optional icebreaker — only keep it if real.
    let favDrinkId: string | undefined;
    if (favoriteDrinkId) {
      const d = await prisma.drink.findUnique({
        where: { id: favoriteDrinkId },
        select: { id: true },
      });
      favDrinkId = d?.id;
    }

    const passwordHash = await hashPassword(password);

    // Give the new member their own shareable code.
    const code = await generateUniqueReferralCode();

    // Create the member, claim the per-invite referral, and form the mutual
    // connection atomically.
    try {
      await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            authId: email,
            email,
            dob,
            isVerified: true,
            consentedAt: new Date(),
            passwordHash,
            referralCode: code,
            role: isAdminEmail(email) ? "ADMIN" : "USER",
            profile: {
              create: {
                username,
                displayName: username,
                favoriteDrinkId: favDrinkId,
                theme: "light", // start on the ivory cream theme
              },
            },
          },
          select: { id: true },
        });

        if (isTest) return; // open invite — no inviter, no connection

        if (adminInviterId) {
          await tx.user.update({
            where: { id: newUser.id },
            data: { invitedById: adminInviterId },
          });
          await createConnectionTx(tx, adminInviterId, newUser.id);
          return;
        }

        const inviterId = await acceptReferralTx(tx, referralCode, newUser.id);
        if (!inviterId) throw new ReferralUnavailableError();
        await tx.user.update({
          where: { id: newUser.id },
          data: { invitedById: inviterId },
        });
      });
    } catch (e) {
      if (e instanceof ReferralUnavailableError) {
        return NextResponse.json(
          { error: "That referral code isn't valid or has expired." },
          { status: 403 }
        );
      }
      throw e;
    }

    const token = await createSessionToken(email);
    const response = NextResponse.json(
      { ok: true, user: { email, username, referralCode: code } },
      { status: 201 }
    );
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[auth/signup]", err);
    return NextResponse.json(
      { error: "Signup failed. Please try again." },
      { status: 500 }
    );
  }
}
