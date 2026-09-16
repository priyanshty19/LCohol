import type { useClerk } from "@clerk/nextjs";
import { canonicalizeEmail } from "@/lib/email-normalize";

export type EmailOtpClerk = Pick<ReturnType<typeof useClerk>, "client" | "session" | "signOut">;
export type EmailOtpFlow = "signin" | "signup";

export function activeEmailOtpSession(clerk: EmailOtpClerk, email: string) {
  const session = clerk.session;
  const primary = session?.user?.primaryEmailAddress;
  return primary?.verification?.status === "verified" &&
    canonicalizeEmail(primary.emailAddress) === canonicalizeEmail(email)
    ? session
    : null;
}

/** Callers check SipStories membership before requesting codes through Clerk. */
export async function requestEmailOtp(
  clerk: EmailOtpClerk,
  email: string,
  flow: EmailOtpFlow,
): Promise<EmailOtpFlow> {
  // A code may already be accepted even though the app's cookie exchange failed.
  // Only discard that temporary session when explicitly requesting a new code.
  if (clerk.session) {
    await clerk.signOut(() => {}, { sessionId: clerk.session.id });
  }
  const client = clerk.client;
  if (!client) throw new Error("Clerk is not ready");
  const { signIn, signUp } = client;

  async function sendSignIn() {
    const current = signIn;
    const attempt = current.status === "needs_first_factor" && current.identifier === email
      ? current
      : await current.create({ identifier: email });
    const factor = attempt.supportedFirstFactors?.find((item) => item.strategy === "email_code");
    if (!factor) throw new Error("Email codes are not enabled");
    await attempt.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
    return "signin" as const;
  }

  async function sendSignUp() {
    const current = signUp;
    let attempt = current;
    if (current.status !== "missing_requirements" || current.emailAddress !== email) {
      try {
        attempt = await current.create({ emailAddress: email });
      } catch (error) {
        if (errorCode(error) === "form_identifier_exists") return sendSignIn();
        throw error;
      }
    }
    try {
      await attempt.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (error) {
      const code = errorCode(error);
      if (code !== "client_state_invalid" && code !== "resource_not_found") throw error;
      try {
        attempt = await current.create({ emailAddress: email });
      } catch (createError) {
        if (errorCode(createError) === "form_identifier_exists") return sendSignIn();
        throw createError;
      }
      await attempt.prepareEmailAddressVerification({ strategy: "email_code" });
    }
    return "signup" as const;
  }

  if (flow === "signup") return sendSignUp();
  try {
    return await sendSignIn();
  } catch (error) {
    // Network, CAPTCHA and throttling failures must not create a shadow user.
    if (errorCode(error) !== "form_identifier_not_found") throw error;
    return sendSignUp();
  }
}

function errorCode(error: unknown) {
  return (error as { errors?: { code?: string }[] })?.errors?.[0]?.code;
}
