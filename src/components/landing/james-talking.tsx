"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { JamesAvatar } from "@/components/james/james-avatar";

const CONVERSATIONS = [
  {
    user: "Rainy Mumbai night. What's the move?",
    james:
      "Old Monk and Thumbs Up, boss. 🥃 Splash of lime, handful of ice, something slow on the speakers. The rain does the rest.",
  },
  {
    user: "Solo night in. What's easy to make at home?",
    james:
      "Whisky soda, lemon peel. Honest drink, never wrong. Use your good ice — that part matters more than the whisky, trust me. 🧊",
  },
  {
    user: "5 of us want a drinking game. Go.",
    james:
      "Roxanne. Put on The Police, sip every time Sting sings her name. Short song, serious consequences. You'll thank me. 🎵",
  },
  {
    user: "First time at a whisky bar. Help.",
    james:
      "Ask the barman what's open and interesting. Say you're new to malts — good bartenders live for that question. Try it neat first, ice later. ✨",
  },
] as const;

const TYPING_SPEED_MS = 27;
const USER_VISIBLE_MS = 480;
const THINKING_MS = 820;
const HOLD_MS = 2800;
const EXIT_MS = 310;

type Phase = "user" | "thinking" | "typing" | "hold";

export function JamesTalking() {
  const prefersReduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("user");
  const [typed, setTyped] = useState("");
  const [visible, setVisible] = useState(true);
  const exitInnerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const conv = CONVERSATIONS[idx];

  // Kick off phase sequence when conversation changes
  useEffect(() => {
    setTyped("");
    setPhase("user");
    setVisible(true);
    if (prefersReduced) return;

    const t1 = setTimeout(() => setPhase("thinking"), USER_VISIBLE_MS);
    const t2 = setTimeout(
      () => setPhase("typing"),
      USER_VISIBLE_MS + THINKING_MS
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [idx, prefersReduced]);

  // Typewriter — fires once per (phase==="typing") entry
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

  // Hold → fade out → advance
  useEffect(() => {
    if (phase !== "hold") return;
    const t = setTimeout(() => {
      setVisible(false);
      exitInnerRef.current = setTimeout(() => {
        setIdx((i) => (i + 1) % CONVERSATIONS.length);
      }, EXIT_MS);
    }, HOLD_MS);
    return () => {
      clearTimeout(t);
      if (exitInnerRef.current) clearTimeout(exitInnerRef.current);
    };
  }, [phase]);

  const pulsing =
    !prefersReduced && (phase === "thinking" || phase === "typing");
  const showJames = phase === "typing" || phase === "hold";

  return (
    <div className="glass-panel rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <JamesAvatar className="h-11 w-11" />
          {pulsing && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
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
          transform: visible ? "translateY(0)" : "translateY(-5px)",
          transition: `opacity ${EXIT_MS}ms ease, transform ${EXIT_MS}ms ease`,
        }}
      >
        {/* User bubble */}
        <div className="ml-auto max-w-[82%] rounded-2xl rounded-br-sm bg-primary/15 px-3.5 py-2 text-xs leading-relaxed text-foreground/90">
          {conv.user}
        </div>

        {/* Thinking dots */}
        {phase === "thinking" && !prefersReduced && <ThinkingDots />}

        {/* James reply */}
        {(showJames || prefersReduced) && (
          <div className="mr-auto max-w-[88%] rounded-2xl rounded-bl-sm border border-border/40 bg-card/60 px-3.5 py-2 text-xs leading-relaxed text-foreground/90">
            {prefersReduced ? conv.james : typed}
            {phase === "typing" && !prefersReduced && (
              <span className="ml-0.5 inline-block h-[10px] w-0.5 animate-pulse bg-primary/70 align-middle" />
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
                background:
                  i === idx ? "var(--primary)" : "var(--border)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <div className="mr-auto rounded-2xl rounded-bl-sm border border-border/40 bg-card/60 px-4 py-3">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
