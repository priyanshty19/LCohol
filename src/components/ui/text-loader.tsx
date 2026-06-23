"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Reusable on-brand loading state: three pulsing dots + a James-voice phrase
// that cycles while the user waits. Starts on phrases[0] (deterministic, so the
// SSR fallback and client match, with no hydration/random mismatch).
export function TextLoader({
  phrases,
  className,
}: {
  phrases: string[];
  className?: string;
}) {
  const list = phrases.length ? phrases : ["One moment, boss…"];
  const [i, setI] = useState(0);

  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setI((p) => (p + 1) % list.length), 2200);
    return () => clearInterval(t);
  }, [list.length]);

  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((d) => (
          <span
            key={d}
            className="h-2 w-2 animate-bounce rounded-full bg-primary/70"
            style={{ animationDelay: `${d * 0.15}s` }}
          />
        ))}
      </div>
      <p key={i} className="text-sm text-muted-foreground">
        {list[i]}
      </p>
    </div>
  );
}
