"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Real spirit categories (mirrors scripts/seed-categories.ts).
const SPIRITS = [
  { id: "whisky", label: "Whisky", emoji: "🥃" },
  { id: "rum", label: "Rum", emoji: "🏴‍☠️" },
  { id: "vodka", label: "Vodka", emoji: "🍸" },
  { id: "gin", label: "Gin", emoji: "🌿" },
  { id: "beer", label: "Beer", emoji: "🍺" },
  { id: "wine", label: "Wine", emoji: "🍷" },
  { id: "brandy", label: "Brandy", emoji: "🥂" },
  { id: "tequila", label: "Tequila", emoji: "🌵" },
  { id: "liqueur", label: "Liqueur", emoji: "🍶" },
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

const INTENSITY = [
  { id: "taste", label: "Just a taste", desc: "One nice pour, that's the evening" },
  { id: "couple", label: "A couple", desc: "Settle in, take it slow" },
  { id: "all-in", label: "Making a night of it", desc: "A proper night out, at your pace" },
];

const INTENT = [
  { id: "chill", label: "Just chilling", desc: "Wind down, easy vibes" },
  { id: "buzz", label: "A nice buzz", desc: "Loosen up a little" },
  { id: "zone", label: "Proper unwind", desc: "Fully switch off for a while" },
];

const STEPS = ["Spirits", "Flavours", "Intensity", "The plan"] as const;

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function OnboardingQuiz({ username }: { username: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [spirits, setSpirits] = useState<string[]>([]);
  const [flavours, setFlavours] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function persist(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.push("/");
      router.refresh();
    } catch {
      // Even if the save hiccups, don't trap the user on onboarding.
      router.push("/");
    }
  }

  function finish() {
    persist({
      preferredSpirits: spirits,
      preferredFlavours: flavours,
      intensity,
      intent,
      onboarded: true,
    });
  }

  function skip() {
    persist({ onboarded: true });
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="glass-panel w-full max-w-lg rounded-3xl border border-white/10 p-6 shadow-2xl sm:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="font-display text-xl font-bold text-primary">
            Welcome, {username}
          </p>
          <p className="text-sm text-muted-foreground">
            Four quick taps so James pours you the right things.
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
            <Question
              title="What's on your mind to drink?"
              hint="Pick all that tempt you — or none, your call."
            >
              <div className="grid grid-cols-3 gap-2.5">
                {SPIRITS.map((s) => (
                  <Chip
                    key={s.id}
                    active={spirits.includes(s.id)}
                    onClick={() => setSpirits((p) => toggle(p, s.id))}
                  >
                    <span className="text-lg">{s.emoji}</span>
                    <span>{s.label}</span>
                  </Chip>
                ))}
              </div>
            </Question>
          )}

          {step === 1 && (
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
          )}

          {step === 2 && (
            <Question title="What's the pace tonight?" hint="No judgement, just calibration.">
              <div className="space-y-2.5">
                {INTENSITY.map((o) => (
                  <Row
                    key={o.id}
                    label={o.label}
                    desc={o.desc}
                    active={intensity === o.id}
                    onClick={() => setIntensity(o.id)}
                  />
                ))}
              </div>
            </Question>
          )}

          {step === 3 && (
            <Question title="What's the plan?" hint="So James reads the room right.">
              <div className="space-y-2.5">
                {INTENT.map((o) => (
                  <Row
                    key={o.id}
                    label={o.label}
                    desc={o.desc}
                    active={intent === o.id}
                    onClick={() => setIntent(o.id)}
                  />
                ))}
              </div>
            </Question>
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
            {busy ? "Setting your table…" : "Pour me in"}
          </Button>
        ) : (
          <Button
            variant="velvet"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
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
