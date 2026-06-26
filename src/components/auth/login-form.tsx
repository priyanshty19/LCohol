"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

// Survives a refresh during the OTP wait — see the restore effect below.
const LI_OTP_KEY = "ss_login_otp";

function clerkError(e: unknown, fallback: string): string {
  const er = e as { errors?: { longMessage?: string; message?: string }[] };
  return er?.errors?.[0]?.longMessage ?? er?.errors?.[0]?.message ?? fallback;
}

export function LoginForm() {
  const router = useRouter();
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

  // Restore an in-flight OTP step across a refresh (Clerk rehydrates its own
  // verification attempt; we just bring the step + email back).
  useEffect(() => {
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
  }, []);

  // Step 1 — send the OTP.
  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    const addr = email.trim().toLowerCase();
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
      setFlow("signin");
      setStep("otp");
      try {
        sessionStorage.setItem(LI_OTP_KEY, JSON.stringify({ step: "otp", email: addr, flow: "signin" }));
      } catch {
        /* ignore */
      }
    } catch {
      // Clerk has no user for this email → verify via signUp; the backend will
      // tell us whether they're an existing member or need to register.
      try {
        await signUp!.create({ emailAddress: addr });
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
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
          setError("That code didn't verify. Try again.");
          setLoading(false);
          return;
        }
        await setActive({ session: res.createdSessionId });
      } else {
        const res = await signUp!.attemptEmailAddressVerification({
          code: code.trim(),
        });
        if (res.status !== "complete" || !res.createdSessionId) {
          setError("That code didn't verify. Try again.");
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
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(clerkError(e, "Verification failed. Request a new code."));
      setLoading(false);
    }
  }

  async function resend() {
    if (!isLoaded || !signIn) return;
    setError(null);
    try {
      if (flow === "signin") {
        const factor = signIn.supportedFirstFactors?.find(
          (f) => f.strategy === "email_code",
        ) as { emailAddressId: string } | undefined;
        if (factor)
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });
      } else {
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
      }
    } catch (e) {
      setError(clerkError(e, "Couldn't resend the code."));
    }
  }

  if (step === "otp") {
    return (
      <Card variant="glass">
        <form onSubmit={handleOtp}>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to{" "}
                <span className="text-foreground">{email}</span>.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoFocus
                className="text-center text-lg tracking-[0.4em]"
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="gold"
              size="lg"
              className="w-full"
              disabled={loading || code.length < 6}
            >
              {loading ? "Verifying…" : "Log in"}
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <button type="button" onClick={resend} className="hover:text-primary">
                Resend code
              </button>
              <span>·</span>
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
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card variant="glass">
      <form onSubmit={handleEmail}>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
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
            />
          </div>

          {/* Clerk mounts its bot-protection CAPTCHA here for the signUp
              fallback used when Clerk doesn't yet know this email. */}
          <div id="clerk-captcha" className="flex justify-center empty:hidden" />

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
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
            {loading ? "Sending code…" : "Email me a code"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Request an invite
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
