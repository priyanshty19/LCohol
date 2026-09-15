"use client";

import { useState } from "react";
import {
  SEVERITY_META,
  REMEDIES,
  NEVER_AGAIN_PLEDGES,
  type Severity,
} from "@/lib/hangover-config";
import { cn } from "@/lib/utils";

// Each severity step owns a hue so the scale reads as a ramp at a glance —
// the selected tile lights up in its own colour via .neon-tile's --tile-hue.
const SEVERITY_HUE: Record<Severity, string> = {
  1: "#a3b018",
  2: "#e08a1e",
  3: "#f0553d",
  4: "#a855f7",
  5: "#c2334d",
};

// Recovery cards get a halo colour keyed off the remedy, so the plan reads as
// a set of distinct protocols rather than five identical cards.
const REMEDY_HUES = ["#38bdf8", "#facc15", "#4ade80", "#f472b6", "#a78bfa"];

function Slider({
  label,
  value,
  min,
  max,
  unit,
  hue,
  onChange,
  minLabel,
  maxLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  hue: string;
  onChange: (n: number) => void;
  minLabel: string;
  maxLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={`slider-${label}`} className="text-sm font-medium">
          {label}
        </label>
        <span
          className="font-display text-xl font-bold tabular-nums"
          style={{ color: hue }}
        >
          {value}
          {unit}
        </span>
      </div>
      <input
        id={`slider-${label}`}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="neon-range"
        style={{ ["--range-hue" as string]: hue }}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/60">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

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
      <header className="space-y-1.5">
        <h1 className="screen-title text-foreground">Hangover SOS</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Warm, witty, and non-judgmental. We&apos;ve all been there.
        </p>
      </header>

      {/* Severity scale */}
      <section className="space-y-3">
        <h2 className="section-title">How bad is it?</h2>
        <div className="grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as Severity[]).map((s) => {
            const m = SEVERITY_META[s];
            const on = severity === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                aria-pressed={on}
                data-on={on}
                className="neon-tile min-h-20 !gap-1"
                style={{ ["--tile-hue" as string]: SEVERITY_HUE[s] }}
                aria-label={`Level ${s}: ${m.label}`}
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {m.emoji}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-bold",
                    on ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s}
                </span>
              </button>
            );
          })}
        </div>
        {meta ? (
          <p className="text-sm font-medium" style={{ color: SEVERITY_HUE[severity!] }}>
            Level {severity}: {meta.label}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pick a level and we&apos;ll build you a recovery plan.
          </p>
        )}
      </section>

      {/* The Math section */}
      <section className="stitch-panel space-y-5 p-5">
        <div className="space-y-1">
          <h2 className="section-title">The Sober Math</h2>
          <p className="text-xs text-muted-foreground">
            1 unit = 1 peg (30ml standard spirit) or 1 beer. Your liver clears
            about 1 unit per hour.
          </p>
        </div>

        <Slider
          label="Units consumed last night"
          value={unitsConsumed}
          min={1}
          max={20}
          hue="#38bdf8"
          minLabel="1"
          maxLabel="20"
          onChange={setUnitsConsumed}
        />

        <Slider
          label="Hours since last drink"
          value={hoursSince}
          unit="h"
          min={0}
          max={24}
          hue="#4ade80"
          minLabel="0h"
          maxLabel="24h"
          onChange={setHoursSince}
        />

        {/* Result */}
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-center text-sm font-medium",
            isLikelyClear
              ? "border-[var(--ml-sober)]/35 bg-[var(--ml-sober)]/10 text-[var(--ml-sober)]"
              : "border-[var(--ml-sos)]/35 bg-[var(--ml-sos)]/10 text-[var(--ml-sos)]",
          )}
          role="status"
        >
          {isLikelyClear ? (
            <>✓ You&apos;re on the mend. Keep hydrating.</>
          ) : (
            <>
              ~{hoursRemaining} hour{hoursRemaining !== 1 ? "s" : ""} of
              processing left.{" "}
              <span className="font-normal text-muted-foreground">
                Don&apos;t drive. Drink water.
              </span>
            </>
          )}
        </div>
      </section>

      {/* Remedies */}
      {severity && activeRemedies.length > 0 && (
        <section className="space-y-4">
          <h2 className="section-title">
            Recovery plan — level {severity}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeRemedies.map((remedy, i) => {
              const hue = REMEDY_HUES[i % REMEDY_HUES.length];
              return (
                <article
                  key={remedy.id}
                  className="stitch-panel flex flex-col gap-3 p-5"
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span
                      className="icon-halo"
                      style={{ ["--halo-hue" as string]: hue }}
                      aria-hidden
                    >
                      {remedy.emoji}
                    </span>
                    <div>
                      <h3 className="section-title text-base">{remedy.title}</h3>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {remedy.subtitle}
                      </p>
                    </div>
                  </div>
                  <ol className="space-y-2">
                    {remedy.steps.map((step, si) => (
                      <li
                        key={si}
                        className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                      >
                        <span
                          className="mt-0.5 shrink-0 text-xs font-bold tabular-nums"
                          style={{ color: hue }}
                        >
                          {si + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Never Again pledge */}
      <section className="stitch-panel space-y-4 p-5">
        <h2 className="section-title">
          The &quot;never again&quot; pledge{" "}
          <span className="text-sm font-normal text-muted-foreground">(we&apos;ll see)</span>
        </h2>
        {!pledgeDone ? (
          <>
            <div className="flex flex-wrap gap-2">
              {NEVER_AGAIN_PLEDGES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPledge(p)}
                  aria-pressed={pledge === p}
                  className={cn("chip min-h-10", pledge === p ? "chip-on" : "chip-off")}
                >
                  {p}
                </button>
              ))}
            </div>
            {pledge && (
              <button
                type="button"
                onClick={() => setPledgeDone(true)}
                className="btn-neon min-h-11 w-full px-5 text-sm sm:w-auto"
              >
                I solemnly pledge this 🤞
              </button>
            )}
          </>
        ) : (
          <div className="space-y-2 py-4 text-center">
            <span className="text-4xl" aria-hidden>🏅</span>
            <p className="font-display text-base font-semibold">&quot;{pledge}&quot;</p>
            <p className="text-xs text-muted-foreground">
              Pledge accepted. We&apos;ll hold you to… absolutely nothing. Get
              some rest.
            </p>
            <button
              type="button"
              onClick={() => {
                setPledge(null);
                setPledgeDone(false);
              }}
              className="text-xs text-muted-foreground/60 underline underline-offset-2 hover:text-foreground"
            >
              Reset
            </button>
          </div>
        )}
      </section>

      {/* Footer disclaimer */}
      <p className="pb-4 text-center text-xs text-muted-foreground/50">
        This is community advice, not medical guidance. If you&apos;re feeling
        seriously unwell, please see a doctor.
      </p>
    </div>
  );
}
