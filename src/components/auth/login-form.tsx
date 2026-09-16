"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useAuth, useClerk } from "@clerk/nextjs";
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
import { activeEmailOtpSession, requestEmailOtp } from "@/lib/clerk-email-otp";

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
  const clerk = useClerk();

  const [step, setStep] = useState<"email" | "otp">("email");
  // Which Clerk object holds the in-flight verification.
  const [flow, setFlow] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  // Latch: once Clerk has accepted the code and the session is active, a retry
  // must NOT re-attempt the (now consumed) first factor — it would fail with
  // client_state_invalid and strand a half-signed-in user. Mirrors signup-form.
  const [verified, setVerified] = useState(false);
  // True once the server has accepted the code and we're navigating away —
  // the only moment the OTP row is allowed to turn green.
  const [otpDone, setOtpDone] = useState(false);
  const otpFormRef = useRef<HTMLFormElement>(null);
  const resendTimer = useRef<number | null>(null);

  function codeRequested() {
    setResent(true);
    if (resendTimer.current !== null) window.clearTimeout(resendTimer.current);
    resendTimer.current = window.setTimeout(() => {
      resendTimer.current = null;
      setResent(false);
    }, 30_000);
  }

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

  // The resend cooldown timer must not fire into an unmounted form.
  useEffect(
    () => () => {
      if (resendTimer.current !== null) window.clearTimeout(resendTimer.current);
    },
    [],
  );

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
      const check = await checkRes.json().catch(() => ({}));
      // A 429/500 from this route also carries `exists: false`. Reading only
      // `exists` told a rate-limited (or DB-stalled) MEMBER that they have no
      // account and sent them to signup, where the email is already taken —
      // a dead end. Trust `exists` only on a 2xx.
      if (!checkRes.ok) {
        setError(
          typeof check.error === "string"
            ? check.error
            : "Couldn't check that email right now. Please try again.",
        );
        setLoading(false);
        return;
      }
      if (!check.exists) {
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
      const nextFlow = await requestEmailOtp(clerk, addr, "signin");
      trackAnalyticsEvent("auth_code_requested", { mode: "sign_in" });
      setFlow(nextFlow);
      setEmail(addr);
      setVerified(false);
      codeRequested();
      setStep("otp");
      try {
        sessionStorage.setItem(LI_OTP_KEY, JSON.stringify({ step: "otp", email: addr, flow: nextFlow }));
      } catch {
        /* ignore */
      }
    } catch (error) {
      setError(clerkError(error, "Couldn't send a code to that email."));
    } finally {
      setLoading(false);
    }
  }

  // Step 2 — verify the OTP, then mint our session via the backend.
  async function handleOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || resending) return;
    // The button is disabled until Clerk loads, but the OTP step can also be
    // restored from sessionStorage before that. Returning silently here left
    // the person tapping a live button that did nothing at all — say so.
    if (!isLoaded || !signIn) {
      setError("Still connecting to the verification service — try again in a moment.");
      return;
    }
    const entered = code.replace(/\D/g, "");
    const activeSession = activeEmailOtpSession(clerk, email);
    if (!verified && !activeSession && entered.length !== 6) {
      setError("Enter all 6 digits of the code.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Only verify if we haven't already. Everything after this block can fail
      // for reasons that have nothing to do with the code (backend 500, 429,
      // network), and re-attempting a consumed first factor throws
      // client_state_invalid — which used to strand the person signed in to
      // Clerk but not to SIPSTORIES, with no way to retry.
      if (!verified && !activeSession) {
        if (flow === "signin") {
          const res = signIn.status === "complete" ? signIn : await signIn.attemptFirstFactor({
            strategy: "email_code",
            code: entered,
          });
          if (res.status !== "complete" || !res.createdSessionId) {
            setError(verificationError(res, "signin"));
            setLoading(false);
            return;
          }
          await setActive({ session: res.createdSessionId });
        } else {
          if (!signUp || !setActiveSignUp) {
            setError("Your sign-in timed out. Tap Resend code to get a new one.");
            setLoading(false);
            return;
          }
          let res = signUp.status === "complete" ? signUp : await signUp.attemptEmailAddressVerification({
            code: entered,
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
          await setActiveSignUp({ session: res.createdSessionId });
        }
        setVerified(true);
      }

      const token = await getToken({ skipCache: true });
      if (!token) {
        // Email is verified but Clerk hasn't handed us a session token. Don't
        // post `null` and let the backend answer "Missing verification token."
        setError(
          "Your email is verified, but we couldn't read the session back. Tap Log in again.",
        );
        setLoading(false);
        return;
      }
      const r = await fetch("/api/auth/otp/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "signin", clerkToken: token }),
      });
      // A gateway/proxy error body isn't JSON; parsing it used to throw into the
      // outer catch and blame the code ("Verification failed. Request a new
      // code.") for a server problem.
      const d = await r.json().catch(() => ({} as { error?: string }));
      if (!r.ok) {
        if (r.status === 404) {
          setError("No account for this email yet — please sign up.");
        } else {
          setError(
            d.error ?? `Login failed (${r.status}). Your email is verified — tap Log in to retry.`,
          );
        }
        setLoading(false);
        return;
      }
      setOtpDone(true);
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
      setOtpDone(false);
      setError(clerkError(e, "Verification failed. Request a new code."));
      setLoading(false);
    }
  }

  async function resend() {
    // The old gate required `signIn` even on the signup-shadow flow, where the
    // in-flight attempt lives on `signUp` — so that branch silently did nothing.
    if (!isLoaded || loading || resending || resent) return;
    setError(null);
    setResent(false);
    setResending(true);
    setVerified(false);
    try {
      const nextFlow = await requestEmailOtp(clerk, email, flow);
      setFlow(nextFlow);
      try {
        sessionStorage.setItem(LI_OTP_KEY, JSON.stringify({ step: "otp", email, flow: nextFlow }));
      } catch { /* ignore */ }
      setCode("");
      codeRequested();
      trackAnalyticsEvent("auth_code_resent", { mode: "sign_in" });
    } catch (e) {
      setError(clerkError(e, "Couldn't resend the code."));
    } finally {
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
        <form ref={otpFormRef} onSubmit={handleOtp} className="flex w-full flex-col gap-5 p-5">
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
              onComplete={() => {
                if (!loading && !resending) otpFormRef.current?.requestSubmit();
              }}
              status={otpDone ? "success" : loading ? "verifying" : error ? "error" : "idle"}
              disabled={loading || resending || otpDone}
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
            disabled={loading || resending || !isLoaded || (!verified && !activeEmailOtpSession(clerk, email) && code.length < 6)}
          >
            {loading ? "Verifying…" : "Log in"}
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={resend}
              disabled={!isLoaded || loading || resending || resent}
              className="hover:text-primary disabled:opacity-50"
            >
              Resend code
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              disabled={loading || resending}
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                // A different address means a different verification — never
                // carry the "already verified" latch back to step 1.
                setVerified(false);
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

          <p
            role="status"
            aria-live="polite"
            className="min-h-[1rem] text-center text-xs text-muted-foreground"
          >
            {resending ? "Sending a new code..." : resent ? "Code requested. Check your inbox or spam folder. Resend is available after 30 seconds." : ""}
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
