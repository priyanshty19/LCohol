"use client";

import { useEffect, useState } from "react";
import { THEMES, applyTheme, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";

const VIBES = THEMES.filter((t) => t.group === "vibe");

/**
 * "Today's Vibe" — the inline vibe switcher that opens the stitch home feed.
 * The daily modal still exists for the once-a-day nudge; this is the always-there
 * version, so changing the room's mood never costs a trip to /vibe.
 */
export function VibeRail() {
  // Read the live theme AFTER mount: the server render has no window, and the
  // pre-paint script may have set a different theme than the SSR default.
  const [active, setActive] = useState<ThemeId | null>(null);

  useEffect(() => {
    const read = () =>
      setActive((document.documentElement.dataset.theme as ThemeId) ?? null);
    read();
    const onChange = (e: Event) =>
      setActive((e as CustomEvent<ThemeId>).detail ?? null);
    window.addEventListener("themechange", onChange);
    return () => window.removeEventListener("themechange", onChange);
  }, []);

  return (
    <section className="space-y-2.5">
      <h2 className="section-title">Today&apos;s vibe</h2>
      {/* Bleeds to the viewport edge on mobile so the row reads as scrollable. */}
      <div className="rail -mx-4 px-4 sm:mx-0 sm:px-0">
        {VIBES.map((v) => {
          const on = active === v.id;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={on}
              onClick={() => applyTheme(v.id, { persist: true })}
              className={cn("chip rail-item min-h-9", on ? "chip-on" : "chip-off")}
            >
              <span aria-hidden>{v.emoji}</span>
              {v.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
