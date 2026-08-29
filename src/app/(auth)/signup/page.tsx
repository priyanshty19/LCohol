import { SipStoriesMark } from "@/components/brand/logo";
import { SignupForm } from "@/components/auth/signup-form";
import { safeReturnTo } from "@/lib/safe-return-to";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an account",
  alternates: { canonical: "/" },
  robots: { index: false, follow: true },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    ref?: string | string[];
    returnTo?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const rawReferral = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const referralCode = rawReferral?.trim().toUpperCase().match(/^SIP[A-Z2-9]{4,12}$/)?.[0];
  const returnTo = safeReturnTo(
    params.returnTo,
    referralCode ? `/party/${referralCode}` : "/",
  );

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div style={{ filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.22))" }}>
            <SipStoriesMark className="h-16 w-auto text-foreground" />
          </div>
          <div className="relative mt-3 overflow-hidden px-1">
            <h1 className="font-display text-4xl font-semibold tracking-tight">
              <span className="text-glow italic text-primary">Sip</span>{" "}
              <span className="text-foreground">Stories</span>
            </h1>
            <div className="fx-glare" style={{ left: 0 }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Stories worth sipping on
          </p>
        </div>
        <div style={{ filter: "drop-shadow(0 24px 56px rgba(0,0,0,0.20))" }}>
          <SignupForm initialReferralCode={referralCode} returnTo={returnTo} />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          This platform is for adults of legal drinking age only.
          <br />
          Drink responsibly.
        </p>
      </div>
    </div>
  );
}
