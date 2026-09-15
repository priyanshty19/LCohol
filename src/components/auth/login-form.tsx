"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/auth/otp-input";
import {
  satisfyAutoRequirements,
  verificationError,
  type ClerkSignUpLike,
} from "@/lib/clerk-signup-requirements";
import { bustAuthCache } from "@/hooks/use-auth";
import { safeReturnTo } from "@/lib/safe-return-to";
import { trackAnalyticsEvent, trackVirtualPageView } from "@/lib/analytics";
import { clerkErrorMessage as clerkError } from "@/lib/clerk-errors";

// Survives a refresh during the OTP wait — see the restore effect below.
const LI_OTP_KEY = "ss_login_otp";

export function LoginForm({
  returnTo = "/",
  referralCode,
}: {
  returnTo?: string;
  referralCode?: string;
}) {
  const router = useRouter();
  const destination = safeReturnTo(returnTo);
  const signupParams = new URLSearchParams({ returnTo: destination });
  if (referralCode) signupParams.set("ref", referralCode);
  const signupHref = `/signup?${signupParams.toString()}`;
  const { isLoaded, signIn, setActive } = useSignIn();
  // Fallback for emails Clerk doesn't know yet (e.g. legacy/password members):
  // create a Clerk shadow user via signUp just to verify the email, then our
  // backend decides if they're a real member.
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { getToken } = useAuth();

  const [step, setStep] = useState<"email" | "otp">("email");
  // Which Clerk object holds the in-flight verification.
  const [flow, setFlow] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  // Restore an in-flight OTP step across a refresh (Clerk rehydrates its own
  // verification attempt; we just bring the step + email back).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(LI_OTP_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s?.step === "otp" && s?.email) {
            setEmail(s.email);
            setFlow(s.flow === "signup" ? "signup" : "signin");
            setStep("otp");
          }
        }
      } catch {
        /* ignore */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    trackVirtualPageView(
      step === "otp" ? "/login/otp" : "/login/sign-in",
      step === "otp" ? "Sign in verification" : "Sign in",
    );
  }, [step]);

  // Step 1 — send the OTP.
  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    const addr = email.trim().toLowerCase();

    // Source of truth is OUR DB, not Clerk. Check membership BEFORE asking Clerk
    // to do anything — otherwise a Clerk-known email (e.g. an abandoned OTP shadow
    // record) gets a code sent, the user enters it, and only THEN learns there's
    // no account. Confirm first so non-members are routed to signup with no wasted
    // OTP and no further Clerk state created.
    try {
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addr }),
      });
      const { exists } = await checkRes.json();
      if (!exists) {
        setError("No account for this email yet — please sign up.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setLoading(false);
      return;
    }

    try {
      const si = await signIn.create({ identifier: addr });
      const factor = si.supportedFirstFactors?.find(
        (f) => f.strategy === "email_code",
      ) as { emailAddressId: string } | undefined;
      if (!factor) {
        setError("Email codes aren't enabled for this account.");
        setLoading(false);
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: factor.emailAddressId,
      });
      trackAnalyticsEvent("auth_code_requested", { mode: "sign_in" });
      setFlow("signin");
      setStep("otp");
      try {
        sessionStorage.setItem(LI_OTP_KEY, JSON.stringify({ step: "otp", email: addr, flow: "signin" }));
      } catch {
        /* ignore */
      }
    } catch {
      // We already confirmed above that this email IS a member in our DB, so
      // signIn.create() failing means Clerk simply hasn't seen this address yet
      // (a legacy/password member). Verify via the signUp shadow-user flow; the
      // backend still treats them as an existing member on completion.
      try {
        await signUp!.create({ emailAddress: addr });
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
        trackAnalyticsEvent("auth_code_requested", { mode: "sign_in" });
        setFlow("signup");
        setStep("otp");
        try {
          sessionStorage.setItem(LI_OTP_KEY, JSON.stringify({ step: "otp", email: addr, flow: "signup" }));
        } catch {
          /* ignore */
        }
      } catch (e2) {
        setError(clerkError(e2, "Couldn't send a code to that email."));
      }
    } finally {
      setLoading(false);
    }
  }

  // Step 2 — verify the OTP, then mint our session via the backend.
  async function handleOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      if (flow === "signin") {
        const res = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code: code.trim(),
        });
        if (res.status !== "complete" || !res.createdSessionId) {
          setError(verificationError(res, "signin"));
          setLoading(false);
          return;
        }
        await setActive({ session: res.createdSessionId });
      } else {
        let res = await signUp!.attemptEmailAddressVerification({
          code: code.trim(),
        });
        // The email is verified at this point. If Clerk is still holding the
        // sign-up open for fields this app never collects (password by
        // default), fill them in rather than telling the person their correct
        // code was wrong. See lib/clerk-signup-requirements.ts.
        if (res.status === "missing_requirements") {
          res = (await satisfyAutoRequirements(
            res as unknown as ClerkSignUpLike,
            email,
          )) as unknown as typeof res;
        }
        if (res.status !== "complete" || !res.createdSessionId) {
          setError(verificationError(res, "signup"));
          setLoading(false);
          return;
        }
        await setActiveSignUp!({ session: res.createdSessionId });
      }

      const token = await getToken();
      const r = await fetch("/api/auth/otp/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "signin", clerkToken: token }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 404) {
          setError("No account for this email yet — please sign up.");
        } else {
          setError(d.error ?? "Login failed.");
        }
        setLoading(false);
        return;
      }
      try {
        sessionStorage.removeItem(LI_OTP_KEY);
      } catch {
        /* ignore */
      }
      bustAuthCache(); // new session — drop the cached /api/auth/me so the shell shows the right user
      trackAnalyticsEvent("login", { method: "email_otp" });
      router.push(destination);
      router.refresh();
    } catch (e) {
      setError(clerkError(e, "Verification failed. Request a new code."));
      setLoading(false);
    }
  }

  async function resend() {
    if (!isLoaded || !signIn || resending) return;
    setError(null);
    setResending(true);
    try {
      if (flow === "signin") {
        // Re-create the SignIn attempt so supportedFirstFactors is freshly populated.
        const si = await signIn.create({ identifier: email });
        const factor = si.supportedFirstFactors?.find(
          (f) => f.strategy === "email_code",
        ) as { emailAddressId: string } | undefined;
        if (!factor) throw new Error("Email code factor not available. Please restart sign-in.");
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: factor.emailAddressId,
        });
      } else {
        if (!signUp) throw new Error("Sign-up session lost. Please go back and try again.");
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      }
      setResent(true);
      trackAnalyticsEvent("auth_code_resent", { mode: "sign_in" });
      // Brief cooldown so the success message lands and the button isn't spammed.
      setTimeout(() => {
        setResent(false);
        setResending(false);
      }, 4000);
    } catch (e) {
      setError(clerkError(e, "Couldn't resend the code."));
      setResending(false);
    }
  }

  if (step === "otp") {
    return (
      // Deliberately NOT Card/CardContent/CardFooter here.
      //
      // Those three compose into: a `flex flex-col` Card with
      // `overflow-hidden` and a `:has()` rule that zeroes its bottom padding,
      // wrapping a <form>, wrapping two block children, one of which carries
      // `flex items-center` from the footer base. That stack was painting the
      // submit button on top of the code row on this screen, and the button is
      // `bg-transparent` underneath so it read as the two elements merged.
      //
      // A single static flex column cannot do that: every row is in normal
      // flow, nothing is absolutely positioned, nothing can shrink below its
      // content, and the gap is uniform. Boring on purpose.
      <div className="glass-panel overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <form onSubmit={handleOtp} className="flex w-full flex-col gap-5 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="break-all text-foreground">{email}</span>.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Verification code</Label>
            <OtpInput
              id="code"
              value={code}
              onChange={setCode}
              disabled={loading}
              autoFocus
              invalid={Boolean(error)}
              describedBy={error ? "login-otp-error" : undefined}
            />
          </div>

          {error && (
            <div
              id="login-otp-error"
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="h-px w-full bg-border/60" aria-hidden="true" />

          <Button
            type="submit"
            variant="gold"
            size="lg"
            className="w-full"
            disabled={loading || code.length < 6}
          >
            {loading ? "Verifying…" : "Log in"}
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="hover:text-primary disabled:opacity-50"
            >
              Resend code
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                try {
                  sessionStorage.removeItem(LI_OTP_KEY);
                } catch {
                  /* ignore */
                }
              }}
              className="hover:text-primary"
            >
              Wrong email?
            </button>
          </div>

          <p aria-live="polite" className="min-h-[1rem] text-center text-xs text-muted-foreground">
            {resent ? "A new code is on its way" : ""}
          </p>
        </form>
      </div>
    );
  }

  return (
    // Same flat structure as the OTP step above — see the note there.
    <div className="glass-panel overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <form onSubmit={handleEmail} className="flex w-full flex-col gap-5 p-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            className="h-11"
          />
        </div>

        {/* Clerk mounts its bot-protection CAPTCHA here for the signUp
            fallback used when Clerk doesn't yet know this email. */}
        <div id="clerk-captcha" className="flex justify-center empty:hidden" />

        {error && (
          <div
            role="alert"
            className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="h-px w-full bg-border/60" aria-hidden="true" />

        <Button
          type="submit"
          variant="gold"
          size="lg"
          className="w-full"
          disabled={loading || !isLoaded}
        >
          {loading ? "Sending code…" : "Email me a code"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          New here?{" "}
          <Link href={signupHref} className="text-primary hover:underline">
            Request an invite
          </Link>
        </p>
      </form>
    </div>
  );
}
