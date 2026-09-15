"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const LENGTH = 6;

/**
 * Six discrete digit slots instead of one stretched text input.
 *
 * The previous control was a single `<Input>` with
 * `className="text-center text-lg tracking-[0.4em]"`. Two things went wrong
 * with that:
 *
 *  1. `letter-spacing` is applied AFTER every character, including the last
 *     one. So a centred 6-digit string carries 0.4em of invisible trailing
 *     space that is included in the centring calculation, and the digits
 *     render visibly left of centre. That is the "distorted" look — it gets
 *     worse as the field narrows, which is why it read worst on a laptop with
 *     the dialog at its `max-w-md` and on small phones.
 *
 *  2. A single stretched input has no intrinsic height floor. Six slots in a
 *     grid do (`h-12` each, and the wrapper is `shrink-0`), so the row cannot
 *     be compressed by an ancestor and cannot be painted over by whatever
 *     follows it.
 *
 * Behaviour kept deliberately boring: value is still a plain string of digits
 * owned by the parent, so the submit path is unchanged.
 */
export function OtpInput({
  value,
  onChange,
  id,
  disabled = false,
  autoFocus = false,
  invalid = false,
  describedBy,
}: {
  value: string;
  onChange: (next: string) => void;
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

  // autoFocus as an effect rather than the DOM attribute: the attribute fires
  // before hydration settles and loses the focus on a re-render.
  React.useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const focusAt = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(LENGTH - 1, i))];
    el?.focus();
    el?.select();
  };

  const setDigits = (next: string[]) => onChange(next.join("").slice(0, LENGTH));

  const handleChange = (i: number, raw: string) => {
    const typed = raw.replace(/\D/g, "");
    if (!typed) {
      const next = [...digits];
      next[i] = "";
      setDigits(next);
      return;
    }

    // One field can receive the whole code: SMS/email autofill on iOS and
    // Android delivers all six characters to whichever input has focus.
    if (typed.length > 1) {
      const next = [...digits];
      for (let k = 0; k < typed.length && i + k < LENGTH; k++) next[i + k] = typed[k]!;
      setDigits(next);
      focusAt(i + typed.length);
      return;
    }

    const next = [...digits];
    next[i] = typed;
    setDigits(next);
    focusAt(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[i]) return; // let the field clear itself first
      e.preventDefault();
      const next = [...digits];
      next[i - 1] = "";
      setDigits(next);
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
    }
  };

  const handlePaste = (i: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = [...digits];
    for (let k = 0; k < pasted.length && i + k < LENGTH; k++) next[i + k] = pasted[k]!;
    setDigits(next);
    focusAt(i + pasted.length);
  };

  return (
    <div
      role="group"
      aria-label="Verification code"
      aria-describedby={describedBy}
      // grid + min-w-0 keeps six slots on one row at any width the dialog can
      // reach, down to a 320px phone, without horizontal overflow.
      className="grid shrink-0 grid-cols-6 gap-1.5 sm:gap-2"
    >
      {digits.map((d, i) => (
        <input
          key={i}
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
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            "h-12 w-full min-w-0 rounded-lg border border-input bg-transparent",
            "text-center font-mono text-lg tabular-nums text-foreground",
            "outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:opacity-50",
            "dark:bg-input/30",
            invalid && "border-destructive ring-3 ring-destructive/20",
          )}
        />
      ))}
    </div>
  );
}
