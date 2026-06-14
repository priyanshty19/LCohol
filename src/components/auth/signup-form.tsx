"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { generateFunkyName } from "@/lib/funky-names";

type DrinkOption = { id: string; name: string; brand?: string | null };

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [drinks, setDrinks] = useState<DrinkOption[]>([]);
  const [username, setUsername] = useState("");

  // Suggest a funky pseudonym on first paint. Done in an effect (not initial
  // state) so the server-rendered HTML stays empty and there's no Math.random
  // hydration mismatch. The user can shuffle or type over it.
  useEffect(() => {
    setUsername(generateFunkyName());
  }, []);

  // Load a handful of popular drinks for the "favorite drink" icebreaker.
  useEffect(() => {
    let alive = true;
    fetch("/api/drinks?sort=popular&limit=60")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setDrinks(d.data ?? []);
      })
      .catch(() => {
        if (alive) setDrinks([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      email: fd.get("email"),
      username: username.trim(),
      password: fd.get("password"),
      dob: fd.get("dob"),
      referralCode: fd.get("referralCode"),
      favoriteDrinkId: fd.get("favoriteDrinkId") || null,
      consent: fd.get("consent") === "on",
    };

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        // Funky names collide rarely — if THIS name is taken (409 mentioning
        // username), roll a fresh one so the user just resubmits. Email-taken
        // is also 409, so key off the message, not the status alone.
        if (res.status === 409 && /username/i.test(data.error ?? "")) {
          setUsername(generateFunkyName());
          setError("That name just got snapped up — here's a fresh one. Tap join again!");
        } else {
          setError(data.error ?? "Signup failed.");
        }
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card variant="glass">
      <form onSubmit={handleSubmit}>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="at least 6 characters"
              minLength={6}
              required
              autoComplete="new-password"
            />
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

          {/* Inclusive welcome — teetotalers too. */}
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
            disabled={loading}
          >
            {loading ? "Pouring you in…" : "Join SIPSTORIES"}
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
