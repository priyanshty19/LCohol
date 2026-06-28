import { NextRequest, NextResponse } from "next/server";
import { isRedeemableReferralCode } from "@/lib/referrals";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

/**
 * Lightweight pre-check so the signup form can reject a bad referral code
 * BEFORE asking Clerk to send an OTP. The code is re-validated (and atomically
 * claimed) server-side in /api/auth/otp/complete — this is a UX convenience,
 * not the security boundary.
 */
export async function POST(request: NextRequest) {
  if (!rateLimit(`referral:${clientIp(request)}`, 20, 60_000)) {
    return NextResponse.json(
      { valid: false, error: "Too many attempts. Please wait a minute." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const referralCode = (body.referralCode ?? "").trim().toUpperCase().slice(0, 32);
  if (!referralCode) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  try {
    return NextResponse.json({ valid: await isRedeemableReferralCode(referralCode) });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/referral/validate]", err);
    return NextResponse.json({ valid: false, error: "Couldn't validate code." }, { status: 500 });
  }
}
