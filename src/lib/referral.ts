// Human-shareable referral codes. Ambiguous chars (0/O, 1/I) omitted.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(len = 6): string {
  let s = "SIP";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

// Test/seed referral codes accepted WITHOUT a backing inviter (the new member's
// invitedById stays null). Opt-in via env; defaults to EMPTY (no bypass).
// Honored only outside production so invite-only can't be bypassed in prod.
const TEST_REFERRAL_CODES =
  process.env.NODE_ENV !== "production"
    ? new Set(
        (process.env.TEST_REFERRAL_CODES ?? "")
          .split(",")
          .map((c) => c.trim().toUpperCase())
          .filter(Boolean),
      )
    : new Set<string>();

export function isTestReferralCode(code: string): boolean {
  return TEST_REFERRAL_CODES.has(code.trim().toUpperCase());
}
