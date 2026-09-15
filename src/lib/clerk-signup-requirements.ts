/**
 * Why this file exists.
 *
 * SIPSTORIES signs people in with an email code and nothing else. But a Clerk
 * instance can still have other sign-up fields switched on (password is on by
 * default on a fresh instance). When that happens the OTP flow does this:
 *
 *   attemptEmailAddressVerification(code)
 *     -> HTTP 200
 *     -> verifications.emailAddress.status === "verified"
 *     -> signUp.status === "missing_requirements"
 *     -> signUp.missingFields === ["password"]
 *     -> createdSessionId === null
 *
 * The code was right, the email WAS verified, and the person still got thrown
 * back to the form. The old message ("That code didn't verify") pointed at the
 * one thing that was not the problem.
 *
 * So: satisfy the requirements the instance asks for instead of failing.
 * Nobody ever sees or uses the generated password — it exists only to let
 * Clerk mark the sign-up complete. Sign-in stays email-code only.
 *
 * The Clerk dashboard should also be fixed (Configure -> Email, phone,
 * username -> Password: off). This is the belt to that braces: if the setting
 * is ever flipped back on, or a second Clerk instance is provisioned with
 * defaults, the flow keeps working instead of breaking for every user.
 */

export type ClerkSignUpLike = {
  status?: string | null;
  missingFields?: readonly string[];
  unverifiedFields?: readonly string[];
  createdSessionId?: string | null;
  update: (params: Record<string, unknown>) => Promise<ClerkSignUpLike>;
};

/** Fields we can satisfy silently, without asking the person for anything. */
const AUTO_FIELDS = new Set(["password", "username", "first_name", "last_name"]);

function randomPassword(): string {
  // 32 chars from a 62-char alphabet ~= 190 bits. Comfortably past any Clerk
  // strength rule and far outside the breached-password corpus Clerk checks.
  const alphabet =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(32);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  // Guarantee the character classes some configurations insist on.
  return `${out}aZ9!`;
}

function usernameFromEmail(email: string): string {
  const stem = (email.split("@")[0] ?? "sipper")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 16) || "sipper";
  return `${stem}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * If the sign-up is parked on `missing_requirements` for fields we can fill in
 * ourselves, fill them in and return the updated sign-up. Any other status (or
 * a field that genuinely needs the person) is returned untouched.
 */
export async function satisfyAutoRequirements(
  signUp: ClerkSignUpLike,
  email: string,
): Promise<ClerkSignUpLike> {
  if (signUp.status !== "missing_requirements") return signUp;

  const missing = signUp.missingFields ?? [];
  const auto = missing.filter((f) => AUTO_FIELDS.has(f));
  if (auto.length === 0) return signUp;

  const patch: Record<string, unknown> = {};
  for (const field of auto) {
    if (field === "password") patch.password = randomPassword();
    if (field === "username") patch.username = usernameFromEmail(email);
    if (field === "first_name") patch.firstName = "Sipper";
    if (field === "last_name") patch.lastName = "Anonymous";
  }

  try {
    const updated = await signUp.update(patch);
    console.info(
      `[auth] Clerk required ${auto.join(", ")} to complete sign-up; filled ` +
        `automatically. Turn these off in Clerk -> Configure -> Email, phone, username.`,
    );
    return updated;
  } catch (e) {
    console.error(`[auth] Could not auto-satisfy ${auto.join(", ")}:`, e);
    return signUp;
  }
}

type VerificationResult = {
  status?: string | null;
  missingFields?: readonly string[];
  unverifiedFields?: readonly string[];
};

/**
 * Clerk returns a non-"complete" status for several unrelated reasons. Map each
 * to something true, and put the actionable detail in the console where the
 * person who can fix it will look.
 */
export function verificationError(
  res: VerificationResult,
  stage: "signin" | "signup",
): string {
  const missing = res.missingFields ?? [];
  const unverified = res.unverifiedFields ?? [];

  if (res.status === "missing_requirements") {
    console.error(
      `[auth] Email verified, but Clerk still requires [${missing.join(", ")}] ` +
        `to complete sign-up, and none of them can be filled automatically. ` +
        `Turn them off in Clerk -> Configure -> Email, phone, username, or ` +
        `collect them in this form.`,
    );
    return "Your email checked out, but this account needs a bit more before we can finish. Please contact support.";
  }

  if (unverified.includes("email_address")) {
    return "That code didn't match. Check the latest email and try again.";
  }

  if (res.status === "expired") {
    return "That code has expired. Send yourself a new one.";
  }

  if (res.status === "abandoned") {
    return "That sign-in attempt timed out. Start again.";
  }

  console.error(`[auth] ${stage} ended with unexpected status:`, res.status, res);
  return "That code didn't verify. Try again.";
}
