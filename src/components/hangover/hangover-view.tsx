"use client";

import { useState } from "react";
import {
  SEVERITY_META,
  REMEDIES,
  NEVER_AGAIN_PLEDGES,
  type Severity,
} from "@/lib/hangover-config";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function HangoverView() {
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [unitsConsumed, setUnitsConsumed] = useState(4);
  const [hoursSince, setHoursSince] = useState(6);
  const [pledge, setPledge] = useState<string | null>(null);
  const [pledgeDone, setPledgeDone] = useState(false);

  const meta = severity ? SEVERITY_META[severity] : null;

  // How many hours of processing remain (rough estimate)
  const hoursRemaining = Math.max(0, unitsConsumed - hoursSince);
  const isLikelyClear = hoursRemaining === 0;

  const activeRemedies = severity
    ? REMEDIES.filter((r) => r.forSeverity.includes(severity))
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🆘</span>
          <h1 className="font-display text-2xl font-semibold text-primary">
            Hangover SOS
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          No judgment. Just survival tips from someone who&apos;s been there
        </p>
      </div>

      {/* Severity scale */}
      <div className="glass-panel space-y-4 rounded-xl p-5">
        <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          How bad is it?
        </h2>
        <div className="grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as Severity[]).map((s) => {
            const m = SEVERITY_META[s];
            return (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={`flex min-h-11 flex-col items-center gap-1.5 rounded-xl p-3 transition-all duration-150 ${
                  severity === s
                    ? "glass-panel-elevated border-primary/40 glow-primary"
                    : "glass-panel"
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">
                  {s}
                </span>
              </button>
            );
          })}
        </div>
        {meta && (
          <p className={`text-sm font-medium ${meta.color}`}>
            {meta.emoji} {meta.label}
          </p>
        )}
      </div>

      {/* The Math section */}
      <div className="glass-panel space-y-4 rounded-xl p-5">
        <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          🧮 The Sober Math
        </h2>
        <p className="text-xs text-muted-foreground">
          1 unit = 1 peg (30ml standard spirit) or 1 beer. Your liver clears ~1 unit per hour.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Units consumed last night: <span className="text-primary font-bold">{unitsConsumed}</span>
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={unitsConsumed}
              onChange={(e) => setUnitsConsumed(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/50">
              <span>1</span><span>10</span><span>20</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Hours since last drink: <span className="text-primary font-bold">{hoursSince}h</span>
            </label>
            <input
              type="range"
              min={1}
              max={24}
              value={hoursSince}
              onChange={(e) => setHoursSince(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/50">
              <span>1h</span><span>12h</span><span>24h</span>
            </div>
          </div>
        </div>

        {/* Result */}
        <div
          className={`rounded-lg border p-3 text-center ${
            isLikelyClear
              ? "border-[var(--ml-sober)]/30 bg-[var(--ml-sober)]/10"
              : "border-[var(--ml-sos)]/30 bg-[var(--ml-sos)]/10 glow-danger"
          }`}
        >
          {isLikelyClear ? (
            <p className="text-sm text-[var(--ml-sober)] font-medium">
              ✓ You&apos;re likely alcohol-free by now. You&apos;ve got this.
            </p>
          ) : (
            <p className="text-sm text-[var(--ml-sos)] font-medium">
              ~{hoursRemaining} hour{hoursRemaining !== 1 ? "s" : ""} of processing remaining.{" "}
              <span className="text-muted-foreground font-normal">
                Don&apos;t drive. Drink water.
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Remedies */}
      {severity && activeRemedies.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display font-semibold">
            Recovery Plan — Level {severity} Protocol
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeRemedies.map((remedy) => (
              <Card
                key={remedy.id}
                variant="glass"
                className="p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{remedy.emoji}</span>
                  <div>
                    <h3 className="font-display font-semibold text-sm">{remedy.title}</h3>
                    <p className="text-[11px] text-muted-foreground">
                      {remedy.subtitle}
                    </p>
                  </div>
                </div>
                <ol className="space-y-2">
                  {remedy.steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="flex-shrink-0 text-primary font-bold mt-0.5 text-xs">
                        {i + 1}.
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Never Again pledge */}
      <div className="glass-panel space-y-4 rounded-xl p-5">
        <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          📝 The &quot;Never Again&quot; Pledge (we&apos;ll see)
        </h2>
        {!pledgeDone ? (
          <>
            <div className="flex flex-wrap gap-2">
              {NEVER_AGAIN_PLEDGES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPledge(p)}
                  className={`min-h-11 rounded-full px-3 text-xs ${
                    pledge === p ? "pill-active" : "pill-inactive"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            {pledge && (
              <Button
                variant="gold"
                size="lg"
                onClick={() => setPledgeDone(true)}
                className="mt-2"
              >
                I solemnly pledge this 🤞
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-4 space-y-2">
            <span className="text-4xl">🏅</span>
            <p className="font-display font-semibold text-sm">&quot;{pledge}&quot;</p>
            <p className="text-xs text-muted-foreground">
              Pledge accepted. We&apos;ll hold you to... absolutely nothing. Get some rest.
            </p>
            <button
              onClick={() => { setPledge(null); setPledgeDone(false); }}
              className="text-xs text-muted-foreground/50 underline underline-offset-2"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!severity && (
        <div className="glass-panel-subtle rounded-xl border-dashed py-12 text-center">
          <span className="text-5xl">☝️</span>
          <p className="mt-4 font-medium">Select your severity level above</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll build a custom recovery plan for you
          </p>
        </div>
      )}

      {/* Footer disclaimer */}
      <p className="text-center text-xs text-muted-foreground/40 pb-4">
        This is community advice, not medical guidance. If you&apos;re feeling seriously unwell, please see a doctor.
      </p>
    </div>
  );
}
