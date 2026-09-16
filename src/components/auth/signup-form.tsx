"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dices } from "lucide-react";
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
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { generateFunkyName } from "@/lib/funky-names";
import { bustAuthCache } from "@/hooks/use-auth";
import { safeReturnTo } from "@/lib/safe-return-to";
import { trackAnalyticsEvent, trackVirtualPageView } from "@/lib/analytics";
import { clerkErrorMessage as clerkError } from "@/lib/clerk-errors";

// Survives a refresh during the OTP wait — see the restore effect below.
const SU_OTP_KEY = "ss_signup_otp";
const DRINK_CHOICES = ["Whiskey", "Rum", "Vodka", "Beer", "Gin", "Tequila", "Brandy"];

// Full age in years from a YYYY-MM-DD string (month/day aware). NaN if unparseable.
function ageFromDob(dobStr: string): number {
  const dob = new Date(dobStr);
  if (Number.isNaN(dob.getTime())) return NaN;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

async function resolveDrinkId(choice: string): Promise<string> {
  if (!choice) return "";
  try {
    const res = await fetch(`/api/drinks/search?q=${encodeURIComponent(choice)}`);
    const data = await res.json();
    return data.data?.[0]?.id ?? "";
  } catch {
    return "";
  }
}

export function SignupForm({
  initialReferralCode = "",
  returnTo = "/",
}: {
  initialReferralCode?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const destination = safeReturnTo(
    returnTo,
    initialReferralCode ? `/party/${initialReferralCode}` : "/",
  );
  const loginParams = new URLSearchParams({ returnTo: destination });
  if (initialReferralCode) loginParams.set("ref", initialReferralCode);
  const loginHref = `/login?${loginParams.toString()}`;
  const { isLoaded, signUp, setActive } = useSignUp();
  // Fallback path: if Clerk already holds this email (a shadow record from an
  // earlier abandoned OTP) but our DB has no member, signUp.create() fails with
  // "identifier taken". We then verify the email through the EXISTING Clerk
  // identity via signIn, and still complete signup (mode=signup) so the DB member
  // gets created. Without this, a stranded Clerk record permanently blocks signup.
  const { signIn, setActive: setActiveSignIn } = useSignIn();
  const { getToken } = useAuth();

  const [step, setStep] = useState<"details" | "otp">("details");
  // Which Clerk object holds the in-flight verification for this signup.
  const [verifyVia, setVerifyVia] = useState<"signup" | "signin">("signup");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [favoriteDrink, setFavoriteDrink] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  // True once the server has accepted the code and we're navigating away —
  // the only moment the OTP row is allowed to turn green.
  const [otpDone, setOtpDone] = useState(false);
  const otpFormRef = useRef<HTMLFormElement>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const resendTimer = useRef<number | null>(null);
  // DOB as separate parts so year is a single dropdown (no calendar paging).
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");

  // Details captured in step 1, sent to our backend after the OTP is verified.
  const [details, setDetails] = useState({
    email: "",
    dob: "",
    referralCode: "",
    favoriteDrinkId: "",
    consent: false,
  });

  // Restore an in-flight OTP step across a refresh: Clerk rehydrates its own
  // verification attempt, so we only need to bring the form's step + captured
  // details back (without this, a refresh dropped the user onto a blank form that
  // then errored "email already registered"). Otherwise suggest a funky pseudonym.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      let restored = false;
      try {
        const raw = sessionStorage.getItem(SU_OTP_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s?.step === "otp" && s?.details?.email) {
            setDetails(s.details);
            setUsername(s.username || generateFunkyName());
            setVerifyVia(s.verifyVia === "signin" ? "signin" : "signup");
            setStep("otp");
            restored = true;
          }
        }
      } catch {
        /* ignore */
      }
      if (!restored) setUsername(generateFunkyName());
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    trackVirtualPageView(
      step === "otp" ? "/signup/otp" : "/signup/details",
      step === "otp" ? "Account verification" : "Create account",
    );
  }, [step]);

  // The resend cooldown timer must not fire into an unmounted form.
  useEffect(
    () => () => {
      if (resendTimer.current !== null) window.clearTimeout(resendTimer.current);
    },
    [],
  );

  // Step 1 — validate referral, then ask Clerk to email a code.
  async function handleDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const dob = String(fd.get("dob") ?? "");
    const referralCode = String(fd.get("referralCode") ?? "").trim().toUpperCase();
    const consent = fd.get("consent") === "on";

    if (username.trim().length < 3) {
      setError("Pick a username (3–30 characters).");
      setLoading(false);
      return;
    }
    if (!consent) {
      setError("Please confirm you are 21 or older.");
      setLoading(false);
      return;
    }
    // Catch under-21 up front (the server re-checks at otp/complete) so an
    // underage DOB never gets as far as an emailed verification code.
    const age = ageFromDob(dob);
    if (Number.isNaN(age)) {
      setError("Please enter a valid date of birth.");
      setLoading(false);
      return;
    }
    if (age < 21) {
      setError("You must be 21 or older to join SipStories.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.exists !== "boolean") {
        setError(result.error ?? "Couldn't check that email. Please try again.");
        setLoading(false);
        return;
      }
      if (result.exists) {
        setError("An account with this email already exists. Please sign in.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Couldn't check that email. Please try again.");
      setLoading(false);
      return;
    }

    const favoriteDrinkId = await resolveDrinkId(favoriteDrink);

    // Referral pre-check (re-validated server-side at completion).
    try {
      const r = await fetch("/api/referral/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode }),
      });
      const d = await r.json();
      if (!d.valid) {
        setError("That referral code isn't valid — SIPSTORIES is invite-only.");
        setLoading(false);
        return;
      }
    } catch {
      setError("Couldn't check the referral code. Please try again.");
      setLoading(false);
      return;
    }

    // Clerk: create the (shadow) user and email the OTP.
    const captured = { email, dob, referralCode, favoriteDrinkId, consent };
    const goToOtp = (via: "signup" | "signin") => {
      trackAnalyticsEvent("auth_code_requested", { mode: "sign_up" });
      setVerifyVia(via);
      setDetails(captured);
      setStep("otp");
      try {
        sessionStorage.setItem(
          SU_OTP_KEY,
          JSON.stringify({ step: "otp", details: captured, username: username.trim(), verifyVia: via }),
        );
      } catch {
        /* ignore */
      }
    };

    try {
      await signUp.create({ emailAddress: email });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      goToOtp("signup");
    } catch (e) {
      // "Identifier taken" means Clerk already has this email (an abandoned OTP
      // shadow record) even though our DB may have no member. Don't dead-end —
      // verify through the existing Clerk identity via signIn and still complete
      // signup so the DB member is created. The membership pre-check and
      // otp/complete both reject emails that already have a member account.
      const code = (e as { errors?: { code?: string }[] })?.errors?.[0]?.code;
      const identifierTaken =
        code === "form_identifier_exists" ||
        /taken|already.*(registered|exists)/i.test(clerkError(e, ""));
      if (identifierTaken && signIn) {
        try {
          const si = await signIn.create({ identifier: email });
          const factor = si.supportedFirstFactors?.find(
            (f) => f.strategy === "email_code",
          ) as { emailAddressId: string } | undefined;
          if (!factor) throw new Error("no email_code factor");
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });
          goToOtp("signin");
          setLoading(false);
          return;
        } catch (e2) {
          setError(clerkError(e2, "Couldn't send a code to that email. Please try again."));
          setLoading(false);
          return;
        }
      }
      setError(
        clerkError(
          e,
          "Couldn't send a code. This email may already be registered — try logging in.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  // Step 2 — verify the OTP with Clerk, then create the member via our backend.
  async function handleOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // The OTP step can be restored from sessionStorage before Clerk finishes
    // loading. Returning silently left a live button that did nothing at all.
    if (!isLoaded) {
      setError("Still connecting to the verification service — try again in a moment.");
      return;
    }
    const entered = code.replace(/\D/g, "");
    if (entered.length !== 6) {
      setError("Enter all 6 digits of the code.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (!verified) {
        if (verifyVia === "signin") {
          if (!signIn || !setActiveSignIn) {
            setError("Your sign-up timed out. Tap Resend code to get a new one.");
            setLoading(false);
            return;
          }
          const res = await signIn.attemptFirstFactor({
            strategy: "email_code",
            code: entered,
          });
          if (res.status !== "complete" || !res.createdSessionId) {
            setError(verificationError(res, "signin"));
            setLoading(false);
            return;
          }
          await setActiveSignIn({ session: res.createdSessionId });
        } else {
          let res = await signUp.attemptEmailAddressVerification({
            code: entered,
          });
          // Email is verified here. Don't blame the code for fields the Clerk
          // instance requires but this app never collects — fill them in.
          // See lib/clerk-signup-requirements.ts.
          if (res.status === "missing_requirements") {
            res = (await satisfyAutoRequirements(
              res as unknown as ClerkSignUpLike,
              details.email,
            )) as unknown as typeof res;
          }
          if (res.status !== "complete" || !res.createdSessionId) {
            setError(verificationError(res, "signup"));
            setLoading(false);
            return;
          }
          await setActive({ session: res.createdSessionId });
        }
        setVerified(true);
      }

      const token = await getToken();
      if (!token) {
        // Email is verified but Clerk hasn't handed us a session token. Don't
        // post `null` and let the backend answer "Missing verification token."
        setError(
          "Your email is verified, but we couldn't read the session back. Tap Verify & join again.",
        );
        setLoading(false);
        return;
      }
      const r = await fetch("/api/auth/otp/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "signup",
          clerkToken: token,
          username: username.trim(),
          email: details.email,
          dob: details.dob,
          referralCode: details.referralCode,
          favoriteDrinkId: details.favoriteDrinkId || null,
          consent: details.consent,
        }),
      });
      // A gateway/proxy error body isn't JSON; parsing it used to throw into the
      // outer catch and blame the code for a server problem.
      const d = await r.json().catch(() => ({} as { error?: string }));
      if (!r.ok) {
        if (r.status === 409 && /username/i.test(d.error ?? "")) {
          setUsername(generateFunkyName());
          setError("That name got snapped up — here's a fresh one. Tap verify again.");
        } else {
          setError(
            d.error ??
              `Could not finish signup (${r.status}). Your email is verified — tap Verify & join to retry.`,
          );
        }
        setLoading(false);
        return;
      }
      setOtpDone(true);
      try {
        sessionStorage.removeItem(SU_OTP_KEY);
      } catch {
        /* ignore */
      }
      bustAuthCache(); // new session — clear any cached identity before the shell loads
      trackAnalyticsEvent("sign_up", { method: "email_otp" });
      let postOnboardingDestination = destination;

      // A party code doubles as the signup referral. New members were already
      // RSVP'd in otp/complete; this also resolves the private party URL.
      if (details.referralCode) {
        try {
          const partyResponse = await fetch(
            `/api/party/${encodeURIComponent(details.referralCode)}/accept`,
            { method: "POST" },
          );
          if (partyResponse.ok) {
            const party = await partyResponse.json();
            if (typeof party.data?.partyId === "string") {
              postOnboardingDestination = safeReturnTo(
                `/parties/${party.data.partyId}`,
                destination,
              );
            }
          }
        } catch {
          // Keep the public invite return target so the user can retry there.
        }
      }

      router.push(
        `/onboarding?returnTo=${encodeURIComponent(postOnboardingDestination)}`,
      );
      router.refresh();
    } catch (e) {
      setOtpDone(false);
      setError(clerkError(e, "Verification failed. Request a new code."));
      setLoading(false);
    }
  }

  async function resend() {
    // Previously this had no pending/confirmation state at all: tapping "Resend
    // code" produced no visible change whatsoever, success or failure.
    if (!isLoaded || resending) return;
    setError(null);
    setResent(false);
    setResending(true);
    try {
      if (verifyVia === "signin") {
        if (!signIn) throw new Error("Sign-up session lost. Please go back and try again.");
        const si = await signIn.create({ identifier: details.email });
        const factor = si.supportedFirstFactors?.find(
          (f) => f.strategy === "email_code",
        ) as { emailAddressId: string } | undefined;
        if (!factor) throw new Error("no email_code factor");
        await signIn.prepareFirstFactor({
          strategy: "email_code",
          emailAddressId: factor.emailAddressId,
        });
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      }
      // A fresh code belongs to a fresh attempt, so drop the "already verified"
      // latch — otherwise the next submit skips verification entirely and
      // re-posts a token from the attempt the resend just replaced.
      setVerified(false);
      setCode("");
      setResent(true);
      trackAnalyticsEvent("auth_code_resent", { mode: "sign_up" });
      if (resendTimer.current !== null) window.clearTimeout(resendTimer.current);
      resendTimer.current = window.setTimeout(() => {
        resendTimer.current = null;
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
      // Flat, static flex column — no Card/CardContent/CardFooter. The nested
      // flex + `:has()` padding rules in that trio were painting the submit
      // button over the code row on this screen. See login-form.tsx.
      <div className="glass-panel overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <form ref={otpFormRef} onSubmit={handleOtp} className="flex w-full flex-col gap-5 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold">Check your email</h2>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to{" "}
              <span className="break-all text-foreground">{details.email}</span>.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Verification code</Label>
            <OtpInput
              id="code"
              value={code}
              onChange={setCode}
              onComplete={() => {
                if (!loading) otpFormRef.current?.requestSubmit();
              }}
              status={otpDone ? "success" : loading ? "verifying" : error ? "error" : "idle"}
              disabled={loading || otpDone}
              autoFocus
              invalid={Boolean(error)}
              describedBy={error ? "signup-otp-error" : undefined}
            />
          </div>

          {error && (
            <div
              id="signup-otp-error"
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
            disabled={loading || !isLoaded || code.length < 6}
          >
            {loading ? "Verifying…" : "Verify & join"}
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
                setStep("details");
                setCode("");
                setError(null);
                // A different address means a different verification — never
                // carry the "already verified" latch back to step 1, or the
                // next submit would skip Clerk and post a stale token.
                setVerified(false);
                try {
                  sessionStorage.removeItem(SU_OTP_KEY);
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
            {resending && !resent ? "Sending a new code…" : resent ? "A new code is on its way" : ""}
          </p>
        </form>
      </div>
    );
  }

  // DOB dropdown options. Years run from 21 to 100 years ago (newest first) so
  // the picker only offers ages that pass the 21+ gate; the precise check still
  // happens in handleDetails. Day count tracks the selected month/year.
  const currentYear = new Date().getFullYear();
  const dobYears = Array.from({ length: 80 }, (_, i) => currentYear - 21 - i);
  const dobMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const daysInMonth =
    dobMonth && dobYear
      ? new Date(Number(dobYear), Number(dobMonth), 0).getDate()
      : 31;
  const dobDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dobValue =
    dobDay && dobMonth && dobYear ? `${dobYear}-${dobMonth}-${dobDay}` : "";
  const dobSelectClass =
    "h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <Card variant="glass">
      <form onSubmit={handleDetails}>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex gap-2">
              <Input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="pick a pseudonym"
                minLength={3}
                maxLength={30}
                required
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setUsername(generateFunkyName())}
                aria-label="Shuffle a new funky name"
                title="Roll a fresh name"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-input bg-input/30 text-muted-foreground transition-colors hover:border-ring hover:text-[var(--ml-velvet-hover)] active:scale-95"
              >
                <Dices className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              We rolled you a name — keep it, shuffle 🎲, or make your own.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dobDay">Date of birth</Label>
            <div className="grid grid-cols-[1fr_1.3fr_1.2fr] gap-2">
              <select
                id="dobDay"
                aria-label="Day"
                className={dobSelectClass}
                value={dobDay}
                onChange={(e) => setDobDay(e.target.value)}
              >
                <option value="">Day</option>
                {dobDays.map((d) => (
                  <option key={d} value={String(d).padStart(2, "0")}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                aria-label="Month"
                className={dobSelectClass}
                value={dobMonth}
                onChange={(e) => setDobMonth(e.target.value)}
              >
                <option value="">Month</option>
                {dobMonths.map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, "0")}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                aria-label="Year"
                className={dobSelectClass}
                value={dobYear}
                onChange={(e) => setDobYear(e.target.value)}
              >
                <option value="">Year</option>
                {dobYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {/* handleDetails reads this via FormData, unchanged. */}
            <input type="hidden" name="dob" value={dobValue} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="referralCode">Referral code</Label>
            <Input
              id="referralCode"
              name="referralCode"
              type="text"
              placeholder="SIP••••••  (invite-only)"
              defaultValue={initialReferralCode}
              required
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="favoriteDrink">
              Favorite drink{" "}
              <span className="text-muted-foreground">(ice-breaker, optional)</span>
            </Label>
            <select
              id="favoriteDrink"
              value={favoriteDrink}
              onChange={(e) => setFavoriteDrink(e.target.value)}
              className={dobSelectClass}
            >
              <option value="">Choose a favorite</option>
              {DRINK_CHOICES.map((drink) => (
                <option key={drink} value={drink}>
                  {drink}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              name="consent"
              required
              className="mt-0.5 size-4 accent-[var(--ml-velvet-bright)]"
            />
            <span>
              I confirm I am <strong className="text-foreground">21 or older</strong>{" "}
              and agree to the{" "}
              <Link href="/Terms-and-Condition" className="text-primary hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/Privacy-Policy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <p className="rounded-lg border border-[var(--ml-sober)]/30 bg-[var(--ml-sober)]/10 px-3 py-2 text-xs leading-relaxed text-[var(--ml-sober)]">
            🥜 Teetotaler? Pull up a chair — you&apos;re welcome too. Just don&apos;t
            finish the <em>Chakna</em>.
          </p>

          {/* Clerk mounts its bot-protection (Smart CAPTCHA / Turnstile) widget
              here. Without this node, Clerk falls back to an invisible CAPTCHA
              that gets blocked in private windows / by content blockers, which
              surfaces as "The CAPTCHA failed to load." */}
          <div id="clerk-captcha" className="flex justify-center empty:hidden" />

          {error && (
            <div
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            variant="gold"
            size="lg"
            className="w-full"
            disabled={loading || !isLoaded}
          >
            {loading ? "Sending code…" : "Send verification code"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Already a regular?{" "}
            <Link href={loginHref} className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
