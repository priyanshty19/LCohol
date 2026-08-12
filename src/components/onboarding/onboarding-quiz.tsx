"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { THEMES, applyTheme, vibeToTheme } from "@/lib/theme";
import { trackAnalyticsEvent, trackVirtualPageView } from "@/lib/analytics";

const DRINKS = [
  { id: "whisky", label: "Whisky", emoji: "🥃" },
  { id: "rum", label: "Rum drinks", emoji: "🥤" },
  { id: "gin-tonic", label: "Gin & tonic", emoji: "🍋" },
  { id: "vodka-cocktails", label: "Vodka cocktails", emoji: "🍸" },
  { id: "tequila", label: "Tequila", emoji: "🌵" },
  { id: "beer", label: "Beer", emoji: "🍺" },
  { id: "wine", label: "Wine", emoji: "🍷" },
  { id: "cocktails", label: "Classic cocktails", emoji: "🍹" },
];

const ALCOHOL_FREE = [
  { id: "mocktails", label: "Mocktails", emoji: "🍹" },
  { id: "coke", label: "Coke", emoji: "🥤" },
  { id: "diet-coke", label: "Diet Coke", emoji: "🥤" },
  { id: "fresh-juice", label: "Fresh juices", emoji: "🧃" },
];

const FLAVOURS = [
  "Sweet",
  "Sour",
  "Bitter",
  "Smoky",
  "Spicy / Chilli",
  "Fruity",
  "Citrus",
  "Mango",
  "Jamun",
  "Peach",
  "Minty",
];

const DISCOVERY = [
  { id: "familiar", label: "Familiar favourites", desc: "I know what I like" },
  { id: "balanced", label: "A mix of both", desc: "A classic with the occasional curveball" },
  { id: "adventurous", label: "Surprise me", desc: "I enjoy trying something new" },
];

const VIBES = THEMES.filter((theme) => theme.group === "vibe");

const STEPS = ["Your taste", "Your style"] as const;

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function OnboardingQuiz({ username }: { username: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [drinks, setDrinks] = useState<string[]>([]);
  const [flavours, setFlavours] = useState<string[]>([]);
  const [discovery, setDiscovery] = useState<string | null>(null);
  const [vibe, setVibe] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hasStartedTracking = useRef(false);

  useEffect(() => {
    if (!hasStartedTracking.current) {
      hasStartedTracking.current = true;
      trackAnalyticsEvent("tutorial_begin");
    }
    trackVirtualPageView(
      step === 0 ? "/onboarding/taste" : "/onboarding/style",
      step === 0 ? "Onboarding — your taste" : "Onboarding — your style",
    );
  }, [step]);

  async function persist(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      trackAnalyticsEvent("tutorial_complete");
      router.push("/");
      router.refresh();
    } catch {
      // Even if the save hiccups, don't trap the user on onboarding.
      router.push("/");
    }
  }

  function finish() {
    persist({
      preferredSpirits: drinks,
      preferredFlavours: flavours,
      intensity: discovery,
      intent: vibe,
      ...(vibe ? { theme: vibeToTheme(vibe) } : {}),
      onboarded: true,
    });
  }

  function skip() {
    persist({ onboarded: true });
  }

  function toggleDrink(id: string) {
    setDrinks((current) => toggle(current, id));
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/10 p-6 shadow-2xl sm:p-8 md:max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-xl font-bold text-primary">
            Welcome, {username}
          </p>
          <p className="text-sm text-muted-foreground">
            Two quick steps so James gets to know your taste.
          </p>
        </div>
        <button
          onClick={skip}
          disabled={busy}
          className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>

      {/* Progress */}
      <div className="mb-6 flex gap-1.5">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={cn(
                "h-1 rounded-full transition-colors duration-300",
                i <= step ? "bg-[var(--ml-velvet-bright)]" : "bg-white/10"
              )}
            />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 0 && (
            <div className="space-y-6">
              <Question
                title="What do you enjoy sipping?"
                hint="Pick the things you genuinely reach for."
              >
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-3 md:grid-cols-3">
                  {DRINKS.map((s) => (
                    <Chip
                      key={s.id}
                      active={drinks.includes(s.id)}
                      onClick={() => toggleDrink(s.id)}
                    >
                      <span className="text-lg">{s.emoji}</span>
                      <span>{s.label}</span>
                    </Chip>
                  ))}
                </div>
              </Question>

              <Question title="Alcohol-free favourites" hint="Great drinks do not need alcohol.">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {ALCOHOL_FREE.map((drink) => (
                    <Chip key={drink.id} active={drinks.includes(drink.id)} onClick={() => toggleDrink(drink.id)}>
                      <span className="text-lg">{drink.emoji}</span>
                      <span>{drink.label}</span>
                    </Chip>
                  ))}
                </div>
              </Question>

              <Question
                title="Which flavours do you love?"
                hint="The notes that make you go again."
              >
                <div className="flex flex-wrap gap-2">
                  {FLAVOURS.map((f) => (
                    <Chip
                      key={f}
                      active={flavours.includes(f)}
                      onClick={() => setFlavours((p) => toggle(p, f))}
                      pill
                    >
                      {f}
                    </Chip>
                  ))}
                </div>
              </Question>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-6 md:grid-cols-2">
              <Question title="How do you like to choose?" hint="James can keep it familiar or shake things up.">
                <div className="space-y-2.5">
                  {DISCOVERY.map((o) => (
                    <Row
                      key={o.id}
                      label={o.label}
                      desc={o.desc}
                      active={discovery === o.id}
                      onClick={() => setDiscovery(o.id)}
                    />
                  ))}
                </div>
              </Question>

              <Question title="What&apos;s your vibe?" hint="Pick a look for SipStories. You can change it anytime.">
                <div className="space-y-2.5">
                  {VIBES.map((o) => (
                    <Row
                      key={o.id}
                      label={o.label}
                      desc={`Use the ${o.label.toLowerCase()} look`}
                      active={vibe === o.id}
                      onClick={() => {
                        setVibe(o.id);
                        applyTheme(vibeToTheme(o.id));
                      }}
                    />
                  ))}
                </div>
              </Question>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Footer nav */}
      <div className="mt-7 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || busy}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:invisible"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {isLast ? (
          <Button variant="gold" onClick={finish} disabled={busy}>
            {busy ? "Saving your taste…" : "Let's go"}
          </Button>
        ) : (
          <Button
            variant="velvet"
            onClick={() => {
              trackAnalyticsEvent("onboarding_step_complete", {
                step_name: "taste",
                step_number: 1,
              });
              setStep((s) => Math.min(STEPS.length - 1, s + 1));
            }}
            disabled={busy}
          >
            Next <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Question({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  pill,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  pill?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 border text-sm transition-all active:scale-95",
        pill ? "rounded-full px-3.5 py-1.5" : "flex-col rounded-xl px-2 py-3",
        active
          ? "border-[var(--ml-velvet-bright)] bg-[var(--ml-velvet-bright)]/15 text-foreground shadow-[0_0_0_1px_var(--ml-velvet-bright)]"
          : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/25 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Row({
  label,
  desc,
  active,
  onClick,
}: {
  label: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.99]",
        active
          ? "border-[var(--ml-velvet-bright)] bg-[var(--ml-velvet-bright)]/15"
          : "border-white/10 bg-white/[0.03] hover:border-white/25"
      )}
    >
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          active
            ? "border-[var(--ml-velvet-bright)] bg-[var(--ml-velvet-bright)] text-white"
            : "border-white/20"
        )}
      >
        {active && <Check className="h-3 w-3" />}
      </span>
    </button>
  );
}
