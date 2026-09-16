"use client";

import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const LENGTH = 6;

/** Orbit geometry, in px. Six beads on a ring around the row's centre. */
const ORBIT_RADIUS = 34;
const ORBIT_SCALE = 0.46;
/** Row height at rest vs. while the ring is up (ring diameter + a bead). */
const ROW_H = 48;
const RING_H = 104;

export type OtpStatus = "idle" | "verifying" | "success" | "error";

/**
 * Six discrete digit slots instead of one stretched text input.
 *
 * Why slots rather than one input with `tracking-[0.4em]`: letter-spacing is
 * applied after the last character too, so a centred code rendered visibly
 * left of centre, and a single stretched input has no height floor.
 *
 * Typing. Each keystroke writes its slot and moves focus to the next one. The
 * `onFocus` "snap to the first empty slot" guard used to read `digits` from the
 * render closure, i.e. BEFORE the keystroke that caused the focus move, so the
 * next slot looked out of turn and focus was bounced back. The following digit
 * then overwrote the previous one, and every slot took two key presses. The
 * guard now reads `latest`, a ref updated synchronously on every edit.
 *
 * Verification ("orbit"). When the last digit lands the parent submits. While
 * `status` is "verifying" the row curls onto a ring around its centre and spins
 * (transform-origin at the hub, rotate() draws the circle); on "success" the
 * beads screw down into the hub and a single verified tile turns in; on
 * "error" the ring unwinds back into a row and shakes. Colour is reserved for
 * verdicts: focus is light only, green only on success, red only on error.
 *
 * Value is still a plain digit string owned by the parent.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  status = "idle",
  id,
  disabled = false,
  autoFocus = false,
  invalid = false,
  describedBy,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Called once each time the user (not a restore) fills the last slot. */
  onComplete?: (code: string) => void;
  status?: OtpStatus;
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const refs = React.useRef<Array<HTMLInputElement | null>>([]);

  const digits = React.useMemo(() => {
    const clean = value.replace(/\D/g, "").slice(0, LENGTH);
    return Array.from({ length: LENGTH }, (_, i) => clean[i] ?? "");
  }, [value]);

  // Always-current digits for handlers that run before React re-renders
  // (focus events fired synchronously from inside onChange).
  const latest = React.useRef(digits);
  React.useLayoutEffect(() => {
    latest.current = digits;
  }, [digits]);

  // Set when the user edits; consumed by the completion effect so a code
  // restored from sessionStorage never auto-submits.
  const userEdited = React.useRef(false);

  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const complete = digits.every(Boolean);

  // Fire after commit so the parent's submit handler sees the new code.
  React.useEffect(() => {
    if (!userEdited.current) return;
    userEdited.current = false;
    if (complete) onComplete?.(digits.join(""));
  }, [complete, digits, onComplete]);

  // After a failed attempt, put the caret back on the last slot so the person
  // can fix the code without reaching for the mouse.
  const prevStatus = React.useRef(status);
  React.useEffect(() => {
    if (prevStatus.current === "verifying" && status === "error") {
      refs.current[LENGTH - 1]?.focus();
    }
    prevStatus.current = status;
  }, [status]);

  const focusAt = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(LENGTH - 1, i))];
    el?.focus();
    el?.select();
  };

  const commit = (next: string[]) => {
    latest.current = next.map((d) => d ?? "");
    userEdited.current = true;
    onChange(next.join("").slice(0, LENGTH));
  };

  const fillFrom = (i: number, chars: string) => {
    const next = [...latest.current];
    let k = 0;
    for (; k < chars.length && i + k < LENGTH; k++) next[i + k] = chars[k]!;
    commit(next);
    focusAt(i + k);
  };

  const handleChange = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    const current = latest.current[i] ?? "";

    if (!typed) {
      const next = [...latest.current];
      next[i] = "";
      commit(next);
      return;
    }

    // Typing into a filled slot whose text wasn't selected (caret before or
    // after the old digit) yields two characters. That is one new digit, not a
    // paste: keep whichever character isn't the old one.
    if (typed.length === 2 && current && typed.includes(current)) {
      const fresh = typed[0] === current ? typed[1]! : typed[0]!;
      fillFrom(i, fresh);
      return;
    }

    // Otherwise several characters means autofill (iOS/Android deliver the
    // whole code to the focused slot) — spread them forward.
    fillFrom(i, typed);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (latest.current[i]) return; // let the field clear itself first
      e.preventDefault();
      if (i === 0) return;
      const next = [...latest.current];
      next[i - 1] = "";
      commit(next);
      focusAt(i - 1);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(i - 1);
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(i + 1);
      return;
    }
    // Retyping the same digit produces no change event; still advance.
    if (/^\d$/.test(e.key) && latest.current[i] === e.key) {
      e.preventDefault();
      focusAt(i + 1);
    }
  };

  const handlePaste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    fillFrom(i, pasted);
  };

  // ── Orbit state ──────────────────────────────────────────────────────────
  const orbiting = !reducedMotion && complete && (status === "verifying" || status === "success");
  const screwed = complete && status === "success";

  // Measure slot pitch so each bead knows how far it sits from the hub.
  const rowRef = React.useRef<HTMLDivElement>(null);
  const [pitch, setPitch] = React.useState(0);
  React.useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const a = refs.current[0]?.parentElement;
      const b = refs.current[1]?.parentElement;
      if (a && b) setPitch(b.offsetLeft - a.offsetLeft);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, []);

  const beadTransform = (i: number) => {
    if (screwed) return "translate(0px, 0px) scale(0)";
    if (!orbiting) return "translate(0px, 0px) scale(1)";
    const fromHub = (i - (LENGTH - 1) / 2) * pitch; // bead's resting x vs hub
    const angle = (-90 + (360 / LENGTH) * i) * (Math.PI / 180);
    const x = Math.cos(angle) * ORBIT_RADIUS - fromHub;
    const y = Math.sin(angle) * ORBIT_RADIUS;
    return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${ORBIT_SCALE})`;
  };

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        "transition-[height] duration-500 ease-[var(--ease-lounge)]",
        status === "error" && "animate-[otp-shake_0.42s_var(--ease-pour)]",
      )}
      style={{ height: orbiting && !screwed ? RING_H : ROW_H }}
    >
      <div
        ref={rowRef}
        role="group"
        aria-label="Verification code"
        aria-describedby={describedBy}
        aria-busy={status === "verifying" || undefined}
        // grid + min-w-0 keeps six slots on one row down to a 320px phone.
        // When orbiting, this grid is the ring: its centre is the hub.
        className="grid w-full grid-cols-6 gap-1.5 sm:gap-2"
        style={
          orbiting
            ? {
                animation:
                  "otp-orbit-in 0.9s var(--ease-lounge) both, otp-orbit-spin 1.6s linear 0.9s infinite",
              }
            : undefined
        }
      >
        {digits.map((d, i) => (
          <div
            key={i}
            className="min-w-0 transition-[transform,opacity] ease-[var(--ease-lounge)]"
            style={{
              transform: beadTransform(i),
              opacity: screwed ? 0 : 1,
              // Stagger so the row curls up one bead after another.
              transitionDuration: screwed ? "420ms" : "620ms",
              transitionDelay: orbiting && !screwed ? `${i * 35}ms` : "0ms",
            }}
          >
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              id={i === 0 ? id : undefined}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={LENGTH}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${i + 1} of ${LENGTH}`}
              aria-invalid={invalid || undefined}
              disabled={disabled}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={(e) => handlePaste(i, e)}
              onFocus={(e) => {
                // A gap can't be represented in a plain digit string, so snap
                // to the first empty slot. Reads `latest`, not the render
                // closure — see the note at the top of the file.
                const firstEmpty = latest.current.findIndex((x) => !x);
                if (firstEmpty !== -1 && i > firstEmpty) {
                  focusAt(firstEmpty);
                  return;
                }
                e.currentTarget.select();
              }}
              // Counter-rotate so digits stay upright while the ring spins.
              style={
                orbiting
                  ? {
                      animation:
                        "otp-counter-in 0.9s var(--ease-lounge) both, otp-counter-spin 1.6s linear 0.9s infinite",
                    }
                  : undefined
              }
              className={cn(
                "block h-12 w-full min-w-0 rounded-lg border bg-transparent",
                "text-center font-mono text-lg tabular-nums text-foreground caret-foreground/70",
                "outline-none transition-[border-color,background-color,box-shadow] duration-200",
                d ? "border-foreground/25" : "border-input",
                // Attention is light, not colour.
                "focus-visible:border-foreground/60 focus-visible:bg-foreground/[0.06]",
                "focus-visible:shadow-[0_0_0_3px_rgb(255_255_255/0.07),0_0_18px_rgb(255_255_255/0.08)]",
                "disabled:pointer-events-none disabled:opacity-100",
                "dark:bg-input/30",
                invalid && "border-destructive ring-3 ring-destructive/20",
              )}
            />
          </div>
        ))}
      </div>

      {/* The single verified tile the ring screws down into. */}
      <div
        aria-hidden={!screwed}
        className={cn(
          "pointer-events-none absolute inset-0 m-auto flex h-12 w-12 items-center justify-center",
          "rounded-xl border border-sober/70 bg-sober/15 text-sober",
          "shadow-[0_0_24px_color-mix(in_oklab,var(--color-sober)_35%,transparent)]",
          "transition-[transform,opacity] duration-500 ease-[var(--ease-lounge)]",
          screwed ? "scale-100 rotate-0 opacity-100 delay-200" : "scale-50 -rotate-90 opacity-0",
        )}
      >
        <Check className="size-6" strokeWidth={2.5} />
      </div>
      <span className="sr-only" aria-live="polite">
        {status === "verifying" ? "Verifying code" : status === "success" ? "Code verified" : ""}
      </span>
    </div>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}
