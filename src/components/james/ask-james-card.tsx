"use client";

import { useEffect, useState } from "react";
import { JamesAvatar } from "./james-avatar";
import { cn } from "@/lib/utils";

// James's opener shifts with the room's mood, the same way his chips do in the
// floating widget — so the card feels like the same character, not a banner.
const LINE_BY_THEME: Record<string, string> = {
  light: "Afternoon. Looking for something long and cold, or something sharp?",
  dark: "Hey, James here. Looking for a slow sipper, or something stiff?",
  party: "Big night? Tell me the headcount and I'll sort the punch.",
  chill: "Quiet one tonight? I've got just the pour.",
  "date-night": "Trying to impress someone? Say the word.",
  celebrate: "Something worth toasting? Let's pick the bottle.",
  solo: "Just you tonight. What are we in the mood for?",
  budget: "Big flavour, small spend — my favourite brief.",
};

const PROMPTS = [
  "What should I drink tonight?",
  "Something with gin",
  "Set the vibe",
];

function summonJames(prompt?: string) {
  window.dispatchEvent(
    new CustomEvent("ask-james", {
      detail: prompt ? { prompt } : { open: true },
    }),
  );
}

/**
 * The "Ask James" card that opens the stitch home feed — James, a line in his
 * voice, and three ways in. Tapping it hands off to the floating James widget
 * so there is only ever one conversation.
 */
export function AskJamesCard({ className }: { className?: string }) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme ?? "dark");
    read();
    const onChange = (e: Event) =>
      setTheme((e as CustomEvent<string>).detail ?? "dark");
    window.addEventListener("themechange", onChange);
    return () => window.removeEventListener("themechange", onChange);
  }, []);

  const line = LINE_BY_THEME[theme] ?? LINE_BY_THEME.dark;

  return (
    <section
      className={cn(
        "media-card relative overflow-hidden px-4 py-4 sm:px-5",
        className,
      )}
      aria-labelledby="ask-james-heading"
    >
      {/* Warm pool of light behind James, the way a lamp sits over a bar. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--primary) 45%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex items-start gap-3.5">
        <div className="min-w-0 flex-1">
          <h2 id="ask-james-heading" className="section-title">
            Ask James
          </h2>

          {/* Speech bubble with a tail pointing at James */}
          <button
            type="button"
            onClick={() => summonJames()}
            className="relative mt-2.5 block w-full rounded-2xl rounded-tr-sm border border-primary/40 bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] px-3.5 py-2.5 text-left text-sm leading-relaxed text-foreground shadow-[0_0_18px_color-mix(in_srgb,var(--primary)_18%,transparent)] transition hover:border-primary/70"
          >
            {line}
          </button>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => summonJames(p)}
                className="chip chip-off min-h-8 !py-1 text-xs"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <JamesAvatar className="h-16 w-16 shrink-0 rounded-full ring-2 ring-primary/40 sm:h-20 sm:w-20" />
      </div>
    </section>
  );
}
