"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { JamesAvatar } from "@/components/james/james-avatar";

const CONVERSATIONS = [
  {
    user: "Rainy Mumbai night. What's the move?",
    james:
      "Old Monk and Thumbs Up, boss. 🥃 Splash of lime, ice, something slow on the speakers.",
  },
  {
    user: "Solo night in. Easy to make at home?",
    james:
      "Whisky soda, lemon peel. Honest drink, never wrong. Mind the ice more than the whisky. 🧊",
  },
  {
    user: "5 of us want a drinking game. Go.",
    james:
      "Roxanne. Cue The Police, sip every time Sting says her name. Short song, big regrets. 🎵",
  },
  {
    user: "First time at a whisky bar. Help.",
    james:
      "Tell the barman you're new to malts, they live for it. Neat first, ice later. ✨",
  },
] as const;

// One conversation occupies a fixed 4s slot. Typing duration scales with the
// reply length; the hold is whatever's left in the slot, so the swap cadence
// stays a steady 4s no matter how long the line is.
const CYCLE_MS = 4000;
const TYPING_SPEED_MS = 24;
const USER_VISIBLE_MS = 300;
const THINKING_MS = 450;
const EXIT_MS = 280;
const MIN_HOLD_MS = 600;

type Phase = "user" | "thinking" | "typing" | "hold";

export function JamesTalking() {
  // The typewriter is the whole point of this widget, so it always plays —
  // text appearing in place isn't the viewport motion prefers-reduced-motion
  // guards against. What reduced motion DOES suppress: the pulsing ring, the
  // bouncing thinking dots, the blinking caret, and the slide on swap.
  const prefersReduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("user");
  const [typed, setTyped] = useState("");
  const [visible, setVisible] = useState(true);
  const exitInnerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const conv = CONVERSATIONS[idx];

  // Build-up sequence when the conversation changes: show the question, a beat
  // of "thinking", then hand off to the typewriter.
  useEffect(() => {
    setVisible(true);
    setTyped("");
    setPhase("user");
    const t1 = setTimeout(() => setPhase("thinking"), USER_VISIBLE_MS);
    const t2 = setTimeout(
      () => setPhase("typing"),
      USER_VISIBLE_MS + THINKING_MS
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [idx, conv.james]);

  // Typewriter — writes the reply out one character at a time, then holds.
  useEffect(() => {
    if (phase !== "typing") return;
    const target = conv.james;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTyped(target.slice(0, i));
      if (i >= target.length) {
        clearInterval(interval);
        setTimeout(() => setPhase("hold"), 60);
      }
    }, TYPING_SPEED_MS);
    return () => clearInterval(interval);
  }, [phase, conv.james]);

  // Hold → fade out → advance. Hold soaks up whatever's left of the 4s slot
  // after the question, thinking, typing, and exit fade, so every conversation
  // swaps on a steady 4s beat regardless of reply length.
  useEffect(() => {
    if (phase !== "hold") return;
    const typingMs = conv.james.length * TYPING_SPEED_MS;
    const holdMs = Math.max(
      MIN_HOLD_MS,
      CYCLE_MS - USER_VISIBLE_MS - THINKING_MS - typingMs - EXIT_MS
    );
    const t = setTimeout(() => {
      setVisible(false);
      exitInnerRef.current = setTimeout(() => {
        setIdx((i) => (i + 1) % CONVERSATIONS.length);
      }, EXIT_MS);
    }, holdMs);
    return () => {
      clearTimeout(t);
      if (exitInnerRef.current) clearTimeout(exitInnerRef.current);
    };
  }, [phase, conv.james]);

  const active = phase === "thinking" || phase === "typing";
  const showJames = phase === "typing" || phase === "hold";

  return (
    <div className="glass-panel rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <JamesAvatar className="h-11 w-11" />
          {active && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500">
              {!prefersReduced && (
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
            </span>
          )}
        </div>
        <div>
          <p className="font-display text-base font-semibold text-foreground">
            James
          </p>
          <p className="text-xs text-muted-foreground">AI bartender, on call</p>
        </div>
      </div>

      {/* Conversation — fades out between topics */}
      <div
        className="mt-4 space-y-2.5"
        style={{
          opacity: visible ? 1 : 0,
          transform: prefersReduced
            ? undefined
            : visible
              ? "translateY(0)"
              : "translateY(-5px)",
          transition: prefersReduced
            ? `opacity ${EXIT_MS}ms ease`
            : `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms ease`,
        }}
      >
        {/* User bubble */}
        <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-sm bg-primary/15 px-3.5 py-2 text-xs leading-relaxed text-foreground/90">
          {conv.user}
        </div>

        {/* Thinking dots */}
        {phase === "thinking" && <ThinkingDots animate={!prefersReduced} />}

        {/* James reply — typed out character by character */}
        {showJames && (
          <div className="mr-auto max-w-[88%] rounded-2xl rounded-bl-sm border border-border/40 bg-card/60 px-3.5 py-2 text-xs leading-relaxed text-foreground/90">
            {typed}
            {phase === "typing" && (
              <span
                className={`ml-0.5 inline-block h-[10px] w-0.5 bg-primary/70 align-middle ${
                  prefersReduced ? "" : "animate-pulse"
                }`}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer + progress pips */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          James is behind the bar the moment you&apos;re in.
        </p>
        <div className="flex items-center gap-1">
          {CONVERSATIONS.map((_, i) => (
            <span
              key={i}
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: i === idx ? "1rem" : "0.25rem",
                background: i === idx ? "var(--primary)" : "var(--border)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ThinkingDots({ animate }: { animate: boolean }) {
  return (
    <div className="mr-auto rounded-2xl rounded-bl-sm border border-border/40 bg-card/60 px-4 py-3">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full bg-muted-foreground/60 ${
              animate ? "animate-bounce" : ""
            }`}
            style={animate ? { animationDelay: `${i * 0.15}s` } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
