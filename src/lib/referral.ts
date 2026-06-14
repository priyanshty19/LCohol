// Human-shareable referral codes. Ambiguous chars (0/O, 1/I) omitted.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(len = 6): string {
  let s = "SIP";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}
