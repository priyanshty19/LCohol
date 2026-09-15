import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canonicalizeEmail } from "@/lib/email-normalize";
import { rateLimitStrict, clientIp } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

/**
 * Lightweight pre-check so the Sign In form's legacy-member fallback only asks
 * Clerk to email a code (via signUp.create) when our DB actually has a member
 * for this address. Without this, Sign In on ANY unrecognized email creates a
 * Clerk shadow signup record that later poisons the same email for real Sign Up
 * ("that email address is taken") even though no account exists here.
 */
export async function POST(request: NextRequest) {
  if (!(await rateLimitStrict(`check-email:${clientIp(request)}`, 20, 60_000))) {
    return NextResponse.json(
      { exists: false, error: "Too many attempts. Please wait a minute." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = canonicalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ exists: false }, { status: 400 });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });
    return NextResponse.json({ exists: !!user });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/auth/check-email]", err);
    return NextResponse.json({ exists: false, error: "Couldn't check that email." }, { status: 500 });
  }
}
