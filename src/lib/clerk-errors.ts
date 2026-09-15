/**
 * Clerk's `longMessage` is written for the developer, not the guest. Surfacing
 * it raw is how a wrong code ends up rendering as
 * "`identifier` is required when `strategy` is `email_code`" in the middle of
 * the login card. So: map the error CODE to copy we control, and fall back to
 * the caller's wording for anything unrecognised. Clerk's own text is never
 * shown.
 */
const FRIENDLY: Record<string, string> = {
  // Wrong / stale code.
  form_code_incorrect: "That code isn't right. Check the 6 digits and try again.",
  verification_expired: "That code has expired. Tap Resend code for a fresh one.",
  verification_failed: "Too many incorrect tries. Tap Resend code to start over.",
  verification_already_verified: "That code was already used. Tap Resend code for a fresh one.",

  // The in-flight attempt was lost (refresh, or Clerk dropped the client
  // state), so Clerk complains about a missing param. Nothing the guest did.
  form_param_nil: "Your sign-in timed out. Tap Resend code to get a new one.",
  form_param_missing: "Your sign-in timed out. Tap Resend code to get a new one.",
  client_state_invalid: "Your sign-in timed out. Tap Resend code to get a new one.",

  // Identifier problems.
  form_identifier_not_found: "No account for this email yet. Create one to get started.",
  form_identifier_exists: "That email already has an account. Sign in instead.",
  form_param_format_invalid: "That doesn't look like a valid email address.",

  // Throttling.
  too_many_requests: "Too many attempts. Give it a minute, then try again.",
  rate_limit_exceeded: "Too many attempts. Give it a minute, then try again.",
};

export function clerkErrorMessage(e: unknown, fallback: string): string {
  const code = (e as { errors?: { code?: string }[] })?.errors?.[0]?.code;
  return (code && FRIENDLY[code]) || fallback;
}
