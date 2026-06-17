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
// invitedById stays null). Override via env, defaults to "IEEE23".
// ⚠️ Clear TEST_REFERRAL_CODES before public launch — this bypasses invite-only.
const TEST_REFERRAL_CODES = new Set(
  (process.env.TEST_REFERRAL_CODES ?? "IEEE23")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean),
);

export function isTestReferralCode(code: string): boolean {
  return TEST_REFERRAL_CODES.has(code.trim().toUpperCase());
}
