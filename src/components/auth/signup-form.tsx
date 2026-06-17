"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dices } from "lucide-react";
import { useSignUp } from "@clerk/nextjs/legacy";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { generateFunkyName } from "@/lib/funky-names";

type DrinkOption = { id: string; name: string; brand?: string | null };

function clerkError(e: unknown, fallback: string): string {
  const er = e as { errors?: { longMessage?: string; message?: string }[] };
  return er?.errors?.[0]?.longMessage ?? er?.errors?.[0]?.message ?? fallback;
}

export function SignupForm() {
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { getToken } = useAuth();

  const [step, setStep] = useState<"details" | "otp">("details");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [drinks, setDrinks] = useState<DrinkOption[]>([]);
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);

  // Details captured in step 1, sent to our backend after the OTP is verified.
  const [details, setDetails] = useState({
    email: "",
    dob: "",
    referralCode: "",
    favoriteDrinkId: "",
    consent: false,
  });

  // Suggest a funky pseudonym on first paint (effect → no hydration mismatch).
  useEffect(() => {
    setUsername(generateFunkyName());
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/drinks?sort=popular&limit=60")
      .then((r) => r.json())
      .then((d) => alive && setDrinks(d.data ?? []))
      .catch(() => alive && setDrinks([]));
    return () => {
      alive = false;
    };
  }, []);

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
    const favoriteDrinkId = String(fd.get("favoriteDrinkId") ?? "");
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
    try {
      await signUp.create({ emailAddress: email });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setDetails({ email, dob, referralCode, favoriteDrinkId, consent });
      setStep("otp");
    } catch (e) {
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
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      if (!verified) {
        const res = await signUp.attemptEmailAddressVerification({
          code: code.trim(),
        });
        if (res.status !== "complete" || !res.createdSessionId) {
          setError("That code didn't verify. Check it and try again.");
          setLoading(false);
          return;
        }
        await setActive({ session: res.createdSessionId });
        setVerified(true);
      }

      const token = await getToken();
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
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 409 && /username/i.test(d.error ?? "")) {
          setUsername(generateFunkyName());
          setError("That name got snapped up — here's a fresh one. Tap verify again.");
        } else {
          setError(d.error ?? "Could not finish signup.");
        }
        setLoading(false);
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } catch (e) {
      setError(clerkError(e, "Verification failed. Request a new code."));
      setLoading(false);
    }
  }

  async function resend() {
    if (!isLoaded) return;
    setError(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
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
                <span className="text-foreground">{details.email}</span>.
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
              {loading ? "Verifying…" : "Verify & join"}
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <button type="button" onClick={resend} className="hover:text-primary">
                Resend code
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  setStep("details");
                  setCode("");
                  setError(null);
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
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" name="dob" type="date" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="referralCode">Referral code</Label>
            <Input
              id="referralCode"
              name="referralCode"
              type="text"
              placeholder="SIP••••••  (invite-only)"
              required
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="favoriteDrinkId">
              Favorite drink{" "}
              <span className="text-muted-foreground">(ice-breaker, optional)</span>
            </Label>
            <select
              id="favoriteDrinkId"
              name="favoriteDrinkId"
              className="h-9 w-full rounded-lg border border-input bg-input/30 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              defaultValue=""
            >
              <option value="">— what's your poison? —</option>
              {drinks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.brand ? ` · ${d.brand}` : ""}
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
              <Link href="/compliance/terms" className="text-primary hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/compliance/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <p className="rounded-lg border border-[var(--ml-sober)]/30 bg-[var(--ml-sober)]/10 px-3 py-2 text-xs leading-relaxed text-[var(--ml-sober)]">
            🥜 Teetotaler? Pull up a chair — you&apos;re welcome too. Just don&apos;t
            finish the <em>Chakna</em>.
          </p>

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
            {loading ? "Sending code…" : "Send verification code"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Already a regular?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
